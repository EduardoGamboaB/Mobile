# Modelo de datos · alerts

Schema `alerts` (rol `g3_alerts`). Migraciones en `services/alerts/migrations/`; se aplican con
`node dist/migrate.js` (Cloud Run Job) o con `DB_MIGRATE_ON_BOOT=1` en desarrollo. Sin `DATABASE_URL`/`DB_HOST`
el servicio usa los repos en memoria (solo dev, una réplica).

```mermaid
erDiagram
  alerts {
    text id PK
    text company_id
    text level "info | warning | critical"
    text type "license_expiring | maintenance_due | sos | route_deviation | late_arrival | other"
    text message
    boolean resolved
    timestamptz created_at
    timestamptz resolved_at
  }
  incident_folio_counters {
    text company_id PK
    int year PK
    int last_seq
  }
  incidents {
    text id PK
    text company_id "UNIQUE (company_id, folio) y (company_id, client_uuid)"
    text folio "INC-{año}-{seq}"
    text client_uuid "idempotencia de G3 Drive"
    text source "driver_report | sos | rule | manual"
    text type "11 tipos del contrato"
    text urgency "low | medium | high | critical"
    text status "open | acknowledged | in_progress | resolved | closed"
    text title
    text description
    text trip_id
    text driver_id
    text vehicle_id
    text assignee_id
    timestamptz occurred_at
    text location_text
    float8 lat
    float8 lng
    text_array evidence_ids
    timestamptz sla_ack_due_at
    timestamptz sla_resolve_due_at
    timestamptz acknowledged_at
    timestamptz resolved_at
    timestamptz closed_at
    smallint escalation_level "0 | 1 acuse | 2 resolución"
    timestamptz created_at
    timestamptz updated_at
  }
  incident_comments {
    bigint seq "orden de alta"
    text id PK
    text company_id
    text incident_id FK
    text author_id "null = sistema"
    text kind "comment | system"
    text body
    timestamptz created_at
  }
  alert_rules {
    text id PK
    text company_id
    text name
    boolean enabled
    jsonb trigger "AlertRuleTrigger validado por variante"
    text_array channels "push | whatsapp"
    text_array notify_roles
    timestamptz created_at
    timestamptz updated_at
  }
  notification_contacts {
    text company_id PK
    text user_id PK
    text role
    text push_token
    text whatsapp "E.164"
    timestamptz updated_at
  }
  vehicle_last_signals {
    text company_id PK
    text vehicle_id PK
    text trip_id
    text driver_id
    float8 speed_kph
    float8 lat
    float8 lng
    timestamptz recorded_at
  }
  incidents ||--o{ incident_comments : "bitácora"
  incident_folio_counters ||--o{ incidents : "asigna folio"
```

`company_id` va en todas las tablas y abre todos los índices de negocio. Los ids de otros servicios
(`trip_id`, `driver_id`, `vehicle_id`, `assignee_id`, `evidence_ids`) no son FKs: viven en otros schemas y se
consultan por API.

## Decisiones

- **Folio único bajo concurrencia.** `incident_folio_counters` guarda el último consecutivo por compañía y año. El
  alta hace, en una sola transacción, `INSERT … ON CONFLICT (company_id, year) DO UPDATE SET last_seq = last_seq + 1
  RETURNING last_seq` (toma el bloqueo de la fila) y el `INSERT` del incidente. `UNIQUE (company_id, folio)` es la
  red de seguridad. Nunca se usa `count(*) + 1`.
- **Idempotencia de G3 Drive.** `UNIQUE (company_id, client_uuid)` con `ON CONFLICT DO NOTHING`. Si dos envíos de la
  cola offline llegan a la vez, el perdedor hace `ROLLBACK` (no consume folio), devuelve el incidente existente y no
  vuelve a notificar.
- **Enums.** `CHECK` idénticos a `contracts/src/dtos/incidents.ts` (`INCIDENT_TYPES`, `INCIDENT_URGENCIES`,
  `IncidentStatus`, `IncidentSource`) y a `AlertDto`.
- **Escalamiento seguro con varias instancias.** `runEscalations` lista los candidatos
  (`incidents_escalation_idx`, parcial sobre abiertos con nivel < 2) y reclama cada nivel con un compare-and-set:

  ```sql
  UPDATE incidents SET escalation_level = $n, updated_at = $now
   WHERE company_id = $1 AND id = $2 AND status NOT IN ('resolved','closed')
     AND escalation_level < $n AND <SLA de la etapa sigue vencido>
  RETURNING …
  ```

  Con `READ COMMITTED`, un segundo barrido simultáneo espera el bloqueo de la fila y vuelve a evaluar el `WHERE`
  sobre la versión nueva, así que recibe 0 filas y no notifica. Es equivalente a `FOR UPDATE SKIP LOCKED` por
  incidente, pero sin abrir una transacción durante el envío de notificaciones. Cada nivel se notifica una sola
  vez (idempotente por nivel). Si el proceso muere después de reclamar y antes de notificar, ese aviso se pierde;
  la bitácora del incidente lo deja ver. Se prefirió a notificar dos veces.
- **Regla `device_offline`.** La última posición por unidad con viaje activo ya no vive en un `Map` de la
  instancia. Ahora está en `vehicle_last_signals`, que se actualiza con un upsert que solo avanza en el tiempo
  (`WHERE recorded_at < excluded.recorded_at`). Una señal sin `tripId` borra la fila: la unidad ya no está en
  viaje. El barrido toma las filas viejas y reclama cada una con
  `DELETE … WHERE recorded_at = <la leída>`. Solo la instancia que borra abre el incidente, y si llegó una posición
  nueva entretanto, el reclamo falla. Se eligió Postgres y no Redis porque perder este estado apaga en silencio
  una alerta de seguridad (GPS inhibido en un robo). La carga es un upsert por posición sobre una fila por unidad.
- **Reglas.** `trigger` es `jsonb` con un `CHECK` por variante: `minUrgency` válida, `stage` ack/resolve,
  `thresholdKph` numérico en (0, 200) y `minutes` numérico en [5, 1440]. `channels` debe ser un subconjunto de
  push/whatsapp. La API valida lo mismo antes (`validateRule`).
- **Contactos.** La PK es `(company_id, user_id)` y `whatsapp` lleva un `CHECK` E.164. En el upsert, un campo
  ausente conserva el valor y `null` lo borra.
- **Transiciones.** Se actualizan con `WHERE status = <leído>` (control optimista). Si otro operador cambió el
  estado, la API responde 409 en vez de pisarlo. La evidencia se agrega con un `array_append` condicionado, que es
  atómico y no duplica.
- **Comentarios.** `seq` (identity) da el orden estable aunque varias entradas de sistema compartan `created_at`.

## Pendiente

- Velocidad (`speeding`): solo hay un incidente cada 30 min por unidad, y se revisa leyendo. Dos réplicas que
  reciben señales de la misma unidad en el mismo instante podrían abrir dos. Si pasa, conviene un
  `setIfAbsent` en Redis por unidad.
- Retención: purgar `incident_comments` e incidentes cerrados según la política de datos.
