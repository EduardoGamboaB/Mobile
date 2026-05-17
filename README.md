# G3 Logistics — Mobile App

Aplicación móvil cross-platform (iOS / Android) para operadores de tráiler de **G3 Logistics**.
Permite al chofer iniciar sesión, gestionar su perfil, registrar viajes, llevar bitácora, subir
evidencias y reportar incidencias — diseñada para funcionar en carretera con conectividad
intermitente.

---

## Stack recomendado (MVP)

| Capa            | Tecnología                                        | Por qué                                          |
|-----------------|---------------------------------------------------|--------------------------------------------------|
| Mobile          | **React Native + Expo (TypeScript)**              | Un solo código para iOS/Android, OTA updates, módulos nativos listos (cámara, GPS, almacenamiento). |
| Backend         | **Supabase** (Postgres + Auth + Storage)          | Backend completo en una plataforma, RLS para seguridad, escalable, sin servidor que mantener en V1. |
| Base de datos   | **PostgreSQL** (gestionado por Supabase)          | SQL maduro, relacional, listo para reportería futura. |
| Auth            | **Supabase Auth** (email + teléfono/OTP)          | Multi-método, JWT, integrado con RLS.            |
| State server    | **TanStack Query** (`@tanstack/react-query`)      | Caché, refetch, reintentos, offline.             |
| State cliente   | **Zustand**                                       | Minimal, sin boilerplate.                        |
| Storage local   | **expo-secure-store** + **AsyncStorage** + **expo-sqlite** | Tokens seguros + cola offline + bitácoras locales. |
| Navegación      | **React Navigation** (stack + bottom tabs)        | Estándar de React Native.                        |
| Maps / GPS      | **expo-location** + **react-native-maps**         | Ubicación y mapas.                               |
| Cámara          | **expo-image-picker** + **expo-camera**           | Evidencias fotográficas.                         |

> **Por qué no NestJS de inicio:** Supabase nos da Auth + DB + Storage + Realtime sin escribir
> servidor. Cuando V2 requiera lógica de negocio compleja (autorizaciones de pago, integraciones
> con SAT, cálculo de rentabilidad), añadimos un servicio NestJS que consume el mismo Postgres.

---

## Estructura del monorepo

```
/
├── README.md                       ← este archivo
├── docs/                           ← arquitectura, modelo, user stories, roadmap
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── USER_STORIES.md
│   ├── API_ENDPOINTS.md
│   ├── SCREENS.md
│   └── ROADMAP.md
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql ← tablas, RLS, storage buckets
└── mobile/                         ← app React Native + Expo
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── api/                    ← cliente Supabase + repositorios
        ├── components/             ← UI compartido
        ├── constants/              ← enums, configuración
        ├── hooks/                  ← hooks reutilizables
        ├── models/                 ← tipos TS del dominio
        ├── navigation/             ← stacks y tabs
        ├── screens/                ← pantallas (auth, dashboard, trip, …)
        ├── services/               ← lógica de offline, evidencia, ubicación
        ├── stores/                 ← Zustand stores
        ├── theme/                  ← colores, tipografía, espaciado
        └── utils/                  ← helpers
```

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

```bash
# 1. Variables de entorno
cp mobile/.env.example mobile/.env
# rellenar SUPABASE_URL y SUPABASE_ANON_KEY

# 2. Instalar
cd mobile
npm install

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
