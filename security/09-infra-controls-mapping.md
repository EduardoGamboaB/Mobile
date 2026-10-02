# 09 · Controles DSI ↔ infraestructura como código

Dónde se cumple cada control de GCP del catálogo DSI dentro de `infra/terraform`, y qué queda como excepción o
pendiente. Las fichas completas de cada control están en [`03-controls/`](./03-controls/). Usa esta tabla para las
auditorías trimestrales: el estado real se verifica con `scripts/audit-controls.sh` contra el proyecto.

Leyenda:

- ✅ **implementado en Terraform**
- 🟡 **parcial / depende de una acción**
- ❌ **excepción documentada**
- 📝 **proceso** (runbook)

## Cloud Run

| Control | Estado | Dónde |
|---|---|---|
| Run-01 sin invocación pública | ✅ ❌ | Internos: `ingress=INTERNAL_ONLY` + `run.invoker` solo para quien llama (`modules/g3/locals.tf` › `callers`). **Excepción:** `g3-gateway` tiene `allUsers`, pero `ingress=INTERNAL_LOAD_BALANCER` (solo entra por el LB con Cloud Armor). |
| Run-02 egress restringido | ✅ | `vpc_egress = PRIVATE_RANGES_ONLY` + PSC para `run.app` (`modules/network`). |
| Run-03 máximo/mínimo de instancias | ✅ | `services = {…}` por ambiente. `check postgres_connections` acota las conexiones. |
| Run-04 concurrencia | ✅ | `concurrency` por servicio (80–100). |
| Run-05 versión de lenguaje | ✅ | `node:22-alpine` (LTS) en `service.Dockerfile`. |
| Run-06 cuenta de servicio activa | ✅ | Una por servicio (`g3-run-<svc>`), sin llaves. |
| Run-07 DLQ para Pub/Sub | 🟡 | Existe el tópico `g3-domain-events-dlq`. Aplicarlo al crear suscripciones push. |
| Run-08 actualizaciones automáticas de imagen base | ❌ | No aplica con Dockerfile propio. Mitigación: rebuild por cada deploy y semanal, y escaneo de Artifact Analysis. |
| Run-09 Binary Authorization | 🟡 | Variable `binary_authorization`. Faltan la política y los attestors. |
| Run-10 HTTP/2 extremo a extremo | ❌ | Node/Express sirve HTTP/1.1. El cliente ↔ LB sí usa HTTP/2. |
| Run-11 etiquetas | ✅ | `local.labels` (`app`, `env`, `area`, `ecosistema`, `managed-by`, `service`). |

## Cloud SQL

| Control | Estado | Dónde |
|---|---|---|
| SQL-01 CMEK | 🟡 | Solo si una regulación lo exige (decisión de negocio). |
| SQL-02 CIS | 📝 | Flags de log y pgaudit. Revisión CIS en la auditoría trimestral. |
| SQL-03 versión aprobada | ✅ | `POSTGRES_16`. Requiere VoBo de Arquitectura 👤. |
| SQL-04 IAM mínimo | ✅ | `cloudsql.client` solo para servicios con base. Los roles de base `g3_<svc>` solo pueden usar su schema (`backend/infra/db/init-schemas.sql`). |
| SQL-05 restringir quién se conecta | ✅ | Sin IP pública; solo desde la VPC (PSA). Deny-all de ingreso. |
| SQL-06 plan de actualización | 📝 | RUNBOOK › Escalado y la ventana de mantenimiento. |
| SQL-07 cambios de flags notificados | 📝 | Los flags viven en Terraform: todo cambio pasa por PR + `terraform plan`. |
| SQL-08 usuario y contraseña | ✅ | `password_validation_policy` y contraseñas aleatorias de 40 caracteres en Secret Manager. Los roles de servicio no son `cloudsqlsuperuser`. |
| SQL-09 HA | ✅ | `availability_type = REGIONAL` en producción. |
| SQL-10 sin acceso público | ✅ | `ipv4_enabled = false`, `ssl_mode = ENCRYPTED_ONLY`. |
| SQL-11 backups diarios cifrados | ✅ | Backup diario, 30 retenidos y PITR de 7 días (cifrado por defecto de Google). |
| SQL-12 logs (audit, error, slow) | ✅ | `log_min_duration_statement`, conexiones, locks, pgaudit (`ddl,role`). |

