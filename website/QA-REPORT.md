# G3 Logistics — Reporte de QA (Mobile First · sitio corporativo)

## Ronda 2026-11-12 · usabilidad multi-resolución

Build estático (`next build` → `out/`) servido por HTTP y recorrido con
Playwright (Chromium) en modo táctil para móvil, más axe-core 4.10 para
accesibilidad.

**Resoluciones:** 320×568, 360×740, 375×667, 390×844, 414×896, 768×1024,
1024×768, 1280×800, 1440×900 y 1920×1080 · **Páginas:** `/`, `/servicios/`,
`/seguimiento/`, `/nosotros/`, `/contacto/`.

**Qué se valida en cada página y resolución**

- Sin scroll horizontal y ningún elemento más ancho que la pantalla.
- Áreas táctiles de 44 px o más en enlaces, botones y campos (salvo enlaces dentro de un párrafo).
- Texto visible de 12 px o más; un solo `h1`; títulos sin saltos de nivel; imágenes con `alt`.
- El botón flotante de WhatsApp no tapa ningún botón ni campo.
- axe-core sin violaciones (en 390 y 1280 px).
- Navegación completa con el menú móvil (o el nav de escritorio) y el logo; el menú se cierra al navegar.
- El formulario valida y envía también después de navegar del lado del cliente.
- El header se oculta al bajar y reaparece al subir (móvil); el popup de WhatsApp se abre solo en escritorio.

**Hallazgos corregidos en esta ronda**

| Hallazgo | Corrección |
|---|---|
| Tras navegar con el menú móvil, el menú quedaba abierto y el formulario dejaba de validar (Next no vuelve a montar el layout) | Script de mejora con delegación de eventos en `document`; el menú se cierra al elegir opción, al tocar fuera o con Esc |
| El header nunca fue sticky: `overflow-x: hidden` en `html, body` anula `position: sticky` | `overflow-x: clip` |
| Header de 96 px = 17 % del alto a 320×568 | Se oculta al bajar y vuelve al subir; relleno menor bajo 360 px (88 px) |
| Botón flotante de WhatsApp tapaba botones y campos | Solo ícono en móvil, aparece tras el primer scroll y se aparta mientras el formulario está en pantalla |
| Popup de WhatsApp a pantalla completa en móvil | Auto-apertura solo desde 768 px |
| Enlaces del nav, del pie y accesos rápidos con menos de 44 px de alto | `min-height: 44px` |
| Etiquetas (`.eyebrow`) de 11.5 px | 12.8 px |
| axe: `heading-order` (h4 en el pie) y `region` (widget fuera de un landmark) | Títulos del pie como `h2`; widget dentro de `<aside>` |
| Lista clave-valor apretada a 320 px | Etiqueta arriba del valor bajo 480 px |

**Resultado:** 0 hallazgos en las 10 resoluciones × 5 páginas.

---

## Ronda anterior (2026-07-19)


Fecha: 2026-07-19
Sitio evaluado: `http://localhost:8123/` (build estático de `next build`)
Metodología: Puppeteer headless (Chromium) sobre `out/` exportado con
`next.config.js → { output: 'export' }`.

## Alcance del sitio

Este sitio ES `g3logistics.mx`, el sitio corporativo de la empresa de
transporte. Es puramente informativo: presenta la operación de flete,
la cobertura y los canales de contacto para cotizar viajes. Los
productos SaaS (G3 Admin, G3 Drive) NO viven aquí — su comercialización
va en un sitio separado (`g3admin.mx / g3drive.mx`, siguiente
entregable).

## Estrategia Mobile First aplicada

`app/globals.css` está escrito 100% mobile-first: arranca en el
viewport de 320px y escala por `min-width`:

| Breakpoint | Ancho mínimo | Efecto principal |
|------------|--------------|------------------|
| Base       | 320px        | 1 columna, CTAs full-width, nav = hamburger, tipografía compacta |
| `sm`       | 480px        | CTA en fila, hero h1 +20% |
| `md`       | 768px        | Grids a 2 columnas, footer a 2 columnas, split lado a lado |
| `lg`       | 1024px       | Grids a 3–4 columnas, nav horizontal, hero 2-col |
| `xl`       | 1280px       | Hero h1 3.6rem |
| `2xl`      | 1440px       | contenido a `--container: 1180px` centrado |

Además:
- `overflow-x: hidden` en `body` como red de seguridad.
- Toques mínimos 44×44 (Apple HIG) en botones e inputs.
- `min-height: 48px` en inputs para evitar zoom en iOS.
- `<a href="#contenido" class="skip-link">` para lectores de pantalla.
- Focus visible con outline naranja (`--road-400`).
- Respeta `prefers-reduced-motion`.

## Rutas publicadas

4 rutas × 4 viewports = **16 screenshots**.

| Ruta            | HTTP | Overflow 375 | Overflow 768 | Overflow 1024 | Overflow 1440 |
|-----------------|------|--------------|--------------|---------------|---------------|
| `/`             | 200 | ✓ | ✓ | ✓ | ✓ |
| `/servicios/`   | 200 | ✓ | ✓ | ✓ | ✓ |
| `/nosotros/`    | 200 | ✓ | ✓ | ✓ | ✓ |
| `/contacto/`    | 200 | ✓ | ✓ | ✓ | ✓ |

## Rutas retiradas (esperado 404)

Confirmamos que las páginas del anterior sitio dual ya no responden:

| Ruta                     | HTTP |
|--------------------------|------|
| `/productos/admin/`      | 404  |
| `/productos/drive/`      | 404  |
| `/precios/`              | 404  |

## Validación de componentes (viewport 375px)

- **Links internos rotos**: 0 (todos los `<a href="/…">` apuntan a rutas
  existentes en el export estático).
- **Botones con tap-target < 40px**: 0.
- **Inputs con altura < 44px**: 0.
- **`<h1>` por página**: exactamente 1 en cada ruta.
- **Meta `title`, `description`, `viewport`, `canonical`**: presentes en las 4 rutas.
- **Meta `viewport` incluye `width=device-width`**: ✓.

## Validación de navegación

- **Header desktop (≥1024px)**: 4 links visibles + CTA Cotizar (Servicios, Cobertura, Nosotros, Contacto).
- **Header mobile (<1024px)**: hamburger `<details>/<summary>` accesible sin JS.
- **Menú móvil abre/cierra**: verificado en las 4 rutas.
- **Footer**: 4 columnas en desktop, 2 en tablet, 1 en móvil.
- **Skip link**: presente y visible al recibir foco.
- **Emails segmentados**: `fletes@`, `empresas@`, `soporte@` — todos con `mailto:` funcional.

## SEO

- JSON-LD `MovingCompany` con `contactPoint` para ventas y soporte.
- JSON-LD `Service` con `OfferCatalog` de los 4 servicios de transporte.
- Sitemap actualizado con las 4 rutas activas.
- `robots.txt` permite indexación completa.
- Metadata específica por página (title, description, canonical, OpenGraph).

## Resultado agregado

```
routesTested:          4
viewportsPerRoute:     4
totalScreenshots:      16
brokenInternalLinks:   0
smallTapTargets:       0
smallInputs:           0
overflowInstances:     0
totalRouteErrors:      0
pass:                  true
```

## Cómo reproducir

```bash
cd website
npm install
npm run build                   # genera out/
cd out && python3 -m http.server 8123 &
node /path/to/qa.js             # scratchpad/qa/qa.js
```

Screenshots quedan en `scratchpad/qa/screenshots/` (16 PNG).
Reporte máquina-legible en `scratchpad/qa/qa-report.json`.
