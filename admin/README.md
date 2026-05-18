# G3 Admin · Front-end

Panel web de administración logística del ecosistema **G3 Logistics**. Réplica
en web del modelo de tiers de G3 Drive (mobile), con módulos de monitoreo,
gestión de tractos y remolques, operadores y asignación de viajes.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Zustand** para state global (auth · tier · theme)
- Static export (`next.config.js` con `output: 'export'`) → deploy en
  Cloud Run, Cloudflare Pages, Vercel o cualquier CDN
- Diseño propio sin frameworks de CSS: variables CSS + `data-theme=dark`
  para modo nocturno reactivo
- Iconografía SVG outline (Lucide-style) inline en `components/Icons.tsx`

## Estructura

```
admin/
├── app/
│   ├── (dash)/
│   │   ├── dashboard/         · Resumen operativo
│   │   ├── monitor/           · Centro de operaciones tiempo real
│   │   ├── trips/             · Listado, detalle [id] y wizard /new
│   │   ├── drivers/           · Operadores listado + detalle [id]
│   │   ├── fleet/
│   │   │   ├── tractors/      · Listado + detalle [id]
│   │   │   └── trailers/      · Listado + detalle [id]
│   │   ├── plans/             · Comparativa de tiers (match G3 Drive)
│   │   └── settings/          · Compañía, modo nocturno, etc.
│   ├── login/                 · Split layout enterprise
│   ├── layout.tsx             · Root con bootstrap del store
│   └── globals.css            · Design system completo
├── components/
│   ├── Sidebar.tsx            · Navegación con badges y feature gating
│   ├── TopBar.tsx             · Search + tier + theme + perfil
│   └── Icons.tsx              · SVG outline icon library
└── lib/
    ├── tiers.ts               · Catálogo de los 5 tiers + feature flags
    ├── demoData.ts            · Compañía G3 Logistics (modo demo)
    └── store.ts               · Zustand: auth + tier + night theme
```

## Módulos

| Módulo | Ruta | Tier requerido |
|---|---|---|
| Resumen operativo (KPIs · fleet map · acciones pendientes · AI Insights) | `/dashboard` | Free |
| Monitoreo y alertamiento tiempo real | `/monitor` | Free |
| Gestión de viajes (CRUD + asignación) | `/trips` · `/trips/new` | Free |
| Detalle de viaje (timeline · POD · pagos) | `/trips/[id]` | Free |
| Gestión de operadores | `/drivers` · `/drivers/[id]` | Free |
| Gestión de tractos | `/fleet/tractors` · `/fleet/tractors/[id]` | Free |
| Gestión de remolques | `/fleet/trailers` · `/fleet/trailers/[id]` | Free |
| Mapa de flotilla en vivo | `/dashboard` (embed) | **Pro** |
| Scoring de operadores | `/drivers` (columna) | **Pro** |
| AI Insights | `/dashboard` (panel inferior) | **Pro** |
| Autorización de pagos | `/trips/[id]` (botón) | **Starter** |
| API + integración ERP | (futuro) | **Business** |
| Data Lake export · modelos predictivos | (futuro) | **Enterprise** |

## Arquitectura de tiers

Catálogo en `lib/tiers.ts`. Cinco tiers (Free → Enterprise) con 14 feature flags
admin-specific. El sidebar muestra candado en items no incluidos, dashboard
sustituye módulos Pro+ por `UpgradeCard` si el tier es insuficiente.

El cambio de tier persiste en `localStorage` (`g3admin.tier.v1`). En producción
vendrá del backend tras el checkout (Stripe / Conekta).

## Cómo arrancar

```bash
npm install --ignore-scripts
npm run dev    # http://localhost:3001
```

Build estático:

```bash
npm run build  # → out/ listo para cualquier CDN
```

## Modo demo

La app arranca con compañía simulada **G3 Logistics**: 6 operadores, 7 tractores
(Kenworth T680/T880, Freightliner Cascadia, International LT, Volvo VNL),
9 remolques (8 tipos: jaula 42", caja 53"/48", refrigerado, tolva, tanque,
plataforma, lowboy), 10 viajes con clientes reales (Cementos Mexicanos, Bimbo,
Coca-Cola FEMSA, Soriana, Walmart, Pemex, Lala) y 9 alertas operativas.

## Próximos pasos

Conectar al backend GCP cuando esté disponible (otro repo):
- `lib/demoData.ts` → llamadas REST a Cloud Run
- `lib/store.ts` hidrata el tier desde `/api/me` en lugar de localStorage
- `lib/tiers.ts` se extrae a paquete compartido `@g3/contracts` consumible por
  mobile + admin + backend