## Cloud Storage

| Control | Estado | Dónde |
|---|---|---|
| Storage-01 sin acceso público | ✅ ❌ | `public_access_prevention = enforced`. **Excepción opcional:** `admin_bucket_public` si Cloud CDN no puede leer el bucket privado. |
| Storage-02 versionado | ✅ | Evidencias y panel. |
| Storage-03 etiquetas (área, ecosistema) | ✅ | `area`, `ecosistema`. |
| Storage-04 cifrado | ✅ | Cifrado de Google; CMEK opcional (`kms_key_name`). |
| Storage-05 logs de acceso | ✅ | Bucket `*-g3-access-logs`. |
| Storage-06 audit logs | 🟡 | Data Access logs de GCS: habilitarlos a nivel organización o proyecto 👤. |
| Storage-07 sitio estático detrás de CDN y LB | ✅ | `modules/edge`. |
| Storage-08 sin allUsers | ✅ | Lectura solo por la cuenta de llenado de Cloud CDN. |
| Storage-09 CORS al dominio | ✅ | Evidencias: solo `https://admin.<dominio>`. |

## Secret Manager

| Control | Estado | Dónde |
|---|---|---|
| SM-01 audit logs | 🟡 | Data Access logs de Secret Manager 👤. |
| SM-02 notificaciones Pub/Sub | ✅ | `topics = g3-secret-events` + suscripción de auditoría. |
| SM-03 IAM mínimo | ✅ | `secretAccessor` por (servicio, secreto). |
| SM-04 rotación | ✅ 📝 | Recordatorio cada 90 días. Procedimiento en RUNBOOK › Rotación. |
| SM-05 CMEK | 🟡 | Opcional. |
| SM-06 Cloud Asset Inventory | 📝 | Auditoría trimestral. |

## Red, Load Balancing, CDN y Cloud Armor

| Control | Estado | Dónde |
|---|---|---|
| WAF con regla default en LB HTTPS | ✅ | `google_compute_security_policy.api` (OWASP CRS 3.3 + default). |
| Logs y métricas basadas en logs | ✅ | `log_config` del backend, `g3/armor_denied` y alerta. |
| CDN solo HTTPS | ✅ | Redirección 80 → 443. |
| Geo restricción | 🟡 | `api_allowed_regions` / `admin_allowed_regions`. Se recomienda `["MX","US"]` en el panel. |
| TLS ≥ 1.2 | ✅ | `google_compute_ssl_policy` MODERN, TLS 1.2. |
| Flow logs | ✅ | Subred de Cloud Run. |
| Reglas de firewall | ✅ | Deny-all de ingreso con logs. |

## IAM

| Control | Estado | Dónde |
|---|---|---|
| IAM-06/07/13 sin llaves de cuentas de servicio | ✅ | Ninguna llave. CI usa Workload Identity Federation (`infra/terraform/bootstrap`). |
| IAM-09 permisos por roles | ✅ | Roles predefinidos y un rol custom mínimo (`g3AdminPublisher`). |
| IAM-12 una cuenta por proceso | ✅ | Una por servicio, más `g3-scheduler`, `g3-db-bootstrap`, `g3-deployer`, `g3-tf-plan` y `g3-tf-apply`. |
| IAM-14 sin roles de servicio a nivel proyecto | 🟡 | `g3-deployer` tiene `run.developer` a nivel proyecto (necesario para desplegar). `g3-tf-apply` es Owner al inicio: restringir cuando se estabilice. |
| IAM-01..05, 08, 10, 11, 15–17 | 📝 👤 | Contactos, MFA, llaves de seguridad y grupos de administradores en Cloud Identity: acciones de la organización. |

## Pub/Sub

| Control | Estado | Dónde |
|---|---|---|
| PubSub-01 CMEK | 🟡 | Opcional. |
| PubSub-02 IAM por recurso | ✅ | `pubsub.publisher` de auth solo sobre `g3-domain-events`. |
| PubSub-03 etiquetas | ✅ | |
| PubSub-05 monitoreo | 🟡 | Agregar alertas de backlog al crear suscripciones. |
