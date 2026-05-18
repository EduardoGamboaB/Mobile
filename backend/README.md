# G3 Backend — Arquitectura de Microservicios (TDD)

Monorepo de microservicios construido con **TDD estricto**: cada servicio se
diseñó escribiendo specs primero y satisfaciendo el contrato con la mínima
implementación. Total: **112 pruebas en 9 workspaces**, todas verdes.

## Stack

- **NestJS 10** por servicio (deployable independientemente)
- **TypeScript estricto** + npm workspaces para compartir contratos
- **PostgreSQL** schema-per-service, Cloud SQL única en V1
- **Cloud Pub/Sub** para eventos de dominio async
- **HTTP** entre servicios (gateway → service) — bajo costo, fácil debug
- **Cloud Run** como runtime (escala 0→N por servicio)
- **Cloud Build** + **Artifact Registry** para CI/CD paralelo

## Layout

```
backend/
├── package.json                ← npm workspaces root
├── tsconfig.base.json
├── contracts/                  ← @g3/contracts (DTOs, tiers, errors, eventos)
│   ├── src/{tiers,errors,dtos,events}.ts
│   └── test/                     (20 tests)
├── gateway/                    ← BFF · JWT + tier gating + proxy a servicios
│   ├── src/
│   │   ├── main.ts               bootstrap + middleware Express
│   │   ├── middleware/
│   │   │   ├── jwt-context.ts    extrae {userId, companyId, tier} del JWT
│   │   │   └── tier-gate.ts      tabla de gating ruta→feature
│   │   └── proxy/router.ts       /api/<resource> → URL del microservicio
│   └── test/                     (31 tests)
├── services/
│   ├── auth/                   ← registro, login, refresh, JWT
│   │   └── test/                 (18 tests · password, token, service)
│   ├── billing/                ← subscriptions, Stripe, ciclo del plan
│   │   └── test/                 (10 tests)
│   ├── drivers/                ← CRUD + tier limit (users count)
│   │   └── test/                 (6 tests)
│   ├── fleet/                  ← tractors + trailers + livePositions (Pro+)
│   │   └── test/                 (7 tests)
│   ├── trips/                  ← lifecycle FSM + releasePayment (Starter+)
│   │   └── test/                 (9 tests)
│   ├── alerts/                 ← CRUD + Pub/Sub fanout (g3-alerts topic)
│   │   └── test/                 (4 tests)
│   └── ai/                     ← 6 agentes con fallback primary→stub
│       └── test/                 (7 tests)
└── infra/
    ├── docker/
    │   ├── service.Dockerfile    multi-stage genérico --build-arg SERVICE=
    │   └── docker-compose.yml    dev local: postgres + pubsub emulator + 8 svcs
    ├── ci/cloudbuild.yaml        build paralelo + deploy Cloud Run
    └── db/init-schemas.sql       8 schemas + roles dedicados por servicio
```

## Cómo se comunican

```
Cliente (mobile / admin)
        │ HTTPS + JWT
        ▼
   ┌─────────────┐
   │   gateway   │  Public · valida JWT · aplica tier gate · inyecta x-company-id, x-tier
   └──────┬──────┘
          │ HTTP interno (Cloud Run-to-Cloud Run, IAM auth)
   ┌──────┼──────┬──────┬──────┬──────┬──────┬──────┐
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
  auth  billing drivers fleet trips  alerts   ai
   │      │      │      │      │      │       │
   └──────┴──────┴──────┴──────┴──────┴───────┘
                       │
                       ▼  publish DomainEvent
                  ┌──────────┐
                  │  Pub/Sub │ → BigQuery sink, scoring engine, notifier
                  └──────────┘
```

**Sync** vía HTTP entre gateway y servicios. **Async** vía Pub/Sub para
eventos de dominio (`subscription.upgraded`, `trip.payment_released`,
`alert.raised`, etc.). El gateway es la única superficie pública —
los microservicios son privados a la VPC y confían en los headers
inyectados (`x-company-id`, `x-tier`, `x-user-id`).

## Sistema de tiers — el motor monetario

`contracts/src/tiers.ts` es la fuente única de verdad (la misma que
consumen mobile y admin). Define **5 tiers** y **25 feature flags**.

| Capa | Quién decide |
|---|---|
| Frontend | Lee `features` del JWT y oculta UI (mejor UX) |
| Gateway | `tier-gate.ts` mapea ruta→feature, devuelve **402** con payload de upgrade si falta |
| Service | Hace cumplir límites duros (units/users/tripsPerMonth) y emite `UpgradeRequiredError` para gates internos |

