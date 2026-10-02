# Primer despliegue de G3 en GCP

Paso a paso para levantar un ambiente (`staging` o `production`) desde cero. Haz primero staging completo y luego
repite en producción. Tiempo estimado: medio día (la mayor parte es esperar a Cloud SQL y al certificado).

## Arquitectura

```
Internet ─► ALB global (IP fija, cert. administrado, TLS 1.2+) + Cloud Armor
              ├─ api.<dominio>   ─► g3-gateway (Cloud Run, ingress internal+LB)
              │                       └─(VPC, PSC run.app, ID token + x-internal-token)─► g3-auth, g3-billing, g3-drivers,
              │                          g3-fleet, g3-trips, g3-alerts, g3-ai, g3-integrations (ingress internal)
              └─ admin.<dominio> ─► bucket privado del panel + Cloud CDN
Cloud Run ─(Direct VPC egress)─► Cloud SQL Postgres 16 (IP privada, TLS) · Memorystore Redis 7 (AUTH + TLS)
Cloud Scheduler ─► alerts /api/incidents/escalations/run (cada minuto) · job g3-fleet-maintenance (diario)
Jobs: g3-db-bootstrap (roles/permisos) · migrate-<svc> (migraciones) · g3-fleet-maintenance (particiones)
```

Un proyecto GCP por ambiente (`g3-staging`, `g3-prod`). Todo lo crea Terraform en `infra/terraform`:

| Ruta | Qué es |
|---|---|
| `bootstrap/` | Bucket del state y Workload Identity Federation para GitHub. Una vez por proyecto. |
| `envs/staging`, `envs/production` | Raíz de cada ambiente: tamaños, dominios, backend GCS. |
| `modules/g3` | Composición: APIs, IAM, secretos, buckets, Pub/Sub, Cloud Run, jobs, scheduler, budget. |
| `modules/{network,database,redis,edge,monitoring,cloud-run-service,cloud-run-job}` | Piezas reutilizables. |

**Quién hace qué.** Terraform es dueño de la **configuración**: cuentas de servicio, red, secretos, escalado y probes.
El pipeline (`backend/infra/ci/cloudbuild.yaml`) solo cambia **imágenes**. Por eso Terraform ignora la imagen de los
servicios y jobs después de crearlos.

## 0. Requisitos (acciones humanas)

- [ ] Dos proyectos GCP con facturación (`g3-staging`, `g3-prod`) y permisos de Owner para quien hace el bootstrap.
- [ ] Dominio propio con acceso a su DNS (p. ej. `g3logistics.mx`).
- [ ] `gcloud` ≥ 480, `terraform` ≥ 1.6, `docker`, `psql` (opcional) y `openssl`.
- [ ] Correo de on-call para las alertas.
- [ ] (Opcional) Cuenta de facturación para el budget: `gcloud billing accounts list`.

```bash
gcloud auth login && gcloud auth application-default login
export ENV=staging PROJECT=g3-staging REGION=us-central1
gcloud config set project $PROJECT
```

