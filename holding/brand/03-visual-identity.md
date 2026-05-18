# 03 · Identidad visual

## 1. Logo

### Monograma G3 (símbolo)

El símbolo es un **logotipo italic, navy, atravesado por tres líneas
diagonales** que sugieren movimiento y velocidad. Es la pieza más
reconocible del grupo y aparece en todas las subsidiarias.

**Construcción**:

- Letras "G3" en peso 900 (black), itálica
- Inclinación: 12° hacia la derecha (sentido de la marcha)
- Color por defecto: **navy 800 (`#0F1E3D`)** sobre fondo claro
- Tres líneas diagonales paralelas que cortan transversalmente las
  letras, rotadas −12° respecto al eje horizontal
- Espesor de línea: ~4% del cap-height
- Separación entre líneas: equidistantes en la altura total del
  monograma
- Letter-spacing: −5% del font-size (las letras casi se tocan)

**Concepto**: las líneas representan **carretera en velocidad** vista
desde la cabina y refuerzan que G3 mueve carga, no la estaciona.

Disponible en `assets/logos/`:

- `g3-mark.svg` — monograma navy sobre fondo claro (uso principal)
- `g3-mark-mono-light.svg` — blanco para fondos navy / oscuros
- `g3-mark-mono-dark.svg` — negro para alto contraste e impresión

### Wordmark por entidad

Cada empresa del holding combina el monograma con un descriptor
debajo en peso black, mayúsculas y tracking abierto.

| Entidad | Archivo | Descriptor |
|---|---|---|
| G3 (paraguas) | `g3-wordmark.svg` | GRUPO G3 |
| G3 Logistics | `g3-logistics-wordmark.svg` | LOGISTICS |
| G3 Tech | `g3-tech-wordmark.svg` | TECH |
| Fundación G3 | `fundacion-g3-wordmark.svg` | FUNDACIÓN |

El descriptor se centra horizontalmente respecto al monograma y se
separa por una distancia equivalente a 20% del cap-height del propio
monograma.

### Reglas de uso

- **Tamaño mínimo**: 24 px de alto en digital, 8 mm en impreso.
  Debajo de ese tamaño las líneas diagonales pierden definición y
  el monograma se ve como mancha.
- **Área de protección**: zona libre = altura del descriptor
  (el "LOGISTICS" / "TECH") en sus 4 lados. Nunca otro elemento
  invade esta zona.
- **Colores de fondo permitidos**:
  - Fondo blanco / muy claro → mark navy (`g3-mark.svg`)
  - Fondo navy 900/800/700 → mark blanco (`g3-mark-mono-light.svg`)
  - Fondo naranja road-500 → mark blanco
  - Fondo en fotografía → solo con capa de contraste navy 900 al 70%
- **Rotación**: el logo ya viene con su inclinación italic
  intrínseca. No se rota adicionalmente.
- **Sombras o glow**: nunca.
- **Modificación de las líneas diagonales**: nunca (ni quitarlas,
  ni añadir más, ni cambiar el ángulo).
- **Forzar el monograma dentro de un cuadro**: nunca lo
  encerramos en un contenedor (caja, círculo, escudo). El logo
  vive libre.

### Excepción: favicon e iconos pequeños

Para usos extremos donde el logo debería estar pero el espacio no
permite el monograma completo (favicon, app icon, avatar de redes),
se usa una **variante encapsulada**:

- Cuadrado de esquinas redondeadas (radius 16% del lado)
- Fondo navy 800 sólido
- Monograma G3 blanco italic + líneas diagonales blancas semi-transparentes (mismo concepto)

Esta variante vive en `website/app/icon.svg` y en los íconos de las
apps móviles.

## 2. Paleta cromática

> **Cambio crítico vs versión anterior**: el navy es ahora **el color
> de identidad de marca** (presente en el logo). El naranja queda
> reservado como **color de acción** (CTAs, botones primarios,
> énfasis puntual). Esto crea una jerarquía visual más sobria sin
> sacrificar energía.

### Colores corporativos

| Token CSS | Hex | Uso |
|---|---|---|
| `--navy-900` | `#0A1633` | Fondos oscuros principales, headers, librea de vehículos |
| `--navy-800` | `#0F1E3D` | **Color del logo**, hero sections, footer |
| `--navy-700` | `#1B2D5C` | Botones secundarios, navy decorativo |
| `--navy-600` | `#2A3F7A` | Hover de elementos navy |
| `--navy-50` | `#F4F6FB` | Fondos suaves, secciones tintadas |
| `--road-500` | `#FF7A45` | **Color de acción** — CTAs primarios, énfasis |
| `--road-400` | `#FF8F66` | Hover de naranja, gradientes en hero |
| `--road-100` | `#FFF1E8` | Background suave de énfasis |

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
- **Naranja como acción, no como base**: nunca cubrir más del 10%
  de un layout en naranja. Es señal de acción, no decoración.
