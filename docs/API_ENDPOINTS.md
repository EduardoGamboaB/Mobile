# API Endpoints

Supabase expone Postgres como REST automático (`PostgREST`). Los "endpoints" son tablas + RPC.
Aquí los listamos como si fueran REST clásicos para claridad y por si V2 migra a NestJS.

Base URL (Supabase): `https://<project>.supabase.co/rest/v1`
Header: `apikey`, `Authorization: Bearer <jwt>`

## Auth (Supabase Auth, no PostgREST)

| Método | Endpoint                            | Descripción                       |
|--------|-------------------------------------|-----------------------------------|
| POST   | `/auth/v1/otp`                      | Enviar OTP por SMS o email        |
| POST   | `/auth/v1/verify`                   | Verificar OTP, devuelve JWT       |
| POST   | `/auth/v1/token?grant_type=password`| Login email + password            |
| POST   | `/auth/v1/recover`                  | Recuperación de contraseña        |
| POST   | `/auth/v1/logout`                   | Cerrar sesión                     |

## Profiles

| Método | Endpoint              | Notas                                 |
|--------|-----------------------|---------------------------------------|
| GET    | `/profiles?id=eq.{me}`| RLS limita a propio o de la compañía  |
| PATCH  | `/profiles?id=eq.{me}`| Editar perfil propio                  |
| GET    | `/profiles?role=eq.driver` | Solo dispatcher/admin            |

## Trips

| Método | Endpoint                                                          | Notas             |
|--------|-------------------------------------------------------------------|-------------------|
| GET    | `/trips?driver_id=eq.{me}&status=in.(scheduled,loading,in_transit,unloading)` | Mis activos |
| GET    | `/trips?driver_id=eq.{me}&order=load_date.desc&limit=20`         | Historial         |
| GET    | `/trips?id=eq.{id}&select=*,profiles!driver_id(*)`                | Detalle           |
| POST   | `/trips`                                                          | Admin: crear      |
| PATCH  | `/trips?id=eq.{id}`                                               | Cambio de estatus |
| RPC    | `/rpc/advance_trip_status`                                        | Función que valida transición |

## Logbook

| Método | Endpoint                          | Notas                                 |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/logbook_entries?trip_id=eq.{id}&order=occurred_at`| Línea de tiempo  |
| POST   | `/logbook_entries`                | Crear evento (idempotente por `client_uuid`) |

## Incidents

| Método | Endpoint                          | Notas                |
|--------|-----------------------------------|----------------------|
| GET    | `/incidents?driver_id=eq.{me}`    |                      |
| POST   | `/incidents`                      | Crear incidencia     |
| PATCH  | `/incidents?id=eq.{id}`           | Admin: resolver      |

## Evidences

| Método | Endpoint                          | Notas                                 |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/evidences?trip_id=eq.{id}`      |                                       |
| POST   | `/evidences`                      | Crear registro (después del upload)   |

## Storage

| Método | Endpoint                                              | Notas                       |
|--------|-------------------------------------------------------|-----------------------------|
| POST   | `/storage/v1/object/evidences/{path}`                 | Subir archivo               |
| POST   | `/storage/v1/object/sign/evidences/{path}?expiresIn=3600` | URL firmada para mostrar |

## RPC (funciones Postgres)

```sql
-- Avanza estatus validando transiciones permitidas
CREATE FUNCTION advance_trip_status(trip uuid, next_status text)
RETURNS trips
LANGUAGE plpgsql
SECURITY DEFINER;
```

```sql
-- Resumen del dashboard del chofer
CREATE FUNCTION driver_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER;
```

## Errores

Supabase devuelve `{ "code": "...", "message": "...", "details": "..." }`.
El cliente mapea a tipos `AppError` con `code`, `userMessage`, `retryable`.
