# G3 Backend

API multi-tenant del ecosistema **G3 Logistics**. Soporta los dos productos
del frente (G3 Drive móvil y G3 Admin web) y administra la adquisición de
tiers que dicta qué features ve cada usuario.

## Visión arquitectónica

```
┌────────────────────┐   ┌──────────────────────┐
│  G3 Drive (mobile) │   │  G3 Admin (web)      │
└──────────┬─────────┘   └──────────┬───────────┘
           │     HTTPS              │
           ▼                        ▼
    ┌──────────────────────────────────────┐
    │     G3 Backend (Cloud Run)           │
    │  NestJS · TypeScript · TypeORM       │
    │  - Auth JWT + multi-tenant           │
    │  - Tier guard (Stripe + features)    │
    │  - Domain modules                    │
    │  - AI router (Vertex / Stub)         │
    │  - Event bus → Pub/Sub               │
    └────┬─────────┬──────────┬────────────┘
         │         │          │
   Cloud SQL   Pub/Sub    Vertex AI
   Postgres   ↓
              BigQuery (data lake → scoring)
```

## Stack

- **NestJS 10** + TypeScript estricto
- **PostgreSQL** (Cloud SQL en prod) + **TypeORM** con migraciones
- **JWT** auth con refresh tokens
- **Stripe** para billing (provider pluggable)
- **Google Cloud Pub/Sub** para eventos de dominio
- **Vertex AI** (Gemini) como proveedor primario para los 6 agentes IA;
  `StubAIProvider` como fallback determinista en dev/test
- **Cloud Run** para el runtime (multi-stage Dockerfile, escala 0→20)
- **Cloud Build** + **Artifact Registry** para CI/CD
- **Secret Manager** para credenciales

## Multi-tenant: cómo funciona el aislamiento

1. Cada entidad de negocio (`Trip`, `Driver`, `Tractor`, `Trailer`, `Alert`,
   `User`, `Subscription`) hereda de **`TenantEntity`** y obliga columna
   `company_id` indexada.
2. Al hacer login, el JWT lleva `companyId` y `tier`. El
   **`TenantInterceptor`** lo inyecta en `req.companyId`.
3. Todos los servicios filtran por `companyId` en sus queries. El
   **`@CurrentCompany()`** decorator lo extrae limpio en cada controller.
4. Postgres tiene **Row Level Security** habilitada en las tablas
   sensibles (ver migración `1700000000000-init.ts`) como defensa en
   profundidad.

## Sistema de tiers — el motor comercial

```
src/shared/tiers.ts      Catálogo de tiers + 28 feature flags
                         (mismo archivo que mobile + admin)
src/common/decorators/
  └ require-feature.decorator.ts    @RequireFeature(Feature.X)
src/common/guards/
  └ tier-feature.guard.ts           Bloquea 402 si tier insuficiente
src/modules/subscriptions/          Stripe + ciclo de vida del plan
src/modules/webhooks/stripe.*       Sincroniza BD tras pagos
```

### Cómo gated un endpoint

```ts
@Controller('trips')
export class TripsController {
  // …

  @RequireFeature(Feature.PaymentAuthorization)   // ← gate
  @Post(':id/release-payment')
  release(...) { return this.trips.releasePayment(...); }
}
```

Cuando un cliente Free intenta liberar pago, el guard responde:

```json
{
  "statusCode": 402,
  "error": "Upgrade required",
  "message": "Tu plan actual no incluye esta funcionalidad…",
  "currentTier": "free",
  "missingFeatures": ["payment_authorization"],
  "suggestedUpgrade": "starter",
  "upgradeUrl": "/subscriptions/checkout"
}
```

Tanto la app móvil como el admin pueden detectar el 402 y abrir
automáticamente el flujo de upgrade — sin lógica adicional en el cliente.

## Tiers

| Tier | $ MXN/u·mes | Unidades | Usuarios | Viajes/mes |
|---|---:|---:|---:|---:|
| Free | 0 | 1 | 1 | 20 |
| Starter | 349 | 3 | 2 | 100 |
| Pro | 899 | 5 | 5 | 500 |
| Business | 2,499 | 30 | 20 | 5,000 |
| Enterprise | Cotización | ∞ | ∞ | ∞ |

## Endpoints principales

| Método | Endpoint | Tier requerido |
|---|---|---|
| POST | `/api/auth/register-company` | público |
| POST | `/api/auth/login` | público |
| POST | `/api/auth/refresh` | público |
| GET | `/api/companies/me` | Free+ |
| GET | `/api/subscriptions/me` | Free+ |
| GET | `/api/subscriptions/catalog` | Free+ |
| POST | `/api/subscriptions/checkout` | Free+ (Stripe) |
| POST | `/api/subscriptions/cancel` | Free+ |
| GET POST PATCH DELETE | `/api/drivers/*` | Free+ |
| GET POST PATCH DELETE | `/api/tractors/*` | Free+ |
| GET | `/api/tractors/live/positions` | **Pro+** (FleetMap) |
| GET POST PATCH DELETE | `/api/trailers/*` | Free+ |
| GET POST | `/api/trips/*` | Free+ |
| PATCH | `/api/trips/:id/status` | Free+ |
| POST | `/api/trips/:id/release-payment` | **Starter+** |
| GET POST | `/api/alerts/*` | Free+ |
| POST | `/api/ai/classify-logbook` | **Pro+** |
| POST | `/api/ai/extract-evidence` | **Starter+** |
| POST | `/api/ai/route-incident` | **Pro+** |
| POST | `/api/ai/assistant-reply` | **Pro+** |
| POST | `/api/ai/analyze-inspection-photo` | **Pro+** |
| POST | `/api/webhooks/stripe` | público (firma) |
| GET | `/health` | público |
| GET | `/docs` | dev/staging |

