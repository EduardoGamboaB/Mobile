# G3 Logistics — Monorepo

Ecosistema completo de **G3 Logistics**: app móvil para choferes (**G3 Drive**),
panel web de administración (**G3 Admin**) y API multi-tenant en GCP (**G3 Backend**).
Los tres proyectos comparten catálogo de tiers y feature flags, y se integran via
HTTP con interceptor 402 → upgrade automático.

```
┌────────────────────┐   ┌──────────────────────┐
│  G3 Drive (mobile) │   │  G3 Admin (web)      │
│  RN + Expo         │   │  Next.js 14          │
└──────────┬─────────┘   └──────────┬───────────┘
           │     HTTPS              │
           ▼                        ▼
    ┌──────────────────────────────────────┐
    │     G3 Backend (Cloud Run)           │
    │  NestJS · TypeScript · TypeORM       │
    │  Postgres · Stripe · Pub/Sub · Vertex│
    └──────────────────────────────────────┘
```

## Estructura del monorepo

```
/
├── README.md                       ← este archivo
├── docs/                           ← arquitectura, modelo, user stories, roadmap
├── mobile/                         ← G3 Drive · React Native + Expo
│   ├── src/api/g3/                   cliente HTTP tipado del backend
│   ├── src/services/ai/              router stub ↔ HTTP de los 6 agentes IA
│   ├── src/stores/                   Zustand (auth, subscription, theme)
│   ├── __tests__/                    49 tests (unit + e2e con fetch mock)
│   └── ...
├── backend/                        ← G3 Backend · NestJS
│   ├── src/
│   │   ├── shared/tiers.ts           catálogo de 5 tiers + 28 features
│   │   ├── common/guards/            JwtAuth · TierFeature (402) · Role
│   │   ├── database/                 entities + migraciones + RLS
│   │   └── modules/                  auth, subscriptions, drivers, tractors,
│   │                                 trailers, trips, alerts, ai, events,
│   │                                 webhooks (Stripe), companies, users
│   ├── deploy/                       gcp-setup.sh · bigquery-schemas.sql ·
│   │                                 service.yaml (Cloud Run)
│   ├── Dockerfile · cloudbuild.yaml  CI/CD a Cloud Run + Cloud SQL
│   └── README.md
├── admin/                          ← G3 Admin · Next.js 14
│   ├── app/                          App Router (dashboard, trips, fleet,
│   │                                 drivers, monitor, plans, settings)
│   ├── lib/api/                      cliente HTTP G3 (mismo patrón que mobile)
│   ├── lib/store.ts                  Zustand con tier sync + JWT
│   ├── __tests__/                    18 tests (unit + e2e dispatcher flow)
│   └── README.md
└── supabase/                       ← migraciones legacy (V1 sin backend propio)
```

## Cómo se integran los tres

1. **Catálogo de tiers compartido** — `mobile/src/constants/tiers.ts`,
   `admin/lib/tiers.ts` y `backend/src/shared/tiers.ts` definen los mismos
   5 tiers (Free, Starter $349, Pro $899, Business $2,499, Enterprise) y
   las features que cada uno desbloquea.
2. **Gating uniforme** — el backend protege endpoints con `@RequireFeature(...)`.
   Si el tier del usuario no incluye la feature, responde **HTTP 402** con
   `{currentTier, missingFeatures, suggestedUpgrade, upgradeUrl}`.
3. **Detección en frontend** — el cliente HTTP (`api/g3/client.ts` en mobile,
   `lib/api/client.ts` en admin) escucha 402 y dispara `onUpgradeRequired`:
   en mobile navega a la pantalla **Plans**; en admin abre el modal de upgrade.
4. **Sync de tier** — tras un checkout exitoso (webhook Stripe →
   `subscription.applyTier`), el frontend llama `/api/subscriptions/me` y
   actualiza el store local. El siguiente request ya pasa el gate.
5. **AI router con fallback** — `services/ai/index.ts` (mobile) y `lib/api`
   (admin) eligen entre **stub local** (demo) y **HTTP real** según
   `EXPO_PUBLIC_G3_API_URL` / `NEXT_PUBLIC_G3_API_URL`. El backend mismo
   hace fallback al stub si Vertex AI falla.

