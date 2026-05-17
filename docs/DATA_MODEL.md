# Modelo de datos — G3 Logistics

## Diagrama ER (resumen)

```
companies (1) ──< profiles (drivers/dispatchers/admins)
                     │
                     └──< trips ──< logbook_entries
                              │         │
                              │         └──< evidences (logbook)
                              │
                              ├──< evidences (trip)
                              │
                              └──< incidents ──< evidences (incident)

vehicles (1) ──< trips (asignación)
```

## Tablas

### `companies`
Catálogo de flotillas / clientes G3.
| Columna     | Tipo      | Notas                       |
|-------------|-----------|-----------------------------|
| id          | uuid PK   | `gen_random_uuid()`         |
| name        | text      | "G3 Logistics"              |
| rfc         | text      |                             |
| created_at  | timestamptz |                           |

### `profiles`
Espejo de `auth.users` con datos del operador. **PK = auth.users.id**.
| Columna              | Tipo                                  | Notas                |
|----------------------|---------------------------------------|----------------------|
| id                   | uuid PK (= auth.users.id)             |                      |
| company_id           | uuid FK → companies                   |                      |
| role                 | text (enum: driver/dispatcher/admin)  | default 'driver'     |
| full_name            | text                                  |                      |
| phone                | text                                  |                      |
| email                | text                                  |                      |
| federal_license      | text                                  | nº licencia federal  |
| license_expires_at   | date                                  | vigencia             |
| assigned_unit_number | text                                  | nº de unidad         |
| unit_type            | text                                  | "Tortón", "Tráiler"  |
| tractor_plates       | text                                  |                      |
| trailer_plates       | text                                  |                      |
| status               | text (enum: active/suspended/pending) | default 'pending'    |
| photo_url            | text                                  | avatar opcional      |
| created_at           | timestamptz                           |                      |
| updated_at           | timestamptz                           |                      |

### `vehicles` (catálogo opcional V2)
Permite tener una flotilla y reasignar unidades.
| id, company_id, unit_number, type, tractor_plates, trailer_plates, active |

### `trips`
| Columna                | Tipo                                    | Notas                                         |
|------------------------|-----------------------------------------|-----------------------------------------------|
| id                     | uuid PK                                 |                                               |
| company_id             | uuid FK                                 |                                               |
| driver_id              | uuid FK → profiles                      | chofer asignado                               |
| folio                  | text unique                             | "G3-2026-00123"                               |
| client_name            | text                                    |                                               |
| cargo                  | text                                    | producto                                      |
| origin                 | text                                    | dirección/ciudad                              |
| destination            | text                                    |                                               |
| origin_coords          | geography(point)                        | opcional                                      |
| destination_coords     | geography(point)                        | opcional                                      |
| load_date              | timestamptz                             | fecha programada de carga                     |
| estimated_unload_date  | timestamptz                             |                                               |
| tons                   | numeric(10,2)                           |                                               |
| price_per_ton          | numeric(10,2)                           |                                               |
| total_amount           | numeric(12,2)                           | calculado o capturado                         |
| driver_commission      | numeric(12,2)                           |                                               |
| estimated_tolls        | numeric(10,2)                           |                                               |
| estimated_diesel       | numeric(10,2)                           | litros o pesos según preferencia              |
| status                 | text (enum trip_status)                 | scheduled/loading/in_transit/unloading/finished/cancelled |
| notes                  | text                                    |                                               |
| started_at             | timestamptz                             | cuando chofer marca "Salida"                  |
| finished_at            | timestamptz                             | "Cierre de viaje"                             |
| created_at, updated_at | timestamptz                             |                                               |

**Enum `trip_status`:**
`scheduled`, `loading`, `in_transit`, `unloading`, `finished`, `cancelled`

(Los estatus intermedios "en ruta" y "cargando/descargando" se modelan como `loading` →
`in_transit` → `unloading` para no duplicar.)