## 1. Bootstrap del state (una vez por proyecto)

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var project_id=$PROJECT -var github_repository=OWNER/REPO -var github_environment=$ENV
terraform output
```

Guarda en GitHub (Settings › Secrets and variables › **Variables**; no son secretos):

| Variable | Valor |
|---|---|
| `GCP_WIF_PROVIDER_STAGING` / `_PRODUCTION` | `wif_provider` |
| `GCP_TF_PLAN_SA_STAGING` / `_PRODUCTION` | `tf_plan_service_account` |
| `GCP_TF_STATE_BUCKET_STAGING` / `_PRODUCTION` | `state_bucket` |

Crea el ambiente protegido `staging`/`production` en GitHub (Settings › Environments) con revisores obligatorios.

> El state contiene las contraseñas generadas de la base y Redis. El bucket es privado y versionado, y solo lo leen
> Owners y las cuentas `g3-tf-plan`/`g3-tf-apply`.

## 2. Terraform fase 1: plataforma

En la fase 1 se crean red, Cloud SQL, Redis, secretos vacíos, Artifact Registry, IAM, buckets, LB, Cloud Armor,
monitoreo y budget. No se crean servicios porque todavía no hay imágenes ni valores de secretos.

```bash
cd infra/terraform/envs/$ENV
cp terraform.tfvars.example terraform.tfvars   # edita project_id, dominios, correos, billing_account
# terraform.tfvars NO lleva secretos: versiónalo para que el plan de CI funcione.
terraform init -backend-config="bucket=${PROJECT}-tfstate"
terraform plan -out plan.tfplan        # deploy_workloads = false
terraform apply plan.tfplan
```

Cloud SQL tarda unos 15 min. Si el apply falla por una API recién habilitada, espera 1–2 min y vuelve a correrlo.

## 3. DNS y certificado

```bash
terraform output lb_ip
```

- Crea los registros `A` de `api.<dominio>` y `admin.<dominio>` → `lb_ip`. Si el dominio vive en Cloud DNS de este
  proyecto, pon `dns_managed_zone` y Terraform los crea.
- El certificado administrado pasa a `ACTIVE` entre 15 y 60 min después de que el DNS resuelva:

```bash
gcloud compute ssl-certificates list --format='table(name,managed.status,managed.domainStatus)'
```

## 4. Cargar los secretos de la aplicación

Terraform crea los contenedores sin valor. Los valores se generan y se cargan **solo en Secret Manager**: nunca en el
repo, en tfvars ni en un chat. Lista y comando sugerido para cada uno:

```bash
terraform output app_secrets_to_load
```

```bash
put() { printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- --project=$PROJECT; }
put g3-jwt-access                  "$(openssl rand -hex 32)"
put g3-jwt-refresh                 "$(openssl rand -hex 32)"
put g3-mfa-token-secret            "$(openssl rand -hex 32)"
put g3-mfa-recovery-pepper         "$(openssl rand -hex 32)"
put g3-mfa-encryption-key          "$(openssl rand -base64 32)"   # 32 bytes en base64 (AES-256-GCM)
put g3-integrations-encryption-key "$(openssl rand -base64 32)"   # 32 bytes en base64
put g3-internal-token              "$(openssl rand -hex 32)"
put g3-audit-ingest-token          "$(openssl rand -hex 32)"
unset -f put
```

Los secretos de base y Redis (`g3-db-*`, `g3-redis-*`) los genera Terraform; no los toques.

**Respaldo:** guarda una copia de `g3-mfa-encryption-key` y `g3-integrations-encryption-key` en la bóveda de la
empresa (custodia dual). Si se pierden, los secretos TOTP y los de proveedores quedan ilegibles.

## 5. Primeras imágenes

Desde la raíz del repo:

```bash
TAG=$(git rev-parse --short HEAD)
gcloud builds submit --config backend/infra/ci/cloudbuild.yaml . \
  --service-account=projects/$PROJECT/serviceAccounts/g3-deployer@$PROJECT.iam.gserviceaccount.com \
  --substitutions=_ENV=$ENV,_API_DOMAIN=api.<dominio>,SHORT_SHA=$TAG,_ONLY_IMAGES=true
```

Con `_ONLY_IMAGES=true` el pipeline corre la puerta de seguridad, construye y sube las imágenes, y se salta los
pasos que necesitan los jobs y servicios. Esos todavía no existen.

## 6. Terraform fase 2: cargas de trabajo

```bash
cd infra/terraform/envs/$ENV
# terraform.tfvars: deploy_workloads = true, image_tag = "<TAG del paso 5>"
terraform apply
```

Esta fase crea los 9 servicios Cloud Run, los jobs `migrate-<svc>`, `g3-db-bootstrap` y `g3-fleet-maintenance`, y los
Cloud Scheduler de escalamiento y mantenimiento.

Los servicios arrancan con startup probe a `/ready`, que necesita DB y Redis. Fallarán hasta el paso 7 porque los
roles todavía no existen. Es normal: Cloud Run conserva la revisión sin tráfico y Terraform marca error en esos
servicios. Continúa con el paso 7 y vuelve a correr `terraform apply`.

## 7. Base: roles, schemas y migraciones

```bash
gcloud run jobs execute g3-db-bootstrap --region=$REGION --wait
for s in auth billing drivers fleet trips alerts integrations invoicing; do
  gcloud run jobs execute migrate-$s --region=$REGION --wait || break
