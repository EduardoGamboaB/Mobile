# Convenciones de persistencia (Postgres + Redis)

Todos los servicios siguen estas reglas. El kit `@g3/platform` (`backend/platform-kit`) trae las piezas.

## Postgres

- **Una instancia y una base (`g3`), un schema por servicio.** El schema se llama igual que el servicio: `auth`,
  `billing`, `drivers`, `fleet`, `trips`, `alerts`, `integrations`, `invoicing`. Cada servicio se conecta con su
  propio rol (`g3_<servicio>`), que solo tiene permisos sobre su schema. Ningún servicio lee tablas de otro: los
  datos ajenos se piden por API.
- **Migraciones:**
  - Van en `services/<x>/migrations/NNNN_descripcion.sql` y se aplican con `runMigrations`.
  - Son inmutables. Para cambiar algo se agrega una migración nueva; el runner compara el checksum y falla si una
    ya aplicada cambió.
  - Cada servicio tiene `src/migrate.ts`, que aplica sus migraciones y termina. En producción corre como Cloud Run
    Job antes del deploy.
  - En dev, `DB_MIGRATE_ON_BOOT=1` las aplica al arrancar.
- **Tipos:**
  - **Llaves:** `text` (ids generados por la app, uuid v4).
  - **Fechas:** `timestamptz`.
  - **Dinero:** `numeric(14,2)`.
  - **Cantidades:** `numeric(12,3)`.
  - **Coordenadas:** `double precision`.
  - **Enums:** `text` con `CHECK (col IN (...))`, idénticos al contrato de `@g3/contracts`.
  - **Mapas y listas flexibles:** `jsonb`.
- **Multi-tenant:** toda tabla de negocio lleva `company_id text NOT NULL`. Toda consulta filtra por `company_id`.
  Los índices empiezan por `company_id`. Las unicidades son por compañía, salvo las globales a propósito (IMEI,
  correo, teléfono).
- **Idempotencia:** el `client_uuid` de G3 Drive tiene `UNIQUE (company_id, client_uuid)` y el alta usa
  `INSERT … ON CONFLICT DO NOTHING` + `SELECT`.
- **Repositorios:**
  - Cada repo in-memory existente tiene su gemelo `Pg<Nombre>Repo` con la misma interfaz.
  - `main.ts` elige Postgres si hay `DATABASE_URL` o `DB_HOST`; sin ellas usa memoria (solo dev). En producción la
    base es obligatoria (`assertProductionEnv`).
  - Los tests de contrato del repo corren contra memoria siempre y contra Postgres con `TEST_DATABASE_URL`
    (`describeIfDb` + `createTestDb`).
- **Consultas:** se escriben a mano, siempre parametrizadas (`$1…`). Las operaciones que tocan varias tablas van en
  `withTransaction`. Para contadores y folios se usa `UPDATE … RETURNING` o un `SELECT … FOR UPDATE`, nunca
  `count(*) + 1` fuera de transacción.

## Redis (Memorystore)

- **Para qué:** solo estado efímero o compartido entre réplicas, a través de `EphemeralStore`. Por ejemplo, retos
  MFA (intentos y anti-replay), `state`/`nonce` de SSO, códigos OTP, enlaces de recuperación, rate limiting y
  cachés cortas. **Nada que no se pueda perder.**
- **Llaves:** `g3:<ambiente>:<servicio>:<uso>:<id>` (el prefijo lo pone el store).
- **Configuración:** `REDIS_URL` es obligatoria en producción.

## Operación

- **Salud:** `/health` es la liveness y `/ready` la readiness (DB y Redis); se registran con
  `registerHealthRoutes`.
- **Apagado:** al recibir SIGTERM, `onShutdown` cierra la app, el pool y Redis.
- **Llamadas internas:** las llamadas entre servicios usan `serviceFetchFromEnv()`, que manda `x-internal-token` y,
  con `SERVICE_AUTH=gcp`, el ID token de Cloud Run.
- **Logs:** se emiten con `createLogger(servicio)` en JSON. Nunca deben incluir secretos ni PII completa.

## Pruebas locales

```bash
# Postgres 16 y Redis locales (o docker compose up postgres redis)
export TEST_DATABASE_URL=postgres://postgres@localhost:5432/g3_test
export TEST_REDIS_URL=redis://localhost:6379
npm test
```
