# SLO de G3 (propuesta v1)

Son objetivos internos para operar y decidir. **No** son un SLA contractual. Se miden en ventanas móviles de 28 días
con las métricas que ya exporta GCP (Cloud Run, Load Balancer, Cloud SQL), sin instrumentación adicional. Se revisan
cada trimestre con datos reales y se ajustan después del primer mes en producción.

## SLI y objetivos

| # | Servicio / camino | SLI | Objetivo | Presupuesto de error (28 d) |
|---|---|---|---|---|
| 1 | **API pública** (`api.<dominio>`, LB → gateway) | Respuestas no 5xx / total (excluye 429 y 4xx) | **99.5 %** | ≈ 3 h 22 min |
| 2 | **Latencia del API** | p95 de `request_latencies` del gateway | **< 800 ms** (p99 < 2 s) | 5 % de minutos fuera |
| 3 | **Login y OTP** (`/api/auth/login`, `/api/auth/otp/*`) | Éxito no 5xx | **99.9 %** | ≈ 40 min |
| 4 | **Ingesta de telemetría** (`/api/telemetry/ingest/*`) | 202 / (202 + 5xx) | **99.5 %** | ≈ 3 h 22 min |
| 5 | **Escalamiento de incidentes SOS/críticos** | Ejecuciones de `g3-incident-escalations` exitosas / programadas | **99.9 %** (≤ 40 fallos por 28 días; nunca 3 seguidos) | ≈ 40 ejecuciones |
| 6 | **Panel** (`admin.<dominio>`) | Uptime check OK | **99.9 %** | ≈ 40 min |
| 7 | **Datos** | RPO (pérdida máxima) / RTO (recuperación) | **RPO ≤ 5 min** (PITR) · **RTO ≤ 2 h** | Se valida en la prueba trimestral |

Por qué estos números:

- El API está en 99.5 % porque es un solo proyecto y una sola región en V1, Cloud Run tiene un SLA de 99.95 % y
  Cloud SQL HA de 99.99 %. El presupuesto se va sobre todo en deploys y migraciones.
- Login y escalamiento están más altos porque bloquean a un chofer o dejan un SOS sin atender.
- La ingesta tolera reintentos de los proveedores de GPS, que reenvían.

## Alertas (implementadas en `infra/terraform/modules/monitoring`)

| Alerta | Condición | Severidad | SLO | Runbook |
|---|---|---|---|---|
| Uptime falla | API `/health` o panel fallan desde ≥ 2 regiones durante 3 min | CRITICAL | 1, 6 | [api-caida](./RUNBOOK.md#api-caida) |
| Cloud Run 5xx | Proporción de 5xx > 2 % por servicio durante 5 min (PromQL) | ERROR | 1, 3, 4 | [errores-5xx](./RUNBOOK.md#errores-5xx) |
| Latencia p95 | p95 > 1 500 ms por servicio durante 10 min | WARNING | 2 | [latencia](./RUNBOOK.md#latencia) |
| Escalamiento falla | ≥ 3 errores de Cloud Scheduler en 5 min | CRITICAL | 5 | [escalamiento](./RUNBOOK.md#escalamiento-de-incidentes) |
| Migración/bootstrap falla | Ejecución de job fallida o errores en logs de `migrate-*`, `g3-db-bootstrap` o `g3-fleet-maintenance` | CRITICAL | 1 | [migraciones](./RUNBOOK.md#migraciones) |
| Cloud SQL | CPU > 80 %, memoria > 90 %, disco > 85 % o conexiones > 80 % de `max_connections` durante 10 min | ERROR | 1, 2 | [cloud-sql](./RUNBOOK.md#cloud-sql) |
| Cloud SQL caída | `database/up` = 0 durante 2 min | CRITICAL | 1, 7 | [cloud-sql](./RUNBOOK.md#cloud-sql) |
| Redis memoria | `usage_ratio` > 80 % durante 10 min | WARNING | 3 | [redis](./RUNBOOK.md#redis) |
| Saturación | Instancias activas > 8 por servicio durante 10 min | WARNING | 2 | [escalado](./RUNBOOK.md#escalado) |
| Errores de app | > 50 logs ERROR por servicio en 5 min | WARNING | 1 | [errores-5xx](./RUNBOOK.md#errores-5xx) |
| Cloud Armor | > 500 bloqueos en 5 min | WARNING | — (seguridad) | [cloud-armor](./RUNBOOK.md#cloud-armor) |
| Budget | 50 %, 90 % y 100 % del gasto real y 100 % del pronosticado | — | — | revisión de costos |

Los umbrales son variables del módulo de monitoreo (`error_ratio_threshold`, `latency_p95_ms`, etc.). Las alertas van
a los correos de `alert_emails`. Para guardias 24/7, agrega un canal de PagerDuty u Opsgenie. Es pendiente humano.

## Política de presupuesto de error

- **Más del 50 % consumido a mitad de la ventana:** congelar features riesgosas y priorizar el fix de la causa.
- **Presupuesto agotado:** solo se despliegan fixes de confiabilidad y seguridad hasta recuperarlo. El postmortem es
  obligatorio.
- **Mantenimientos planeados:** se anuncian 48 h antes, caen en la ventana del domingo 03:00 CDMX y sí consumen
  presupuesto.

## Siguientes pasos (no implementados aún)

- Crear objetos SLO de Cloud Monitoring (`google_monitoring_slo`) con burn-rate alerts sobre los SLI 1 y 3, cuando
  haya un mes de línea base.
- Agregar un SLI de frescura de telemetría (tiempo entre el punto del GPS y su disponibilidad en el mapa). Requiere
  una métrica de app.
- Hacer un dashboard por servicio: tráfico, errores, latencia y saturación.
