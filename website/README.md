# G3 Logistics — Sitio corporativo

Sitio público de **G3 Logistics**, empresa mexicana de transporte terrestre
de carga. Es un sitio informativo — sirve para atraer nuevos clientes de
flete, no para comercializar productos SaaS. Los productos G3 Admin y
G3 Drive viven en su propio sitio separado.

Stack: Next.js 14 con `output: 'export'` → deploy estático a Cloud
Storage + Cloud CDN.

## Estructura

```
website/
├── app/
│   ├── page.tsx          Home (hero + servicios + diferenciadores + sectores + CTA)
│   ├── servicios/        Detalle: seca, refrigerada, sobredim., dedicado + cobertura + NOM
│   ├── nosotros/         Historia, cifras, principios, cumplimiento
│   ├── contacto/         Formulario de cotización + emails + direcciones
│   ├── layout.tsx        Header + Footer + metadata + JSON-LD MovingCompany
│   └── globals.css       Design system Mobile First
├── components/
│   ├── Brand.tsx · Header.tsx · Footer.tsx
│   └── Icon.tsx          Íconos SVG inline (sin dependencias externas)
├── deploy/deploy.sh      Build estático → gs://bucket → CDN invalidation
├── QA-REPORT.md          Reporte de QA Mobile First
└── next.config.js        output: 'export'
```

## Rutas publicadas

| Ruta                    | Enfoque                                                         |
|-------------------------|-----------------------------------------------------------------|
| `/`                     | Home comercial — quiénes somos y qué movemos                    |
| `/servicios/`           | Detalle de servicios + cobertura + cumplimiento NOM             |
| `/servicios/#cobertura` | Ancla a la sección de cobertura y rutas                         |
| `/nosotros/`            | Historia, cifras operativas, principios, certificaciones        |
| `/contacto/`            | Formulario único de cotización + emails segmentados             |

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

## Mobile First

Todo el CSS parte de 320px y sube por `min-width`
(480 · 768 · 1024 · 1280 · 1440). Ver `QA-REPORT.md` para el detalle
del testing.

## Separación de sitios

- **g3logistics.mx** — este sitio, informativo, transportista.
- **g3admin.mx / g3drive.mx** (próximo) — sitio de los productos SaaS
  para transportistas externos.

## Formulario de contacto (GCP)

El formulario envía cada solicitud a **fletes@g3logistics.mx** y la registra en
**HubSpot** (contacto + nota) mediante la Cloud Run function `g3-contacto`
(`functions/contacto/`). Despliegue e instrucciones
de SMTP en [`functions/contacto/README.md`](functions/contacto/README.md).
`deploy/deploy.sh` toma la URL de la función automáticamente; sin función
desplegada (desarrollo), el formulario abre WhatsApp con la solicitud.

## Datos del negocio, SEO local y GEO

- `lib/site.ts` es la fuente única de nombre, teléfono/WhatsApp
  (+52 668 125 5045), correos, ubicación (Los Mochis, Sinaloa), horario y
  coordenadas. Todo el sitio y los datos estructurados leen de ahí.
- `app/layout.tsx`: títulos y descripciones locales, etiquetas `geo.*`,
  Open Graph con `public/og-g3logistics.jpg` y JSON-LD `LocalBusiness` +
  `WebSite`.
- `components/Faq.tsx`: preguntas frecuentes con JSON-LD `FAQPage`.
- `public/sitemap.xml`, `public/robots.txt` y `public/llms.txt` (resumen para
  buscadores con IA).

## Blog

Cada artículo es un archivo Markdown en `content/blog/<slug>.md`; el nombre del
archivo es la URL (`/blog/<slug>/`). Copia `content/blog/_plantilla.md` (los
archivos que empiezan con `_` no se publican), llena el encabezado y escribe el
contenido. Al compilar se generan la página del artículo, su ficha para Google
(BlogPosting), el listado `/blog/`, el feed `/blog/rss.xml` y el `sitemap.xml`.

## Aviso de privacidad y términos

`/aviso-de-privacidad/` y `/terminos-y-condiciones/`. Los datos del responsable
salen de `LEGAL` en `lib/site.ts`: **falta poner la razón social y el domicilio
completo**, que la ley exige en el aviso de privacidad. Revisa los textos con un
abogado antes de publicar.
