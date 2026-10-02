# Checklist de salida a producción

Estado honesto al 2026-10-02:

- ✅ **hecho en el repo:** existe y fue validado aquí.
- 🟡 **hecho, sin validar en GCP real:** existe, pero nadie lo ha aplicado contra un proyecto.
- ⛔ **pendiente en código:** falta trabajo de desarrollo.
- 👤 **acción humana:** cuentas, dominios, contratos, decisiones.

Nada de esto se ha aplicado todavía contra un proyecto GCP real. El primer `terraform apply` en staging es el
siguiente paso y puede destapar detalles de cuotas, APIs o permisos de la organización.

## 1. Infraestructura (Terraform)

| Ítem | Estado | Notas |
|---|---|---|
| Módulos y ambientes `staging`/`production`, backend GCS | ✅ | `terraform fmt`, `validate` (3 raíces) y `terraform test` con providers simulados pasan (TF 1.9.8, google 6.50.0). |
| `terraform plan`/`apply` real | 🟡 👤 | Requiere los proyectos y el bootstrap (DEPLOY.md §1–2). |
| VPC, PSA, PSC para `run.app`, Direct VPC egress `PRIVATE_RANGES_ONLY` | 🟡 | Verificar en staging que las llamadas internas llegan como internas (ingress internal). Si no, el plan B es `vpc_egress = "ALL_TRAFFIC"`, que crea Cloud NAT. |
| Cloud SQL PG16 HA, backups, PITR, flags, pgaudit, sin IP pública | 🟡 | |
| TLS a Postgres con `sslmode=no-verify` | 🟡 ⛔ | Cifrado sí, validación del certificado no (el cert de Cloud SQL no trae la IP privada). Riesgo residual: un MITM dentro de la VPC. Mejora: Cloud SQL Auth Proxy como sidecar o CA administrada + DNS y `verify-full`. |
| Memorystore 7.2 AUTH + TLS (STANDARD_HA en prod) | 🟡 | La CA se monta en `/secrets/redis-ca/ca.pem` y se activa con `NODE_EXTRA_CA_CERTS`. Verificar que ioredis valida el certificado al conectar por IP. Si falla, platform-kit debe aceptar `REDIS_TLS_CA`/`servername`. Pub/sub de invalidación (`g3:<env>:integrations:invalidate`): todos los servicios con Redis tienen egress a la VPC. |
| Secret Manager: contenedores, accesos por secreto y recordatorio de rotación | ✅ 🟡 | Los valores se cargan a mano (DEPLOY.md §4). 👤 |
| Cuenta de servicio por servicio, `run.invoker` por par, sin llaves | ✅ | Probado en `terraform test`. |
| Cloud Armor (OWASP CRS 3.3, rate limit, rutas internas, DDoS adaptativo) | 🟡 | Empezar staging con `waf_preview = true` una semana para medir falsos positivos (la ingesta de GPS está excluida del WAF). |
| Panel en bucket **privado** servido por Cloud CDN | 🟡 | Depende de la cuenta `cloud-cdn-fill`. Si el LB devuelve 403, usar `admin_bucket_public = true` como excepción documentada. |
| Monitoreo, uptime checks y alertas | 🟡 👤 | Agregar PagerDuty u Opsgenie para guardias 24/7. |
| Budget | 🟡 👤 | Requiere `billing_account` y que quien aplica tenga `billing.budgets.create`. |
| Binary Authorization (control DSI Run-09) | ⛔ | Variable `binary_authorization` lista, pero faltan la política y los attestors (firmar en Cloud Build). |
| Actualizaciones automáticas de imagen base (Run-08) | — | No aplica con Dockerfile propio. Mitigación: rebuild semanal y escaneo de Artifact Analysis (API habilitada). |
| HTTP/2 extremo a extremo (Run-10) | — | Node/Express sirve HTTP/1.1. El LB habla HTTP/2 con el cliente. Se documenta como excepción. |
| CMEK (Cloud SQL, Secret Manager, buckets) | 👤 | Solo si una regulación lo exige (control SQL-01). Los buckets aceptan `kms_key_name`. |
| Lockfiles de providers | 🟡 | Los `.terraform.lock.hcl` tienen hashes solo de `linux_amd64`. En Mac: `terraform providers lock -platform=darwin_arm64 -platform=linux_amd64`. |

## 2. Imágenes, CI y despliegue

| Ítem | Estado | Notas |
|---|---|---|
| Dockerfile: `npm ci`, solo deps de prod, no-root, tini, HEALTHCHECK, `migrations/` opcional | ✅ | `docker build` local de gateway, auth, drivers, fleet, trips y db-bootstrap. `apk add tini` no se pudo probar porque el proxy de este entorno bloquea Alpine; se probó equivalente con `--init`. SIGTERM detiene el contenedor al instante. |
| Migraciones y mantenimiento desde la imagen | ✅ | `migrate.js` de fleet y trips contra Postgres 16 con los roles de `init-schemas.sql`: aplica, es idempotente y aísla schemas. `maintenance.js` OK. `/ready` de fleet con DB OK. |
| docker-compose con Postgres 16, Redis 7 y healthchecks | ✅ | `docker compose config` OK. No se levantó el stack completo. |
| GitHub Actions backend/admin/mobile/terraform | 🟡 | YAML válido. No se ha corrido en GitHub. El plan necesita variables WIF. 👤 |
| Cloud Build (principal): migraciones antes del deploy, smoke y rollback | 🟡 | Requiere conectar GitHub a Cloud Build 2nd gen y `cloudbuild_repository`. 👤 |
| Promoción del mismo digest staging → prod | ⛔ | Hoy cada ambiente construye del mismo commit. Mejora: promover por digest entre registries. |

