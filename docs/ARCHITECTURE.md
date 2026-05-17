# Arquitectura — G3 Logistics Mobile

## 1. Vista de alto nivel

```
┌──────────────────────────────────────────────────────────────────┐
│                    APP MÓVIL (React Native + Expo)              │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Screens  │→ │  Hooks   │→ │   Services    │→ │ Repositories │ │
│  │  (UI)    │  │  (logic) │  │ (offline,GPS) │  │  (Supabase)  │ │
│  └────┬─────┘  └─────┬────┘  └───────┬───────┘  └──────┬───────┘ │
│       │              │               │                  │         │
│       └──────────────┴──────┬────────┴──────────────────┘         │
│                             │                                     │
│                       ┌─────▼─────┐    ┌──────────────────┐      │
│                       │  Zustand  │    │  Local Storage   │      │
│                       │  Stores   │    │ (SQLite + Async) │      │
│                       └───────────┘    └──────────────────┘      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS (REST + Realtime)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                            SUPABASE                              │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ PostgreSQL  │  │   Auth   │  │ Storage  │  │   Realtime   │  │
│  │  + RLS      │  │ (JWT)    │  │ (S3-like)│  │ (WebSockets) │  │
│  └─────────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│        ▲                                                          │
│        │ futuro                                                   │
│  ┌─────┴────────────┐   ┌────────────────────────┐               │
│  │ Edge Functions   │   │  NestJS service (V2)   │               │
│  │ (webhooks SAT,   │   │  rentabilidad,         │               │
│  │  notificaciones) │   │  liquidación pagos     │               │
│  └──────────────────┘   └────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                        ┌─────────┴─────────┐
                        │  PANEL WEB ADMIN  │   (Next.js, post-MVP)
                        │  Despacho / Admin │
                        └───────────────────┘
```

## 2. Separación por capas (mobile)

| Capa              | Carpeta                | Responsabilidad                                              |
|-------------------|------------------------|--------------------------------------------------------------|
| **UI**            | `screens/`, `components/` | Render, eventos de usuario, sin lógica de negocio.        |
| **Navegación**    | `navigation/`          | Stacks, tabs, deep-links.                                    |
| **Estado cliente**| `stores/`              | Sesión, viaje activo, configuración. Zustand.                |
| **Estado servidor** | `hooks/queries/`     | Wrappers TanStack Query → repositorios.                      |
| **Servicios**     | `services/`            | GPS, cámara, sync offline, notificaciones.                   |
| **API / Repos**   | `api/`                 | Cliente Supabase + funciones tipadas por entidad.            |
| **Modelos**       | `models/`              | Tipos TypeScript del dominio (espejo de la DB).              |
| **Tema**          | `theme/`               | Tokens visuales (colores, espaciados, tipografía).           |
| **Utils**         | `utils/`               | Helpers puros (fechas, formato, validación).                 |

**Regla de dependencia:** UI → Hooks → Services → API → Supabase.
Nunca al revés. Nunca un componente importa directamente `supabase`.

## 3. Modo offline

La conectividad en carretera es intermitente. La app debe ser usable sin red.

**Estrategia:**

1. **Lectura:** TanStack Query con `staleTime` largo y persistencia en `AsyncStorage`.
   Los viajes asignados al chofer se prefetchean al login.

2. **Escritura crítica (bitácora, incidencias):**
   - Se persiste inmediatamente en SQLite local (`expo-sqlite`) con `status = 'pending'`.
   - Un servicio `SyncService` corre en background (`NetInfo` + foco de app) y reintenta.
   - Al sincronizarse, marca `status = 'synced'` y conserva el registro local 7 días.

3. **Evidencias (fotos):**
   - Se guardan en `FileSystem.documentDirectory/evidence/` con UUID.
   - Se intentan subir a Supabase Storage; si falla, quedan en cola.
   - La UI muestra badge "pendiente de subir" hasta confirmación.

4. **Resolución de conflictos:** Las bitácoras son *append-only* (un chofer no edita eventos
   ajenos), así que no hay merge. Cada evento lleva `client_uuid` para idempotencia.

## 4. Autenticación y autorización

- **Sign-in:** Supabase Auth con teléfono + OTP (preferido para choferes) y email/password como
  alternativa para admins.
- **Sesión:** JWT en `expo-secure-store`. Refresh automático.
- **Roles:** Tabla `profiles` con columna `role` enum (`driver`, `dispatcher`, `admin`).
- **Autorización en DB:** Row Level Security en Postgres. El chofer SOLO ve sus viajes:

  ```sql
  CREATE POLICY "drivers see own trips"
  ON trips FOR SELECT
  USING (driver_id = auth.uid());
  ```

## 5. Seguridad

- Tokens en SecureStore (Keychain iOS / Keystore Android), nunca en AsyncStorage.
- RLS activado en todas las tablas.
- Storage buckets privados; URLs firmadas con expiración corta para evidencias.
- Sanitización de inputs y validación con Zod antes de enviar.
- Sin secretos en el bundle: solo `SUPABASE_URL` y `ANON_KEY` (públicas por diseño).

## 6. Escalabilidad

| Vector             | Estrategia                                                          |
|--------------------|---------------------------------------------------------------------|
| Más usuarios       | Supabase escala vertical/horizontal. RLS no degrada con volumen.    |
| Más lógica         | Edge Functions (Deno) para casos simples, NestJS para complejos.    |
| Reportería         | Postgres + read replicas + Metabase/Supabase Dashboard.             |
| Tiempo real        | Supabase Realtime para "viajes en curso" en panel de despacho.      |
| Multi-tenant       | Columna `company_id` en todas las tablas; RLS por `company_id`.     |

## 7. Observabilidad

- **Crashes:** Sentry (`sentry-expo`).
- **Logs:** structured logging → Supabase tabla `app_logs` (samplado).
- **Métricas de uso:** PostHog o Amplitude (post-MVP).