## Quick start

| Proyecto | Setup |
|---|---|
| **Mobile** | `cd mobile && npm install && npx expo start` |
| **Backend** | `cd backend && npm install && npm run migration:run && npm run start:dev` |
| **Admin** | `cd admin && npm install && npm run dev` |

Cada subdirectorio tiene su propio README con detalles de despliegue,
variables de entorno y comandos. El backend incluye scripts de provisión
idempotentes para GCP en `backend/deploy/`.

## Suite de pruebas end-to-end

| Proyecto | Suites | Tests | Comando |
|---|---:|---:|---|
| Mobile | 12 | **49** | `cd mobile && npm test` |
| Admin | 4 | **18** | `cd admin && npm test` |

Cubren: registro multi-empresa, sync de tier, ciclo completo de viaje
(`assigned → in_transit → arrived → delivered → paid`), 402 → checkout →
tier actualizado, gating de FleetMap y PaymentAuthorization, OCR de
evidencia vía IA, multi-tenant con companyId distinto por sesión, refresh
automático de JWT en 401, y switch live/demo del módulo IA. Todos los
tests usan `fetch` mockeado — no requieren red, DB ni emulador.

---

## Stack original (referencia histórica V1)

| Capa            | Tecnología                                        |
|-----------------|---------------------------------------------------|
| Mobile          | React Native + Expo (TypeScript)                  |
| Backend         | Supabase (Postgres + Auth + Storage) → NestJS en GCP en V2 |
| Base de datos   | PostgreSQL (Cloud SQL en V2)                      |
| Auth            | Supabase Auth → JWT propio en backend G3          |
| State server    | TanStack Query                                    |
| State cliente   | Zustand                                           |
| Storage local   | expo-secure-store + AsyncStorage + expo-sqlite    |
| Navegación      | React Navigation                                  |
| Maps / GPS      | expo-location + react-native-maps                 |
| Cámara          | expo-image-picker + expo-camera                   |



---

## Roadmap MVP (resumen)

- **Fase 0 — Setup** (1 sem): repo, Supabase, identidad visual, CI.
- **Fase 1 — Auth + Perfil** (1 sem).
- **Fase 2 — Viajes + Dashboard** (2 sem).
- **Fase 3 — Bitácora + Evidencias** (2 sem).
- **Fase 4 — Incidencias + Offline robusto** (1 sem).
- **Fase 5 — Hardening + Beta interna** (1 sem).
- **Fase 6 — Panel web admin** (post-MVP).

Detalle completo en [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Cómo arrancar (desarrollo)

### Modo demo (sin backend)

Si **no** configuras `.env`, la app arranca automáticamente en **modo demo** con datos
ficticios en memoria — útil para revisar UI y flujos sin montar Supabase. Verás un
banner rojo "MODO DEMO" arriba de cada pantalla y un botón "ENTRAR EN MODO DEMO" en
el login.

```bash
cd mobile
npm install --ignore-scripts
npx expo start
# escanear QR con Expo Go → tocar "ENTRAR EN MODO DEMO"
```

Forzar el modo demo aunque haya credenciales: `EXPO_PUBLIC_DEMO=1`.

### Con Supabase real

```bash
# 1. Variables de entorno
cp mobile/.env.example mobile/.env
# rellenar SUPABASE_URL y SUPABASE_ANON_KEY

# 2. Instalar
cd mobile
npm install --ignore-scripts

# 3. Correr
npx expo start
# → escanear QR con Expo Go (Android/iOS) o pulsar `a` / `i`
```

Para la base de datos:

```bash
# Con Supabase CLI ya logueado
supabase db push       # aplica supabase/migrations/0001_initial_schema.sql
```

---

## Identidad visual

- **Primario:** azul petróleo `#0E3A4C`
- **Acento:** rojo oscuro `#9B2C2C`
- **Neutros:** negro `#0B0B0B`, grafito `#1F2937`, gris `#6B7280`, hueso `#F5F5F4`
- **Tipografía:** Inter / system default
- **Tono UI:** rudo, alto contraste, botones grandes (≥48 dp), labels claros en mayúsculas.
