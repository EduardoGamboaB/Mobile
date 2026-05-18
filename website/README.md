# G3 Website

Sitio público de G3 Logistics — landing, productos (G3 Admin y G3 Drive),
precios y contacto. Mismo stack que el panel admin (Next.js 14 con
`output: 'export'`) para deployar como estático a Cloud Storage + CDN.

## Estructura

```
website/
├── app/
│   ├── page.tsx                  Home (hero + value props + productos + pricing + CTA)
│   ├── productos/
│   │   ├── admin/page.tsx        G3 Admin — panel web para owners/dispatchers
│   │   └── drive/page.tsx        G3 Drive — app móvil para conductores
│   ├── precios/page.tsx          Tabla detallada + FAQ
│   ├── contacto/page.tsx         Formulario + emails + WhatsApp
│   ├── layout.tsx                Header + Footer + metadata
│   └── globals.css               Design system completo
├── components/
│   ├── Brand.tsx · Header.tsx · Footer.tsx
│   ├── Icon.tsx                  12 íconos SVG inline (sin dependencias)
│   └── PricingTable.tsx          Refleja el catálogo @g3/contracts
├── deploy/deploy.sh              Build estático → gs://bucket → CDN invalidation
└── next.config.js                output: 'export'
```

## Paleta

- Navy `#0a1633` corporativo, transmite confianza
- Naranja carretera `#FF7A45` para CTAs y acentos
- Tipografía system-stack para máxima velocidad sin cargar fuentes remotas

## Desarrollo

```bash
cd website
npm install
npm run dev          # http://localhost:3002
npm run typecheck
npm run build        # genera /out
```

## Deploy

```bash
PROJECT_ID=g3-prod BUCKET=g3-website-prod ./deploy/deploy.sh
```

Configura cache-control diferenciado:
- Assets con hash (`/_next/static/*`): `max-age=31536000, immutable`
- HTML: `max-age=0, must-revalidate` (deploys se ven inmediato)

## Coherencia con la suite

La tabla de precios refleja exactamente los 5 tiers definidos en
`backend/contracts/src/tiers.ts`. Si cambias precios o features ahí,
actualiza también `components/PricingTable.tsx` y la tabla detallada
en `app/precios/page.tsx`.
