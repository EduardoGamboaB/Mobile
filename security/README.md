# G3 · Módulo de Seguridad

> **Esta carpeta es la fuente única de políticas de ciberseguridad
> que rigen TODO desarrollo en G3 — web, mobile, backend, agentes de
> IA, infraestructura. Cualquier cambio que no las respete, no se
> mergea.**

## Origen

Los controles provienen del catálogo **DSI Grupo Salinas** (archivo
`Controles_DSI.xlsx`, 6,374 filas, 1,594 controles únicos),
cubriendo AWS, GCP, Huawei y Azure para Totalplay, Elektra, Banco
Azteca, TV Azteca y Total Cyber-Sec.

De ese universo, **181 controles aplican directamente a G3** porque
nuestro stack vive en **Google Cloud Platform**. Los extrajimos,
clasificamos por servicio y traducimos a checklist accionable en
[`03-controls/`](./03-controls/).

| Servicio GCP | Controles G3 | Documento |
|---|---:|---|
| Vertex AI | 32 | [vertex-ai.md](./03-controls/vertex-ai.md) |
| IAM | 17 | [iam.md](./03-controls/iam.md) |
| Cloud SQL | 12 | [cloud-sql.md](./03-controls/cloud-sql.md) |
| Cloud Run | 11 | [cloud-run.md](./03-controls/cloud-run.md) |
| Cloud Storage | 9 | [cloud-storage.md](./03-controls/cloud-storage.md) |
| Cloud Functions | 8 | [cloud-functions.md](./03-controls/cloud-functions.md) |
| Secret Manager | 6 | [secret-manager.md](./03-controls/secret-manager.md) |
| Cloud Load Balancing | 6 | [networking.md](./03-controls/networking.md) |
| Cloud CDN | 6 | (en networking.md) |
| BigQuery | 5 | [bigquery.md](./03-controls/bigquery.md) |
| Cloud Pub/Sub | 5 | [pub-sub.md](./03-controls/pub-sub.md) |
| GKE | 4 | (en cloud-run.md) |
| Cloud Armor | 3 | (en networking.md) |
| Compute Engine | 45 | [compute-engine.md](./03-controls/compute-engine.md) |
| Firebase Analytics | 8 | [firebase.md](./03-controls/firebase.md) |

> **Compute Engine: 45 controles** se documentan aunque nuestra
> arquitectura prefiere Cloud Run (serverless). Si alguna vez
> levantamos VMs, aplica el bloque completo.

## Cómo navegar este módulo

```
security/
├── README.md                       ← este archivo (índice)
├── 01-policy-source.md             de dónde vienen los controles + gobernanza
├── 02-stack-mapping.md             qué controles aplican a cada componente
├── 03-controls/                    fichas por servicio con checklist accionable
├── 04-development-workflow.md      pre-dev → dev → review → deploy
├── 05-security-checklist.md        PR checklist obligatorio
├── 06-testing-protocol.md          pruebas de seguridad por capa
├── 07-incident-response.md         qué hacer cuando algo se rompe
└── data/
    ├── controls.json               181 controles G3 en JSON canónico
    └── controls-<servicio>.json    desglosado por servicio
```

## Reglas del módulo

1. **Ningún PR cierra sin cumplir el checklist** de
   [`05-security-checklist.md`](./05-security-checklist.md)
2. **Ningún deploy a producción** ocurre sin pasar
   [`06-testing-protocol.md`](./06-testing-protocol.md)
3. **Cambios a esta carpeta** requieren aprobación de:
   - Compliance Officer (ver [organization/](../holding/organization/03-governance.md))
   - VP Engineering
   - Constancia del Comité de Riesgo y Cumplimiento
4. **`data/controls.json` es inmutable** — refleja el Excel fuente.
   Se actualiza solo cuando DSI publica nueva versión.

## Quién es responsable

| Responsabilidad | Rol |
|---|---|
| Mantener este módulo al día con el Excel fuente | Compliance Officer |
| Asegurar que el dev workflow se siga | VP Engineering |
| Implementar controles en el stack | Cada team lead (backend, mobile, web) |
| Auditar cumplimiento mensual | Compliance Officer + SRE |
| Reportar incidentes | Quien lo detecta → Compliance Officer en ≤4 hrs |

## Estado actual

| Item | Estado |
|---|---|
| Excel DSI parseado e indexado | ✓ 181 controles G3 |
| Documentos por servicio | ✓ 11 fichas (servicios usados) |
| Dev workflow integrado | ✓ |
| PR checklist | ✓ |
| Testing protocol | ✓ |
| Incident response runbook | ✓ |
| Validación contra el backend actual | Pendiente — auditoría completa al cierre del Q |
| Validación contra mobile actual | Pendiente |
| Validación contra website actual | Pendiente |
| Implementación de quick wins | Pendiente |

## Quick wins (próximas 2 semanas)

Items críticos detectados en el catálogo, no implementados todavía
en el stack G3:

1. **Cloud Audit Logs** habilitados en todos los servicios (varios
   controles lo exigen: Secret Manager, IAM, Cloud Run, Vertex AI)
2. **Eliminar roles primitivos** (Owner/Editor/Viewer) en cualquier
   service account
3. **Bloqueo de acceso público** en buckets de Cloud Storage
4. **Encryption at rest con CMEK** (Customer-Managed Encryption Keys)
   en Cloud SQL y Cloud Storage
5. **VPC Service Controls** alrededor de Vertex AI y Cloud SQL
6. **Rotación automática** de secretos en Secret Manager (≤ 90 días)
7. **Cloud Armor** policy delante del gateway público (rate limiting
   + WAF rules OWASP)
8. **Reducir el ámbito de allUsers / allAuthenticatedUsers** en
   Cloud Run a un service account interno
