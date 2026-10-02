# Runbook de operación de G3

Este runbook es para quien está de guardia. Cada alerta de Cloud Monitoring enlaza a una sección de este documento.
Los SLO y los umbrales están en [SLO.md](./SLO.md) y el primer despliegue en [DEPLOY.md](./DEPLOY.md). Para incidentes
de seguridad usa también [security/07-incident-response.md](../../security/07-incident-response.md).

Variables de los comandos:

```bash
export PROJECT=g3-prod REGION=us-central1
gcloud config set project $PROJECT
```

## Operación diaria

| Cuándo | Qué revisar |
|---|---|
| Diario (5 min) | Monitoring › Alerting sin incidentes abiertos. Cloud Scheduler: `g3-incident-escalations` con último intento OK y `g3-fleet-maintenance` ejecutado. Error Reporting: errores nuevos. |
| Semanal | Uso de Cloud SQL (CPU, conexiones, disco) y de Redis contra los umbrales. Bloqueos de Cloud Armor (`g3/armor_denied`) y falsos positivos. Vulnerabilidades de Artifact Registry (Artifact Analysis). Budget. |
| Mensual | Dependabot / `npm audit`. Revisión de IAM: no hay llaves de cuentas de servicio ni roles primitivos nuevos (`security/scripts/audit-controls.sh`). |
| Trimestral | Prueba de restauración (abajo). Rotación de `INTERNAL_TOKEN`/`AUDIT_INGEST_TOKEN`. Ensayo de rollback. Auditoría de controles DSI. |

Logs útiles (Cloud Logging):

```
resource.type="cloud_run_revision" AND resource.labels.service_name="g3-auth" AND severity>=WARNING
resource.type="cloud_run_job" AND resource.labels.job_name=~"migrate-.*"
resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY"
resource.type="cloudsql_database" AND textPayload:"duration:"         -- consultas lentas (> 500 ms)
```

## Escalamiento de incidentes

### Severidades

| Severidad | Ejemplos | Respuesta | Quién |
|---|---|---|---|
| SEV1 | API caída, pérdida de datos, fuga de secretos, escalamiento de SOS detenido | 15 min, 24/7 | On-call + líder técnico; si hay datos personales, también seguridad (security/07) |
| SEV2 | 5xx > 2% sostenido, un servicio degradado, migración fallida en producción | 1 h, horario extendido | On-call |
| SEV3 | Latencia alta, alertas de capacidad, falsos positivos del WAF | Siguiente día hábil | Equipo |

### Proceso

1. Reconoce la alerta.
2. Abre un canal o hilo del incidente y anota la hora de inicio.
3. Mitiga primero (rollback, escalar, desactivar una regla) y diagnostica después.
4. Comunica cada 30 min en SEV1 y cada hora en SEV2.
5. Cierra y escribe el postmortem en `security/postmortems/` con la plantilla. Es obligatorio en SEV1 y SEV2.

### api-caida