- **Navy es la identidad**: dominante en cualquier composición —
  fondos, logo, tipografía de títulos en contextos claros.
- **El logo nunca es naranja**: aunque el naranja existe en la
  paleta, el monograma G3 siempre va en navy (claro) o blanco
  (oscuro). Naranja como color del logo se vetó por confusión con
  marcas existentes y por jerarquía con el navy.

Ver swatch en `assets/palette.svg`.

## 3. Tipografía

### Tipografía del logo

El monograma usa **'Arial Black' / Helvetica Neue Bold / Impact**
como stack — pesos black 900 disponibles en cualquier sistema
operativo. Italic y letter-spacing negativo definidos en el SVG.

Para nuevas variantes de wordmark hay que respetar:
- Peso: 900 (black)
- Italic intrínseco (no usar `transform: skew`)
- Letter-spacing: −5% del font-size

### Tipografía primaria (digital)

**System stack** — sin cargar fuentes remotas, velocidad máxima:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
             "Helvetica Neue", Arial, system-ui, sans-serif;
```

Decisión deliberada: las fuentes del sistema son gratuitas, no
añaden latency, y se ven nativas en cada plataforma. Si en el futuro
queremos diferenciación visual fuerte, evaluar **Inter** o **Söhne**.

### Tipografía secundaria (impreso, presentaciones)

- **Cabeceras**: Inter (peso 700-900, kerning −0.02em)
- **Cuerpo**: Inter (peso 400, kerning normal)
- **Datos numéricos**: Inter (peso 600, *tabular-nums*)

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

- **Mayúsculas decorativas**: solo en eyebrows, tags y descriptores
  del logo. Nunca en títulos completos.
- **Cursivas**: para *énfasis editorial* o nombres de productos en
  contexto narrativo. Nunca para títulos.
- **Subrayado**: solo en hipervínculos de cuerpo de texto.

## 4. Iconografía

### Sistema

- **Stroke**: 1.8 px en grids de 24×24
- **Estilo**: línea (outlined), no fill
- **Esquinas**: redondeadas (`stroke-linecap: round`)
- **Color**: hereda del contenedor (`currentColor`)

### Set base entregado

Implementado en `website/components/Icon.tsx`:

`truck` · `map` · `shield` · `sparkles` · `route` · `chart` ·
`wallet` · `cam` · `phone` · `lock` · `bell` · `check` · `arrow`

### Reglas

- **Decoración pura**: marcar con `aria-hidden="true"`
- **Acción semántica**: marcar con `aria-label`
- **Tamaño**: siempre múltiplo de 4 (16, 20, 24, 32, 40)

## 5. Fotografía y visualización

### Fotografía

- **Sí**: tractos en carretera (cielo real, polvo real, sin
  postproducción exagerada). Manos de operadores trabajando.
  Detalle de cabina, papeles, comida en carretera.
- **Sí**: gente real del equipo (no stock).
- **No**: fotos genéricas de stock con corbata, laptop y sonrisa.
  Camiones color flúor.
- **No**: filtros de Instagram, viñeteado fuerte, virados.
- **Estilo de edición**: natural, exposición correcta, saturación
  ligeramente reducida (−5%), nitidez normal.

### Ilustración

- Cuando hace falta ilustrar (UI mocks, diagramas), usar el **mismo
  set de iconos** y la **paleta corporativa**.
- Diagramas técnicos: trazo limpio, navy sobre blanco, naranja
  como acento puntual.

### Visualización de datos

- **Datos cuantitativos**: barras y áreas en navy. Líneas en
  naranja para énfasis (la métrica que importa hoy).
- **Datos categóricos**: paleta extendida partiendo de navy 700,
  navy 600, road 500, road 400, green 600. Máximo 5 categorías
  por gráfica.
- **Ejes y grids**: ink-300 al 50%. No gridlines fuertes.

## 6. Layout y espaciado

### Container

- Ancho máximo: **1180 px**
- Padding horizontal responsivo: `clamp(16px, 4vw, 32px)`

### Sistema de espaciado (escala de 8 px)

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
| radius-sm | 8 px | Inputs, badges |
| radius | 14 px | Botones, modales pequeños |
| radius-lg | 22 px | Cards, contenedores |
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
| 1.1 | 2026-05-18 | Logo italic navy con speed lines (referencia G3 Logistics). Naranja pasa de identidad a acento de acción. |
