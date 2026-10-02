# Centro de incidentes

Vive en el servicio `alerts`, bajo `src/incidents/`. Con él, la torre de control atiende en una sola vista lo que
reporta el operador en G3 Drive, el botón SOS y las reglas automáticas sobre la telemetría.

## Ciclo y SLA

```
open → acknowledged → in_progress → resolved → closed
                └──────────────┴──→ resolved      resolved → in_progress (reabrir)
```

| Urgencia | Acuse | Resolución |
|---|---|---|
| critical | 5 min | 2 h |
| high | 15 min | 8 h |
| medium | 60 min | 24 h |
| low | 4 h | 72 h |

Cualquier acción de atención cuenta como acuse. Cada incidente lleva una bitácora con dos tipos de entrada:
los comentarios del equipo y las entradas del sistema (cambios de estado, asignaciones, notificaciones y
escalamientos). También guarda la evidencia ligada (`evidenceIds` de `/trips/:id/evidences`).

## Escalamiento

`runEscalations()` corre cada minuto desde Cloud Scheduler.

- **Nivel 1:** el acuse no llegó dentro del SLA.
- **Nivel 2:** el incidente no se resolvió dentro del SLA.

Cada nivel se dispara una sola vez. A quién se avisa y por qué canal depende de si la compañía tiene reglas:

- **Con reglas `sla_breach`:** se usan sus canales y roles.
- **Sin reglas:** se manda push a owner, admin y dispatcher, más WhatsApp si la urgencia es alta o crítica.
- **SOS:** avisa siempre por push y WhatsApp a la torre, aunque no haya reglas.

## Reglas (`/alert-rules`)

| Disparador | Efecto |
|---|---|
| `incident_created` (urgencia mínima, tipos) | Notifica al abrirse un incidente |
| `sla_breach` (ack \| resolve) | Define el escalamiento |
| `speeding` (umbral km/h) | Con telemetría, abre un incidente `speeding`; uno por unidad cada 30 min |
| `device_offline` (minutos) | Sin posición durante un viaje activo, abre un incidente `device_offline` |

## Canales

- **Push:** Expo Push API (G3 Drive es Expo). Se activa con `EXPO_PUSH_ENABLED=1` y, de forma opcional,
  `EXPO_ACCESS_TOKEN`.
- **WhatsApp:** WhatsApp Cloud API (Meta), con la plantilla aprobada `g3_incidente` y 4 parámetros: folio,
  título, urgencia y motivo. Variables: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` y
  `WHATSAPP_TEMPLATE`.
- **Sin credenciales:** los envíos se registran en memoria y no sale nada.
- **Destinatarios:** cada usuario registra su token push y su WhatsApp (E.164) en
  `PUT /notification-contacts/me`. Solo se notifica a quien tiene ese canal dado de alta.

## Endpoints (vía gateway `/api`)

| Método | Ruta | Quién |
|---|---|---|
| GET | `/incidents?status&urgency&assigneeId&tripId&breached` | torre (owner/admin/dispatcher) |
| GET | `/incidents/summary` · `/incidents/:id` | torre (el chofer solo ve los suyos) |
| GET | `/incidents/mine` | chofer |
| POST | `/incidents` (reporte, idempotente por `clientUuid`) · `/incidents/sos` | chofer / torre |
| POST | `/incidents/manual` | torre |
| POST | `/incidents/:id/{ack,start,resolve,close,reopen}` · `PATCH /incidents/:id/assign` | torre |
| POST | `/incidents/:id/comments` · `/incidents/:id/evidences` | torre / chofer dueño |
| GET/POST/PATCH/DELETE | `/alert-rules` | torre |
| PUT | `/notification-contacts/me` | cualquier usuario |
| POST | `/incidents/escalations/run` · `/incidents/signals` | **internos**, header `x-internal-token` = `INTERNAL_TOKEN` |

El gateway nunca reenvía `x-internal-token`, así que los endpoints internos no se alcanzan desde fuera.

## Pendiente para producción

- Persistencia en Postgres (TypeORM). Hoy los repositorios son in-memory.
- Conectar fleet con alerts:
  - Suscripción push de Pub/Sub sobre `telemetry.position_received` hacia `/incidents/signals`.
  - Resolver el viaje activo de cada vehículo, porque el evento de fleet aún no trae `tripId`.
- Cloud Scheduler con OIDC que llame a `/incidents/escalations/run` cada minuto.
- Aprobación en Meta de la plantilla `g3_incidente`.
- En G3 Drive: registro del token de Expo Push al iniciar sesión.
- Catálogo de responsables tomado de `/users`. En Admin hoy es una lista fija.
