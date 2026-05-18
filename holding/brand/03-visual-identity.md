# 03 · Identidad visual

## 1. Logo

### Monograma G3 (símbolo)

El símbolo es un cuadrado redondeado con la marca textual "G3" en
blanco sobre gradiente naranja diagonal. Es la pieza más reconocible
del grupo y aparece en todas las subsidiarias.

**Construcción geométrica**:

```
   ┌─────────────────────┐ ← cuadrado contenedor 64×64
   │   ┌─────────────┐   │   border-radius = 14 (22%)
   │   │             │   │
   │   │     G3      │   │ ← caracteres centrados ópticamente
   │   │             │   │   font-weight: 900
   │   └─────────────┘   │   letter-spacing: -1
   └─────────────────────┘
   gradiente: 135°
   stop 0%: #FF8F66
   stop 100%: #FF5E1A
```

Disponible en `assets/logos/`:

- `g3-mark.svg` — monograma a color (orange gradient)
- `g3-mark-mono-light.svg` — monograma blanco para fondos oscuros
- `g3-mark-mono-dark.svg` — monograma navy 900 para fondos claros

### Wordmark por entidad

Cada empresa del holding tiene una versión wordmark que combina el
monograma con el nombre completo en tipografía sólida.

| Entidad | Archivo |
|---|---|
| G3 (paraguas) | `g3-wordmark.svg` |
| G3 Logistics | `g3-logistics-wordmark.svg` |
| G3 Tech | `g3-tech-wordmark.svg` |
| Fundación G3 | `fundacion-g3-wordmark.svg` |

### Reglas de uso

- **Tamaño mínimo**: 24px de alto en digital, 8mm en impreso. Por
  debajo, el monograma pierde legibilidad.
- **Área de protección**: zona libre de cualquier elemento = altura
  de un carácter "G" del propio logo en sus 4 lados.
- **Color de fondo permitido**: blanco, navy 900, navy 800, naranja
  (sólo el monograma blanco). Nunca sobre fondos con menos del 60%
  de contraste WCAG.
- **Rotación**: nunca. El logo siempre horizontal.
- **Inclinación o efecto 3D**: nunca.
- **Sombras o glow**: nunca, el gradiente ya aporta dimensión.
- **Modificar gradiente, tipografía o proporciones**: nunca.

## 2. Paleta cromática

### Colores corporativos

| Token CSS | Hex | Uso |
|---|---|---|
| `--navy-900` | `#0A1633` | Fondos oscuros principales, headers |
| `--navy-800` | `#0F1E3D` | Hero sections, footer |
| `--navy-700` | `#1B2D5C` | Botones secundarios, navy decorativo |
| `--navy-600` | `#2A3F7A` | Hover states de navy |
| `--navy-50` | `#F4F6FB` | Fondos suaves, secciones tintadas |
| `--road-500` | `#FF7A45` | **Color principal de marca**, CTAs |
| `--road-400` | `#FF8F66` | Hover de naranja, gradientes |
| `--road-100` | `#FFF1E8` | Backgrounds suaves de énfasis |

### Neutros (texto y UI)

| Token | Hex | Uso |
|---|---|---|
| `--ink-900` | `#0F172A` | Texto principal sobre claro |
| `--ink-700` | `#334155` | Texto secundario |
| `--ink-500` | `#64748B` | Texto terciario, metadatos |
| `--ink-300` | `#CBD5E1` | Bordes, divisores |
| `--ink-100` | `#F1F5F9` | Bordes muy suaves |
| `--ink-50` | `#F8FAFC` | Fondos casi blancos |
| `--white` | `#FFFFFF` | Texto sobre oscuro, fondos claros |

### Status

| Token | Hex | Significado |
|---|---|---|
| `--green-600` | `#16A34A` | Éxito, "entregado", "OK" |
| `--amber-500` | `#F59E0B` | Advertencia, "pendiente", "esperando" |

### Reglas de combinación

- **Ratio mínimo de contraste**: 4.5:1 (WCAG AA) en cualquier texto
- **Naranja como acento, no como base**: nunca cubrir más del 15% de
  un layout en naranja. Es señal, no relleno.
- **Navy es el color institucional**: fondos serios, comunicación al
  consejo, propuestas a clientes corporativos.
- **Naranja es el color de la acción**: CTAs, indicadores de viaje
  en vivo, alertas operativas.

Ver swatch en `assets/palette.svg`.

## 3. Tipografía

### Tipografía primaria (digital)

**System stack** — sin cargar fuentes remotas, velocidad máxima:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
             "Helvetica Neue", Arial, system-ui, sans-serif;