1. Revisa la consola de Cloud Run: ¿hay revisión nueva? Si coincide con un deploy, haz [rollback](#rollback).
2. Si el gateway responde `/health` pero no `/ready`, el problema es la base o Redis. Ve a [Cloud SQL](#cloud-sql) o
   [Redis](#redis).
3. Si el LB responde 502, revisa la revisión del gateway. Si responde 403, revisa [Cloud Armor](#cloud-armor). Un
   error de certificado aparece en `gcloud compute ssl-certificates list`.

### escalamiento-de-incidentes

Cloud Scheduler llama cada minuto `POST /api/incidents/escalations/run` en `g3-alerts` con OIDC de `g3-scheduler` y el
header `x-internal-token`.

- **401 Unauthorized:** el token no coincide. Ocurre después de rotar `g3-internal-token` sin correr `terraform apply`
  (el header del scheduler se lee al aplicar). Corre `terraform apply`.
- **403:** falta `run.invoker` de `g3-scheduler` sobre `g3-alerts`. Corre `terraform apply`.
- **Mientras se arregla:** ejecútalo a mano.

```bash
gcloud scheduler jobs run g3-incident-escalations --location=$REGION
```

### errores-5xx

1. Busca por servicio con `severity>=ERROR` en Cloud Logging. El campo `service` viene del logger JSON.
2. Si empezó con un deploy, haz [rollback](#rollback).
3. Si son errores de base (timeouts, `too many connections`), ve a [Cloud SQL](#cloud-sql).
4. Si son errores hacia otro servicio (401/403 internos), revisa `SERVICE_AUTH=gcp`, `INTERNAL_TOKEN` y los bindings
   `run.invoker` (Terraform).

### latencia

- Revisa Cloud SQL Query Insights: consultas lentas y planes.
- Revisa los arranques en frío y considera subir `min_instances` del servicio.
- Revisa la saturación con [Escalado](#escalado).

## Rollback

**Rollback de código.** Es inmediato: Cloud Run conserva las revisiones.

```bash
gcloud run revisions list --service=g3-<svc> --region=$REGION --limit=5
gcloud run services update-traffic g3-<svc> --region=$REGION --to-revisions=<revision-anterior>=100
```

- El pipeline lo hace solo si el smoke test falla. Las revisiones anteriores quedan en el log del build
  (`previous-revisions.txt`).
- El siguiente deploy vuelve a `--to-latest`.
- Terraform ignora `traffic`, así que un `apply` no deshace el rollback.

**Rollback de migraciones.** No se revierten automáticamente. Por eso las migraciones son expand/contract (ver
abajo). La revisión anterior debe funcionar con el schema nuevo. Si una migración dañó datos, usa [PITR](#pitr).

## Migraciones

- Viven en `backend/services/<svc>/migrations/NNNN_descripcion.sql`. Son inmutables: el runner falla si cambia el
  checksum de una ya aplicada.
- El pipeline las corre con `migrate-<svc>` **antes** de desplegar. Si una falla, no se despliega ningún servicio y
  se dispara la alerta *Falló una migración*.
- Cada migración corre en una transacción, con advisory lock y con el rol **dueño** `g3_<svc>_migrator` (cuenta
  `g3-mig-<svc>`, secreto `g3-db-migrator-url-<svc>`).
- El runtime `g3_<svc>` (Cloud Run) solo tiene SELECT/INSERT/UPDATE/DELETE: no puede crear, alterar ni borrar objetos
  ni otorgarse permisos. Las tablas nuevas le llegan por *default privileges* del migrator.

**Expand/contract.** Así se cambia un schema sin downtime:

1. **Expand:** agrega columnas o tablas nuevas, nullable o con default, e índices `CONCURRENTLY`. Ojo: un índice
   `CONCURRENTLY` no puede ir en una migración transaccional; créalo en una migración propia o en horario de baja
   carga con un índice normal si la tabla es chica. Despliega código que escribe en el campo viejo y en el nuevo.
2. **Backfill:** llena los datos en lotes, con un job o una migración idempotente.
3. **Switch:** despliega código que lee solo lo nuevo.
4. **Contract:** borra lo viejo en una release **posterior**, cuando ninguna revisión viva lo use.

**Migración fallida en producción:**

1. Lee el log: `gcloud run jobs executions list --job=migrate-<svc> --region=$REGION` y luego Cloud Logging.
2. La transacción ya hizo rollback. Corrige con una migración **nueva**; nunca edites la que falló si alguna vez se
   aplicó en otro ambiente.
3. Vuelve a correr el pipeline.

**`auth.audit_log` (append-only).** El dueño es `g3_auth_migrator`, así que las migraciones de auth pueden
alterarla con normalidad. La migración de auth y `init-schemas.sql` dejan al runtime `g3_auth` solo con SELECT e
INSERT; además hay un trigger que rechaza UPDATE y DELETE. El pipeline re-ejecuta `g3-db-bootstrap` después de migrar,
y ese paso vuelve a aplicar el REVOKE.

Comprobación:

```sql
SELECT has_table_privilege('g3_auth','auth.audit_log','UPDATE'),
       has_table_privilege('g3_auth','auth.audit_log','DELETE');  -- ambos false
```

## Escalado

- **Cloud Run:** `services = { <svc> = { min_instances, max_instances, concurrency, cpu, memory } }` en
  `envs/<env>/main.tf` y luego `terraform apply`. Alerta *cerca del máximo de instancias*: sube `max_instances`.
- **Conexiones a Postgres:** Σ(`max_instances` × `DB_POOL_MAX`) + 20 ≤ `sql_max_connections`. Terraform lo valida
  (`check postgres_connections`) y lo muestra en el output `db_connections_budget`. Si hace falta más, sube el tier y
  `max_connections`, o baja `db_pool_max`.
- **Cloud SQL:** cambiar `sql_tier` reinicia la instancia (HA hace failover, unos 60 s de cortes). Hazlo en la ventana
  de mantenimiento (domingo 03:00 CDMX).
- **Redis:** `redis_memory_gb`. STANDARD_HA escala con failover breve.

### cloud-sql

| Síntoma | Acción |
|---|---|
| CPU > 80% | Query Insights: busca la consulta más cara y agrega un índice (migración). Si es carga legítima, sube el tier. |
| Conexiones altas | Busca qué servicio tiene más instancias. Revisa fugas de conexiones y `idle_in_transaction` (la base corta a 5 min). |
| Disco > 85% | Crece solo (autoresize). Revisa la retención de telemetría y que corra `g3-fleet-maintenance`. |
| `database/up = 0` | Revisa el estado de la instancia y el failover (HA en producción). Si está en mantenimiento, espera. |

### redis

Redis guarda solo estado efímero con TTL. Si la memoria pasa de 80%:

1. Busca llaves sin TTL: `redis-cli --scan --pattern 'g3:*' | head` desde una VM en la VPC, más `TTL` por muestra.
2. Revisa la ventana de rate limiting.
3. Si es crecimiento real, sube `redis_memory_gb`.

Perder Redis solo invalida OTP, retos MFA y rate limits en curso: los usuarios repiten el paso.

### cloud-armor

1. Revisa qué regla bloquea: el label `rule_priority` de `g3/armor_denied` o `jsonPayload.enforcedSecurityPolicy`.
   Los rangos son: 1000 auth, 1100 ingesta, 1200 rutas internas, 1500 geo y 2000–2090 WAF.
2. **Falso positivo:** activa `waf_preview = true` para esa regla o excluye la ruta y aplica. Documenta la excepción.
3. **Ataque:** mantén las reglas. Considera bajar `auth_rate_limit_per_minute` o agregar una regla de IP temporal.
   Adaptive Protection propone reglas en la consola.

## Rotación de secretos y llaves

Secret Manager publica un recordatorio en `g3-secret-events` cada 90 días por secreto. Regla general:

1. Agrega una versión nueva.
2. Redespliega para que las instancias nuevas lean `latest`.
3. Verifica.
4. Deshabilita la versión anterior (no la destruyas hasta 30 días después).

```bash
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets versions add <secreto> --data-file=-
# Nueva revisión de los servicios que lo usan (relee 'latest'):
gcloud run services update g3-<svc> --region=$REGION --update-labels=rotated=$(date +%Y%m%d)
gcloud secrets versions disable <version-anterior> --secret=<secreto>
```

| Secreto | Usan | Impacto y procedimiento |
|---|---|---|
| `g3-internal-token` | auth, billing, fleet, trips, alerts, integrations, invoicing y el header del scheduler | Al rotarlo, las llamadas entre servicios fallan mientras conviven revisiones con token viejo y nuevo. Hazlo en horario bajo: (1) nueva versión, (2) `terraform apply` (header del scheduler), (3) redeploy de los 7 servicios lo más junto posible (por ejemplo, el pipeline). Trimestral. |
| `g3-audit-ingest-token` | auth (valida), trips e integrations | Igual que el anterior. |
| `g3-jwt-access` | auth (firma), gateway (valida) | Invalida todos los access tokens (1 h); los clientes refrescan. Redeploy de auth y gateway juntos. |
| `g3-jwt-refresh` | auth | Cierra todas las sesiones: los usuarios vuelven a iniciar sesión. Anúncialo. |
| `g3-mfa-token-secret` | auth | Solo afecta logins con MFA a medias (5 min). |
| `g3-mfa-recovery-pepper` | auth | **No rotar sin migración**: los códigos de recuperación existentes dejan de validar. Si se compromete, rota y pide a los usuarios regenerar sus códigos. |
| `g3-mfa-encryption-key` | auth (cifra secretos TOTP) | Requiere re-encriptación (abajo). |
| `g3-integrations-encryption-key` | integrations (cifra secretos de proveedores) | Requiere re-encriptación (abajo). |
| `g3-db-*`, `g3-redis-*` | generados por Terraform | Ver abajo. |

### Re-encriptación de MFA_ENCRYPTION_KEY / INTEGRATIONS_ENCRYPTION_KEY

**Estado actual del código.** Los servicios leen **una sola llave**. Rotarla deja ilegibles los datos cifrados con la
anterior: secretos TOTP en `auth` y credenciales de proveedores en `integrations`. Hasta que el código soporte varias
llaves, solo hay dos caminos:

**A. Sin soporte de varias llaves (hoy).** Úsalo solo ante compromiso de la llave.

- **integrations:**
  1. Exporta la lista de integraciones configuradas, sin secretos, desde Admin.
  2. Rota la llave y redespliega `g3-integrations`.
  3. Vuelve a capturar cada secreto de proveedor en Admin › Integraciones (`backend/docs/INTEGRATIONS.md`).
- **auth (MFA):**
  1. Rota la llave y redespliega `g3-auth`.
  2. Los usuarios con TOTP deben re-enrolarse: un admin resetea su MFA, o usan un código de recuperación y luego se
     re-enrolan.
  3. Comunícalo antes.

**B. Con keyring (recomendado, requiere cambio de código, ver PRODUCTION-READINESS).**

1. El servicio acepta `<VAR>` (llave activa) y `<VAR>_PREVIOUS` (llaves anteriores, solo para descifrar). Cada valor
   cifrado lleva un `keyId`.
2. Agrega la nueva llave como activa y la vieja en `_PREVIOUS`, y redespliega.
3. Corre un job de re-encriptación que lee, descifra con la vieja y cifra con la nueva, en lotes e idempotente.
4. Cuando el job reporta 0 pendientes, quita `_PREVIOUS`, redespliega y deshabilita la versión vieja.

### Contraseñas de base y Redis

**Base.**

1. En `terraform.tfvars` cambia `db_password_rotation_id` (por ejemplo, a la fecha) y corre `terraform apply`. Eso
   genera nuevas contraseñas y nuevas versiones de `g3-db-password-*`, `g3-db-url-*`, `g3-db-migrator-password-*` y
   `g3-db-migrator-url-*`, y actualiza la de `postgres`.
2. `gcloud run jobs execute g3-db-bootstrap --wait`, que hace `ALTER ROLE … PASSWORD`.
3. Redespliega todos los servicios con base, por ejemplo con el pipeline.

Entre el paso 2 y el 3, las instancias viejas conservan su conexión abierta. Las nuevas conexiones de revisiones
viejas fallan hasta el redeploy, así que hazlo en la ventana de mantenimiento.

**Redis.** Rota el AUTH string con `gcloud redis instances perform-maintenance` / `rotate-auth` según la versión de
gcloud. Después corre `terraform apply`, que actualiza `g3-redis-url`, y redespliega.

## Backups y restauración

- **Backups automáticos diarios** a las 02:00 CDMX en multi-región `us`. Se conservan 30 en producción y 7 en staging.
- **PITR:** 7 días de logs de transacciones en producción. `deletion_protection` está activo.
- Las **evidencias** (GCS) tienen versionado, soft delete de 7 días y versiones anteriores por 30 días.

### pitr

Para recuperar a un instante (por ejemplo, antes de un borrado accidental), clona y no sobrescribas:

```bash
gcloud sql instances clone g3-prd-pg16 g3-prd-pg16-pitr-$(date +%Y%m%d%H%M) \
  --point-in-time='2026-10-02T14:05:00Z'
```

Después:

1. Valida los datos en el clon con un job o una VM en la VPC.
2. Extrae lo necesario con `pg_dump -n <schema> -t <tabla>` y reinsértalo.
3. Si hay que cambiar de instancia, apunta los secretos `g3-db-url-*` al clon. Esto requiere un `terraform import` o
   un cambio temporal de versión del secreto y un redeploy.
4. Borra el clon al terminar.

**Restaurar un backup** sobre una instancia nueva:

```bash
gcloud sql backups list --instance=g3-prd-pg16
gcloud sql backups restore <BACKUP_ID> --restore-instance=<instancia-destino> --backup-instance=g3-prd-pg16
```

### Prueba trimestral de restauración (obligatoria)

1. Clona producción a un instante de las últimas 24 h (PITR) en `g3-prd-pg16-drill`.
2. Corre conteos por schema (`SELECT count(*)` de las tablas principales por compañía) y compáralos con producción.
3. Mide el tiempo total, que es el RTO real, y anótalo en `security/postmortems/` como *drill*. Objetivos: RPO ≤ 5 min,
   RTO ≤ 2 h.
4. Borra el clon: `gcloud sql instances delete g3-prd-pg16-drill`.

## Mantenimiento de particiones de telemetría

`g3-fleet-maintenance` (Cloud Run Job, `node dist/maintenance.js`) corre cada día a las 03:17 CDMX desde Cloud
Scheduler y hace dos cosas:

- Asegura las particiones del mes anterior, el actual y los 3 siguientes.
- Borra con `DROP` las particiones más viejas que `TELEMETRY_RETENTION_MONTHS` (13 por defecto; `0` desactiva el
  borrado).

Es idempotente: si falla un día, el siguiente lo recupera, porque hay 3 meses de holgura. Si falla varios días
seguidos (alerta de job fallido), revisa el log y ejecútalo a mano:

```bash
gcloud run jobs execute g3-fleet-maintenance --region=$REGION --wait
```

Para cambiar la retención, ajusta `telemetry_retention_months` del módulo `g3`, corre `terraform apply` (actualiza el
job y `g3-fleet`) y documenta el cambio. Afecta obligaciones de conservación, así que consulta a legal.

## Purga de retención

| Dato | Retención | Mecanismo |
|---|---|---|
| Telemetría GPS | 13 meses | `g3-fleet-maintenance` (DROP de particiones) |
| Evidencias de viaje | 5 años (`evidence_retention_days`) | Lifecycle de GCS (Nearline a 90 días, Coldline a 365 días, borrado al vencer) |
| Versiones anteriores de evidencias | 30 días | Lifecycle de GCS |
| Logs de acceso a buckets | 365 días | Lifecycle del bucket de logs |
| Cloud Logging | 30 días (default `_Default`) | Para más tiempo, crea un sink a un bucket de logs con retención |
| Backups de Cloud SQL | 30 backups + 7 días de PITR | Cloud SQL |
| Bitácora de auditoría (`auth.audit_log`) | Indefinida (append-only) | Purga solo por acuerdo legal, como administrador, documentada |
| Redis | TTL de cada llave | Expiración |

Las solicitudes ARCO o de borrado de datos personales se atienden por API o como administrador, con registro en la
bitácora. Nunca se borran filas de `auth.audit_log`.
