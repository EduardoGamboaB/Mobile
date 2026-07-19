# G3 Logistics — Reporte de QA (Mobile First)

Fecha: 2026-07-19
Sitio evaluado: `http://localhost:8123/` (build estático de `next build`)
Metodología: Puppeteer headless (Chromium) sobre `out/` exportado con
`next.config.js → { output: 'export' }`.

## Estrategia Mobile First aplicada

`app/globals.css` fue reescrito de fondo. Antes usaba breakpoints
`max-width` (desktop-first); ahora arranca en el viewport más pequeño
(320px) y sube por `min-width`:

| Breakpoint | Ancho mínimo | Efecto principal |
|------------|--------------|------------------|
| Base       | 320px        | 1 columna, CTAs full-width, nav = hamburger, tipografía compacta |
| `sm`       | 480px        | CTA en fila, hero h1 +20% |
| `md`       | 768px        | Grids a 2 columnas, footer a 2 columnas, split lado a lado |
| `lg`       | 1024px       | Grids a 3–4 columnas, pricing a 5 columnas, nav horizontal, hero 2-col |
| `xl`       | 1280px       | Hero h1 3.6rem |
| `2xl`      | 1440px       | (contenido a `--container: 1180px` centrado) |

Además:
- `overflow-x: hidden` en `body` como red de seguridad.
- Toques mínimos 44×44 (Apple HIG) en botones e inputs.
- `min-height: 48px` en inputs para evitar zoom en iOS.
- `<a href="#contenido" class="skip-link">` para lectores de pantalla.
- Focus visible con outline naranja (`--road-400`).
- Respeta `prefers-reduced-motion`.

## Rutas evaluadas

7 rutas × 4 viewports = **28 screenshots**.

| Ruta | HTTP | Overflow 375 | Overflow 768 | Overflow 1024 | Overflow 1440 |
|------|------|--------------|--------------|---------------|---------------|
| `/`                     | 200 | ✓ | ✓ | ✓ | ✓ |
| `/servicios/`           | 200 | ✓ | ✓ | ✓ | ✓ |
| `/productos/admin/`     | 200 | ✓ | ✓ | ✓ | ✓ |
| `/productos/drive/`     | 200 | ✓ | ✓ | ✓ | ✓ |
| `/precios/`             | 200 | ✓ | ✓ | ✓ | ✓ |
| `/nosotros/`            | 200 | ✓ | ✓ | ✓ | ✓ |
| `/contacto/`            | 200 | ✓ | ✓ | ✓ | ✓ |

## Validación de componentes (viewport 375px)

- **Links internos rotos**: 0 (todas las rutas destino existen en el export estático).
- **Botones con tap-target < 40px**: 0.
- **Inputs con altura < 44px**: 0.
- **`<h1>` por página**: exactamente 1 en cada ruta.
- **Meta `title`, `description`, `viewport`, `canonical`**: presentes en las 7 rutas.
- **Meta `viewport` incluye `width=device-width`**: ✓.

## Validación de navegación

- **Header desktop (≥1024px)**: 6 links visibles + CTA Cotizar.
- **Header mobile (<1024px)**: hamburger `<details>/<summary>` accesible sin JS.
- **Menú móvil abre/cierra**: verificado en las 7 rutas via click programático
  al `<summary>`. Panel resulta visible (`display: flex`, `height > 0`).
- **Footer**: 4 columnas en desktop, 2 en tablet, 1 en móvil; todos los
  enlaces internos apuntan a rutas válidas o a `mailto:` correctos.
- **Skip link**: presente y aparece al hacer foco (`.skip-link:focus`).

## Correcciones aplicadas durante el QA

1. **Overflow en tabla de precios (6 columnas)**: envuelta en
   `overflow-x: auto` con `min-width: 640px` para que en móvil se desplace
   horizontalmente sin romper el layout de la sección.
2. **SVGs se estiraban al 100% del ancho**: `display: block` en `svg` global
   causaba que los iconos de flecha dentro de botones ocuparan todo el
   ancho disponible. Se acotó con `.btn svg { width: 1.05em; height: 1.05em }`
   y tamaños explícitos para `.card__icon svg`, `.brand__mark`, `.menu-toggle svg`.
3. **`.form-row` sin base mobile**: se le dio `grid-template-columns: 1fr`
   base y `1fr 1fr` a partir de `md ≥ 768px`.
4. **Skip link agregado** al `layout.tsx` con `<main id="contenido">`
   como destino.

## Resultado agregado

```
routesTested:          7
viewportsPerRoute:     4
totalScreenshots:      28
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
cd ../..
# Script de QA:
node /path/to/qa.js             # scratchpad/qa/qa.js
```

Screenshots quedan en `scratchpad/qa/screenshots/` (14 MB, 28 PNG).
Reporte máquina-legible en `scratchpad/qa/qa-report.json`.