done
gcloud run jobs execute g3-db-bootstrap --region=$REGION --wait   # re-asegura auth.audit_log append-only
gcloud run jobs execute g3-fleet-maintenance --region=$REGION --wait   # particiones de telemetría
```

`g3-db-bootstrap` aplica `backend/infra/db/init-schemas.sql`. Es idempotente. Por servicio crea dos roles con las
contraseñas de Secret Manager:

- `g3_<svc>_migrator`: dueño del schema. Lo usan los jobs `migrate-<svc>` y `g3-fleet-maintenance`.
- `g3_<svc>`: runtime de Cloud Run, solo DML sobre su schema.

Ningún rol ve el schema de otro servicio.

## 8. Despliegue completo con el pipeline

```bash
terraform apply    # los servicios que fallaron en el paso 6 ya pasan /ready
gcloud builds submit --config backend/infra/ci/cloudbuild.yaml . \
  --service-account=projects/$PROJECT/serviceAccounts/g3-deployer@$PROJECT.iam.gserviceaccount.com \
  --substitutions=_ENV=$ENV,_API_DOMAIN=api.<dominio>,SHORT_SHA=$(git rev-parse --short HEAD)
```

Desde aquí, el trigger de Cloud Build despliega solo. Para activarlo:

1. Conecta GitHub a Cloud Build 2nd gen (consola › Cloud Build › Repositories). Es una acción humana.
2. Pon `cloudbuild_repository` en tfvars y corre `terraform apply`.

El trigger despliega staging en cada push a `main` y producción en cada tag `vX.Y.Z`, con aprobación manual.

## 9. Panel (admin)

```bash
terraform -chdir=infra/terraform/envs/$ENV output -json admin_deploy
cd admin
PROJECT_ID=$PROJECT BUCKET=<BUCKET> API_BASE_URL=https://api.<dominio> \
BACKEND_BUCKET=<BACKEND_BUCKET> CDN_URL_MAP=<CDN_URL_MAP> ./deploy/deploy.sh
```

## 10. Configuración de la aplicación

1. Registra la compañía de G3 Tech (`POST https://api.<dominio>/api/auth/register-company`).
2. Pon su id en `platform_company_id` (tfvars) y corre `terraform apply`.
3. En Admin › Integraciones, configura los proveedores (SMS, correo, WhatsApp, Stripe, PAC, Vertex). Para
   `G3_PLATFORM_COMPANY_ID` sigue `backend/docs/INTEGRATIONS.md`.

## 11. Verificación

```bash
curl -fsS https://api.<dominio>/health && curl -fsS https://api.<dominio>/ready
curl -sI https://admin.<dominio> | grep -i -E 'strict-transport|content-security'
# Internos NO accesibles desde Internet (debe dar 403/404):
curl -s -o /dev/null -w '%{http_code}\n' "$(terraform output -json service_urls | jq -r .auth)/health"
# Rutas internas bloqueadas en el borde (404):
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.<dominio>/api/incidents/escalations/run
# Rate limit de Cloud Armor (debe aparecer 429 antes de 100 intentos):
for i in $(seq 1 100); do curl -s -o /dev/null -w '%{http_code} ' -X POST https://api.<dominio>/api/auth/login; done
gcloud scheduler jobs describe g3-incident-escalations --location=$REGION --format='value(state,lastAttemptTime)'
```

- [ ] Uptime checks en verde (Monitoring › Uptime).
- [ ] Una ejecución correcta de `g3-incident-escalations` en Cloud Scheduler.
- [ ] Ninguna alerta abierta.
- [ ] Login en Admin, alta de un vehículo y un viaje, y un incidente SOS que escale.
- [ ] Revisa `docs/ops/PRODUCTION-READINESS.md` antes de abrir producción a clientes.