## 3. Código de la aplicación (dependencias para operar en GCP)

| Ítem | Estado | Notas |
|---|---|---|
| `/health` y `/ready` en los 9 servicios, fuera de `/api` | ✅ | Probado: auth como rol runtime responde `/ready` con `db` y `redis` OK. |
| Migraciones de los 8 servicios con schema (`node dist/migrate.js`) | ✅ | Probado en Postgres 16 con el rol dueño `g3_<svc>_migrator`. |
| Separación dueño/runtime y `auth.audit_log` append-only | ✅ | Probado: runtime sin DDL ni GRANT; `g3_auth` sin UPDATE/DELETE en `audit_log` incluso tras re-ejecutar el bootstrap. |
| Webhook de Stripe (`/api/webhooks/stripe`) | ⛔ | Billing aún no tiene handler (Stripe real pendiente). Cloud Armor lo **cierra** (`deny(404)`, regla 1210) hasta que exista; abrir con `stripe_webhook_enabled = true` solo cuando verifique la firma `Stripe-Signature`. |
| `apply-tier` / `start-trial` de billing | ✅ | Exigen `x-internal-token`; el gateway las bloquea y Cloud Armor también (regla 1200). |
| Particiones de telemetría en runtime | ✅ | Las funciones de creación son `SECURITY DEFINER` (migración `fleet/0002`): el runtime crea la partición de un mes nuevo al vuelo sin ser dueño; borrar (retención) solo lo puede el dueño vía `g3-fleet-maintenance`. Probado con roles separados. |
| **invoicing** sin servidor HTTP | ⛔ | Solo tiene job `migrate-invoicing`. No se despliega como Cloud Run service. Falta definir su host HTTP, o que billing lo use como librería. Su cuenta ya tiene `run.invoker` sobre integrations. |
| Roles sin `CREATE ON DATABASE` | ✅ | `runMigrations` consulta `pg_namespace` antes del `CREATE SCHEMA`; ni runtime ni migrator tienen el privilegio (el migrator crea tablas como dueño de su schema). |
| Keyring para `MFA_ENCRYPTION_KEY` / `INTEGRATIONS_ENCRYPTION_KEY` | ⛔ | Sin él, rotar exige re-capturar o re-enrolar (RUNBOOK › Re-encriptación). |
| Rotación de `INTERNAL_TOKEN` sin corte | ⛔ | Aceptar token actual + anterior durante la rotación. |
| ai → Vertex AI real | ⛔ | Hoy usa el proveedor stub. La cuenta `g3-run-ai` ya tiene `aiplatform.user`. |
| Pub/Sub: suscriptores de `g3-domain-events` | ⛔ | El tópico y la DLQ existen. Solo auth publica. Al crear suscripciones push, configurar la DLQ (control Run-07). |

## 4. Acciones humanas

| Ítem | Estado |
|---|---|
| Proyectos GCP `g3-staging` y `g3-prod`, facturación y Owner para el bootstrap | 👤 |
| Dominio y DNS (`api.*` y `admin.*`, más staging) | 👤 |
| Cargar los 8 secretos de la app y custodiar las llaves de cifrado (bóveda, custodia dual) | 👤 |
| Conectar GitHub ↔ Cloud Build 2nd gen; variables WIF en GitHub; ambientes protegidos con revisores | 👤 |
| Correos de on-call y herramienta de guardias | 👤 |
| **Pentest externo** antes de la beta (`security/08-pentest-scope.md`) | 👤 |
| WhatsApp Cloud API: cuenta de Meta Business verificada, número y **plantilla `g3_incidente` aprobada** (es_MX) | 👤 |
| Proveedores: SMS, correo, Stripe (cuenta verificada; webhook pendiente del handler en billing), PAC (contrato y certificados CSD), Expo push | 👤 |
| **G3 Drive:** `eas init` (projectId), credenciales de Apple y Google Play, `eas build --profile production`, fichas de tienda (mobile/BUILD.md) | 👤 |
| Registrar la compañía de G3 Tech y fijar `platform_company_id` | 👤 |
| Aviso de privacidad, términos y retención (5 años de evidencias, 13 meses de GPS) validados por legal | 👤 |
| Ejecutar la primera prueba de restauración (RUNBOOK) y registrar RPO/RTO | 👤 |
| Auditoría de controles DSI (`security/scripts/audit-controls.sh`) sobre el proyecto real | 👤 |

## 5. Go / No-Go

Antes de abrir producción a clientes, todo esto debe estar en ✅:

- [ ] Staging completo desplegado con el pipeline, y smoke manual (DEPLOY.md §11) OK durante 7 días.
- [ ] Sin ⛔ en la sección 3 que afecte a auth, gateway, fleet, trips o alerts.
- [ ] Prueba de restauración hecha.
- [ ] Pentest sin hallazgos críticos ni altos abiertos.
- [ ] Alertas llegando a una persona real, con guardia definida.
- [ ] Secretos cargados y llaves custodiadas.
- [ ] Plantilla de WhatsApp aprobada, o push como canal único aceptado por negocio.
