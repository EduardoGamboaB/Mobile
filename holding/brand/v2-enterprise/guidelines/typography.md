# Guidelines · Sistema tipográfico

## Stack por concepto

Cada concepto tiene su tipografía primaria y alternativa libre.
Después de elegir concepto, **se compra licencia** para la
primaria. La alternativa libre se usa cuando licencia no
está disponible (por ejemplo, web fonts servidas a usuarios
finales).

| Concepto | Primaria (de pago) | Alternativa libre | Mono / numeric |
|---|---|---|---|
| Monolith | GT America Mono / Söhne Mono | JetBrains Mono | JetBrains Mono |
| Vector | Geist Sans / Roobert | Space Grotesk Variable | Geist Mono / JetBrains Mono |
| Grid | PP Neue Machina | Space Grotesk Variable | IBM Plex Mono |
| Forge | Druk Wide / Korolev | Oswald Bold / Bebas Neue | Roboto Mono |
| Pulse | PP Editorial New / Söhne | Inter Display | Inter Tight + tabular-nums |

## Cuándo usar serif

Sólo dos casos:

1. **Documentos legales largos** (contratos, avisos de privacidad,
   términos): IBM Plex Serif libre / Charter / Söhne
2. **Comunicación al consejo / inversionistas formales**: misma
   serif

Para todo lo demás — sitio, app, redes, dashboards — sans-serif.

## Pesos autorizados

Para evitar inflación visual, sólo se usan estos pesos:

| Función | Peso |
|---|---|
| Display (H1, marca) | 700 - 900 (según concepto) |
| Body | 400 |
| Énfasis sutil | 500 |
| Énfasis fuerte | 600 |
| Captions / metadata | 500 |
| Code / mono | 400 - 500 |

**Prohibido**: light (<400), thin, hairline. La marca no debe
verse "frágil".

## Escala tipográfica web

Basada en escala modular 1.25 (major third) sobre 16 px base.

| Token | Tamaño | Line-height |
|---|---|---|
| caption | 13 px | 1.4 |
| body-sm | 14 px | 1.5 |
| body | 16 px | 1.55 |
| body-lg | 18 px | 1.55 |
| h6 | 20 px | 1.3 |
| h5 | 24 px | 1.25 |
| h4 | 32 px | 1.2 |
| h3 | 40 px | 1.15 |
| h2 | 56 px | 1.1 |
| h1 | clamp(72 px, 8vw, 96 px) | 1.05 |
| hero-display | clamp(96 px, 12vw, 144 px) | 1.0 |

## Reglas de escritura tipográfica

- **Letter-spacing**: títulos H1-H2 a -0.02em (–2%), body a 0,
  ALL CAPS a +0.08em (+8%)
- **Tabular numerals**: obligatorio en cualquier tabla, métrica
  o columna numérica
- **Smart quotes**: " " ' ' siempre, nunca " " ' '
- **Em-dash**: — para incisos, sin espacios alrededor en español
  ("la flota — propiedad de G3 — opera 24/7")
- **Guiones**: ‐ en compuestos ("just-in-time"), – para rangos
  ("9–18 hrs"), — para incisos
- **Acentos**: respeto absoluto al español. Nunca "Mexico" sin
  acento en contexto formal

## Multi-idioma

- **Español MX**: idioma primario
- **Inglés US**: páginas internacionales / docs API / posts LinkedIn
  globales
- **Tipografías idénticas** en ambos idiomas — no se cambia stack
  por idioma

## Render web

Optimización obligatoria para velocidad:

```css
/* Font-display: optional para evitar FOIT/FOUT */
@font-face {
  font-family: 'Inter';
  font-display: optional;
  src: url('/fonts/Inter-var.woff2') format('woff2-variations');
}

/* Tabular nums donde aplique */
.metric, .number, table {
  font-feature-settings: 'tnum' 1, 'cv11' 1;
}

/* Anti-aliasing para macOS / iOS */
html, body {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

## Render impreso

- **CMYK perfil**: ISO Coated v2 300% (FOGRA39) para Europa,
  GRACoL 2013 para USA/MX
- **Bleed**: 3 mm en cualquier publicación
- **Resolución**: 300 dpi mínimo, 600 dpi para tipografía pequeña
- **Negro**: usar rich black (60/40/40/100) para superficies
  grandes, key black (0/0/0/100) para texto fino

## Licenciamiento de fuentes

Después de elegir concepto:

| Tipo de licencia | Costo aproximado |
|---|---|
| Desktop (5 usuarios) | $500-2,000 USD |
| Web (web font hosting) | $200-800 USD/año |
| App (embed en iOS/Android) | $1,000-5,000 USD único |
| Corporate (unlimited) | $5,000-15,000 USD único |

Recomendación: contratar **corporate** desde el día 1 para evitar
re-licenciar cada hire o cada release.

## Fallback strategy

Si la primaria tarda en cargar (web), el browser ya está renderizando
con system stack. Asegurar que el **CLS (Cumulative Layout Shift)**
sea < 0.1 — usar `size-adjust` en `@font-face` para que el fallback
ocupe el mismo espacio visual que la primaria.