Cuando un Free intenta `POST /api/trips/:id/release-payment`:

```json
{
  "statusCode": 402,
  "error": "Upgrade required",
  "message": "Tu plan actual (free) no incluye esta funcionalidad...",
  "currentTier": "free",
  "missingFeatures": ["payment_authorization"],
  "suggestedUpgrade": "starter",
  "upgradeUrl": "/subscriptions/checkout"
}
```

Mobile y admin detectan el 402 y abren automáticamente el flujo de upgrade.

## Cómo se desarrolló — TDD por servicio

Cada servicio siguió este loop:

1. **Spec primero** (`test/<domain>.service.spec.ts`) describe el comportamiento esperado
2. **Run jest** → todos los tests **rojos** (no existe la implementación)
3. **Implementación mínima** que vuelve los tests verdes
4. **Refactor** preservando los tests verdes

Ejemplo: `services/auth/test/auth.service.spec.ts` define 8 specs:
- registerCompany crea company + owner + free subscription
- rechaza email duplicado
- rechaza contraseñas <12 chars
- login devuelve tokens con companyId y tier
- login con password incorrecto tira (mismo error que email inexistente — anti-enumeration)
- refresh rota tokens
- refresh con access token tira
- applyTier sincroniza tier de todos los users de la compañía

La implementación en `auth.service.ts` se diseñó *exclusivamente* para
satisfacer estos specs. Si un endpoint no estaba en los tests, no se
escribió. Esto previene over-engineering.

## Cobertura de pruebas

```
contracts/      20 ✓  tier catalog (5 tiers · 25 features · acumulativo)
                       errors (UpgradeRequiredError 402 · TierLimitExceededError 400)
gateway/        31 ✓  tier-gate (8 rutas gateadas)
                       proxy-router (/api/* → service URL)
                       jwt-context (Bearer + claims + tampering)
services/auth   18 ✓  password hasher · JWT issuer · registerCompany/login/refresh
                       anti-enumeration · tier sync desde billing
services/billing 10 ✓ trial · catalog · checkout · applyTier upgrade/downgrade · cancel
services/drivers  6 ✓ CRUD · companyId isolation · tier limit (users)
services/fleet    7 ✓ tractors + trailers · units cap · livePositions Pro+
services/trips    9 ✓ folio gen · FSM · monthly limit · releasePayment Starter+
services/alerts   4 ✓ CRUD · companyId isolation · Pub/Sub fanout
services/ai       7 ✓ 6 agents · primary→fallback transparente
                ───
                112 tests, 9 workspaces, 100% verde
```

## Cómo arrancar

### Dev local

```bash
cd backend
docker compose -f infra/docker/docker-compose.yml up --build
```

Levanta Postgres + Pub/Sub emulator + los 8 servicios.
Gateway en `http://localhost:8080`.

### Correr tests

```bash
npm test --workspaces --if-present     # todos
npm test --workspace services/auth     # uno solo
npm test --workspace gateway
```

### Deploy a GCP

```bash
gcloud builds submit --config infra/ci/cloudbuild.yaml \
  --substitutions _REGION=us-central1,_REGISTRY=us-central1-docker.pkg.dev/g3-prod/g3
```

El pipeline construye los 8 servicios en paralelo, los sube a Artifact
Registry, despliega cada uno como un Cloud Run service independiente
(IAM auth interno) y finalmente despliega el gateway como
`allow-unauthenticated`.

## DB-per-service lógico

Una sola instancia Cloud SQL Postgres con **un schema por servicio** +
**un rol DB por servicio**:

```
g3.auth.*       ← g3_auth_svc
g3.billing.*    ← g3_billing_svc
g3.drivers.*    ← g3_drivers_svc
...
```

Ningún servicio puede leer tablas de otro. Si en V2 hace falta separar
físicamente, sólo cambia la connection string — la lógica no se toca.

## Roadmap

| Fase | Estado |
|---|---|
| V1 · Microservicios + tier gating + TDD | ✅ |
| V1.1 · TypeORM repos contra Postgres real | Pendiente (in-memory repos hoy) |
| V1.2 · Stripe real (provider implementa BillingProvider) | Pendiente |
| V1.3 · Vertex AI Gemini conectado al ai-service | Pendiente |
| V2 · Scoring engine consumiendo Pub/Sub | Plan |
| V2 · BigQuery sink (Dataflow stream) | Plan |