## Cómo arrancar (local)

```bash
# 1. Postgres local (docker)
docker run -d --name g3-pg -e POSTGRES_USER=g3 -e POSTGRES_PASSWORD=g3 -e POSTGRES_DB=g3 -p 5432:5432 postgres:16

# 2. Variables
cp .env.example .env
# generar dos secrets de 32+ chars y pegarlos en JWT_SECRET y JWT_REFRESH_SECRET

# 3. Dependencias y migración
npm install
npm run migration:run

# 4. Arrancar
npm run start:dev
# Swagger en http://localhost:8080/docs
```

## Despliegue a GCP

```bash
# 1. Setup inicial (1 sola vez por proyecto)
PROJECT_ID=g3-logistics-prod REGION=us-central1 ./deploy/gcp-setup.sh

# 2. Crear schemas BigQuery
bq query --use_legacy_sql=false < deploy/bigquery-schemas.sql

# 3. Build & deploy
gcloud builds submit --config cloudbuild.yaml
```

El pipeline de Cloud Build:
1. Construye la imagen Docker multi-stage
2. La sube a Artifact Registry
3. Despliega a Cloud Run con Cloud SQL adjunto via socket Unix
4. Ejecuta migraciones como Cloud Run Job

## Eventos de dominio

`EventsService` publica a `g3-domain-events` (Pub/Sub) cada vez que algo
relevante pasa. Topics:

| Topic | Productor | Consumidores |
|---|---|---|
| `g3-domain-events` | Backend | BigQuery sink, Scoring engine, Notifier |
| `g3-alerts` | Backend, móvil (vía API) | Notifier (push, WhatsApp, email) |

Eventos emitidos hoy:

```
subscription.started
subscription.checkout_created
subscription.upgraded
subscription.downgraded
subscription.cancel_scheduled
trip.created
trip.status_changed
trip.payment_released
ai.<method>.ok
ai.<method>.fallback
```

## AI · 6 agentes G3 AI-First

```
src/modules/ai/
├── types.ts                Contratos (= mobile/services/ai/types.ts)
├── providers/
│   ├── stub.provider.ts    Implementación determinista local
│   └── vertex.provider.ts  Adapter para Vertex AI (Gemini)
├── ai.service.ts           Router con fallback transparente al stub
├── ai.controller.ts        Endpoints REST gateados por tier
└── ai.module.ts
```

Toggleable por env: `AI_PROVIDER=stub|vertex`. El service envuelve
cada llamada en un `try/catch` y hace fallback al stub si el provider
real falla — la UX del chofer nunca se rompe.

## Roadmap interno

| Fase | Estado |
|---|---|
| V1 · Auth + tiers + dominios + Stripe + AI stub | ✅ |
| V1.1 · Vertex AI Gemini real conectado | Pendiente API enable + npm i @google-cloud/vertexai |
| V2 · Scoring engine como Cloud Function escuchando Pub/Sub | Plan |
| V2 · BigQuery sink real (Dataflow stream) | Plan |
| V3 · Marketplace de choferes (Fase 2 del roadmap G3) | Plan |
| V3 · Marketplace de asistencia carretera (Fase 3) | Plan |
| V4 · Marketplace de fletes + servicios financieros (Fases 4-5) | Plan |

## Estructura

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── shared/tiers.ts           ← @g3/contracts (futuro)
│   ├── common/
│   │   ├── decorators/           CurrentUser · CurrentCompany · RequireFeature · Roles · Public
│   │   ├── guards/               JwtAuth · TierFeature · Role
│   │   ├── interceptors/         Tenant · Logging
│   │   ├── filters/              GlobalException
│   │   └── health.controller.ts
│   ├── config/env.schema.ts      Zod validation
│   ├── database/
│   │   ├── data-source.ts
│   │   ├── entities/             BaseEntity + TenantEntity
│   │   └── migrations/
│   └── modules/
│       ├── auth/                 JWT + register-company
│       ├── companies/            Tenant root
│       ├── users/
│       ├── subscriptions/        Stripe + tier lifecycle
│       ├── webhooks/             Stripe webhook handler
│       ├── drivers/              + limit enforcement
│       ├── tractors/             + limit + FleetMap gating
│       ├── trailers/
│       ├── trips/                + limit + payment release gating
│       ├── alerts/               + Pub/Sub publish
│       ├── events/               Bus a Pub/Sub
│       └── ai/                   6 agentes + provider router
├── deploy/
│   ├── service.yaml              Cloud Run manifest
│   ├── gcp-setup.sh              Provisión inicial idempotente
│   └── bigquery-schemas.sql      Data lake
├── Dockerfile                    Multi-stage runtime
├── cloudbuild.yaml               CI/CD pipeline
├── .env.example
└── README.md
```

## Multi-empresa

Cualquier compañía se onboarda por `POST /api/auth/register-company` con un
único request. Eso crea:

1. Una fila en `companies`
2. Un `owner` en `users`
3. Una `subscription` en tier `free` con límite de 1 unidad
4. Un evento `subscription.started`

A partir de ahí cada request del owner llega con `companyId` en el JWT y
todo el sistema lo respeta. Para invitar más usuarios la compañía debe
estar en **Business+** (feature `multi_user`).