```

Decisión deliberada: las fuentes del sistema son gratuitas, no añaden
latency, y se ven nativas en cada plataforma. Sólo si en el futuro
queremos diferenciación visual fuerte, evaluar **Inter** o **Söhne**.

### Tipografía secundaria (impreso, presentaciones)

- **Cabeceras**: Inter (Google Fonts, peso 700-900, kerning -0.02em)
- **Cuerpo**: Inter (peso 400, kerning normal)
- **Datos numéricos**: Inter (peso 600, *tabular-nums* para
  alineación en columnas)

### Jerarquía

| Nivel | Tamaño web | Tamaño impreso | Peso |
|---|---|---|---|
| H1 | clamp(2.2rem, 5vw, 3.6rem) | 36pt | 700 |
| H2 | clamp(1.7rem, 3.6vw, 2.4rem) | 24pt | 700 |
| H3 | 1.25rem | 14pt | 700 |
| Body | 1rem (16px) | 11pt | 400 |
| Caption | 0.85rem | 9pt | 500 |
| Eyebrow | 0.78rem uppercase, letter-spacing 0.14em | — | 600 |

### Reglas

- **Mayúsculas decorativas**: sólo en eyebrows y tags. Nunca en
  títulos completos.
- **Cursivas**: para *énfasis editorial* o nombres de productos en
  contexto narrativo. Nunca para títulos.
- **Subrayado**: solo en hipervínculos en cuerpo de texto.

## 4. Iconografía

### Sistema

- **Stroke**: 1.8px en grids de 24×24
- **Estilo**: línea (outlined), no fill
- **Esquinas**: redondeadas (stroke-linecap: round)
- **Color**: hereda del texto contenedor (`currentColor`)

Esto permite que cualquier icono se monte sobre cualquier color sin
hacer variantes.

### Set base (entregado)

Implementado en `website/components/Icon.tsx`:

`truck` · `map` · `shield` · `sparkles` · `route` · `chart` ·
`wallet` · `cam` · `phone` · `lock` · `bell` · `check` · `arrow`

### Reglas

- **Decoración pura**: marcar con `aria-hidden="true"`
- **Acción semántica**: marcar con `aria-label`
- **Tamaño**: siempre múltiplo de 4 (16, 20, 24, 32, 40)

## 5. Fotografía y visualización

### Fotografía

- **Sí**: tractos en carretera (cielo real, polvo real, no
  postproducción exagerada). Manos de operadores trabajando. Detalle
  de cabina, papeles, comida en carretera.
- **Sí**: gente real del equipo (no stock).
- **No**: fotos genéricas de stock con corbata, laptop y sonrisa
  perfecta. No camiones color flúor.
- **No**: filtros de Instagram, viñeteado fuerte, virados de color.
- **Estilo de edición**: natural, exposición correcta, saturación
  ligeramente reducida (-5%), nitidez normal.

### Ilustración

- Cuando hace falta ilustrar (UI mocks, diagramas), usar el **mismo
  set de iconos** y la **paleta corporativa**. Nunca usar packs de
  ilustraciones genéricas tipo "blob people".
- Diagramas técnicos: trazo limpio, navy sobre blanco, naranja
  como acento.

### Visualización de datos

- **Datos cuantitativos**: barras y áreas en navy. Líneas en
  naranja para énfasis (ej. la métrica que importa hoy).
- **Datos categóricos**: paleta extendida partiendo del navy 700,
  navy 600, road 500, road 400, green 600. Máximo 5 categorías por
  gráfica.
- **Ejes y grids**: ink-300 al 50%. No usar gridlines fuertes.

## 6. Layout y espaciado

### Container

- Ancho máximo: **1180px**
- Padding horizontal responsivo: `clamp(16px, 4vw, 32px)`

### Sistema de espaciado (escala de 8px)

| Token | px | Uso |
|---|---|---|
| xs | 4 | Inline tight |
| sm | 8 | Padding interno mínimo |
| md | 16 | Padding default |
| lg | 24 | Gap entre cards |
| xl | 32 | Padding de cards |
| 2xl | 48 | Separación entre subsecciones |
| 3xl | 96 | Padding vertical de secciones |

### Border-radius

| Token | Valor | Uso |
|---|---|---|
| radius-sm | 8px | Inputs, badges |
| radius | 14px | Botones, modales pequeños |
| radius-lg | 22px | Cards, contenedores |
| 999px | full | Pills, botones redondos |

### Sombras

| Token | Definición |
|---|---|
| shadow-sm | `0 1px 2px rgba(15,23,42,0.06)` |
| shadow | `0 8px 24px rgba(15,23,42,0.08)` |
| shadow-lg | `0 24px 60px rgba(15,23,42,0.16)` |

## 7. Tokens canónicos

Todos los tokens están en `website/app/globals.css` como variables
CSS. **Esa es la fuente de verdad para web.** Cualquier desviación
debe documentarse aquí primero.

Para futuras apps (mobile, electron) replicar en su propio sistema
manteniendo nombres idénticos.

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Documento inicial |