### `logbook_entries`
Bitácora del viaje. **Append-only** desde la app.
| Columna       | Tipo                            | Notas                                  |
|---------------|---------------------------------|----------------------------------------|
| id            | uuid PK                         |                                        |
| client_uuid   | uuid                            | UUID generado en cliente (idempotencia)|
| trip_id       | uuid FK → trips                 |                                        |
| driver_id     | uuid FK → profiles              |                                        |
| event_type    | text (enum logbook_event)       | ver abajo                              |
| occurred_at   | timestamptz                     | hora del evento (puede no ser ahora)   |
| location_text | text                            | manual                                 |
| coords        | geography(point)                | GPS si disponible                      |
| odometer_km   | integer                         | kilometraje                            |
| fuel_level    | text (enum: full/three_quarters/half/quarter/empty) |                    |
| expense_amount| numeric(10,2)                   | gasto                                  |
| expense_concept| text                           | "diesel", "caseta x", etc.             |
| comments      | text                            |                                        |
| created_at    | timestamptz                     |                                        |

**Enum `logbook_event`:**
`departure`, `loading`, `stop`, `toll`, `diesel`, `incident`, `arrival`, `unloading`, `closing`

### `incidents`
| Columna      | Tipo                              | Notas                              |
|--------------|-----------------------------------|------------------------------------|
| id           | uuid PK                           |                                    |
| client_uuid  | uuid                              | idempotencia                       |
| trip_id      | uuid FK → trips                   |                                    |
| driver_id    | uuid FK → profiles                |                                    |
| type         | text (enum incident_type)         | mech_failure/checkpoint/accident…  |
| description  | text                              |                                    |
| occurred_at  | timestamptz                       |                                    |
| location_text| text                              |                                    |
| coords       | geography(point)                  |                                    |
| urgency      | text (enum: low/medium/high/critical) |                                |
| resolved     | boolean default false             |                                    |
| resolved_at  | timestamptz                       |                                    |
| resolved_by  | uuid FK → profiles                |                                    |
| created_at   | timestamptz                       |                                    |

**Enum `incident_type`:**
`mechanical`, `checkpoint`, `accident`, `delay_loading`, `delay_unloading`,
`client_issue`, `theft_attempt`, `other`

### `evidences`
Polimórfica: una evidencia pertenece a un viaje, una bitácora o una incidencia.
| Columna       | Tipo                                | Notas                                  |
|---------------|-------------------------------------|----------------------------------------|
| id            | uuid PK                             |                                        |
| trip_id       | uuid FK → trips, nullable           |                                        |
| logbook_id    | uuid FK → logbook_entries, nullable |                                        |
| incident_id   | uuid FK → incidents, nullable       |                                        |
| driver_id     | uuid FK → profiles                  | uploader                               |
| type          | text (enum evidence_type)           | ver abajo                              |
| storage_path  | text                                | path en Supabase Storage               |
| mime_type     | text                                |                                        |
| size_bytes    | integer                             |                                        |
| coords        | geography(point)                    | dónde se tomó                          |
| taken_at      | timestamptz                         | EXIF si disponible                     |
| created_at    | timestamptz                         |                                        |

**Enum `evidence_type`:**
`bill_of_lading` (carta porte), `scale_ticket` (báscula), `loading_photo`,
`unloading_photo`, `diesel_ticket`, `toll_ticket`, `delivery_proof`, `other`

Restricción: al menos uno de `trip_id`, `logbook_id`, `incident_id` debe ser no nulo.

## Storage buckets (Supabase Storage)

- `evidences/` — privado. Path: `{company_id}/{trip_id}/{evidence_id}.{ext}`.
- `avatars/` — privado. Path: `{user_id}.{ext}`.

URLs siempre firmadas con expiración 1 hora.

## Índices recomendados

```sql
CREATE INDEX ON trips(driver_id, status);
CREATE INDEX ON trips(company_id, load_date DESC);
CREATE INDEX ON logbook_entries(trip_id, occurred_at);
CREATE INDEX ON incidents(trip_id);
CREATE INDEX ON evidences(trip_id);
```

## RLS — políticas resumidas

- **Chofer** lee/escribe su propio `profile`, sus `trips`, sus `logbook_entries`,
  sus `incidents`, sus `evidences`.
- **Dispatcher / Admin** ven todo lo de su `company_id` y pueden crear `trips`.
- `logbook_entries` no son actualizables ni borrables por el chofer una vez creadas
  (append-only). Admin puede corregir.
