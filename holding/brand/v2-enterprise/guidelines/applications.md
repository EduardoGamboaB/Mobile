# Guidelines · Aplicación cross-canal

Lista exhaustiva de dónde y cómo aparece el sistema visual.

## 1. Activos físicos (operación pesada)

### Tractocamión

| Elemento | Tamaño | Posición |
|---|---|---|
| Mark / wordmark principal | 60-90 cm de alto | Costado de cabina, centrado vertical |
| Número de unidad (T-NNN) | 25 cm de alto | Puerta del piloto |
| Datos legales SCT | Según norma | Costado bajo (no compite con marca) |
| Línea de acento (si aplica) | 6-12 cm de alto | Borde inferior de la cabina |

Acabado: vinil de larga duración 3M IJ180 o equivalente.

### Caja seca / refrigerada / plataforma

| Elemento | Tamaño | Posición |
|---|---|---|
| Wordmark de costado | 120-180 cm de ancho | Centrado horizontal y vertical |
| Mark trasero | 60×60 cm | Centrado en compuerta |
| Número de remolque (R-NNN) | 30 cm | Esquina inferior izquierda |
| Línea de acento (opcional) | 8-12 cm | Borde inferior |

### Jaula granelera

Por su estructura abierta, el marcaje es distinto:

| Elemento | Tamaño | Posición |
|---|---|---|
| Placa lateral atornillada | 60×40 cm | Centrada arriba |
| Solo monograma (sin wordmark) | 40 cm | Por la geometría abierta |

### Estaciones / patios

- **Fachada principal**: wordmark grande iluminado, 2-4 m de ancho
- **Acceso de operadores**: monograma grande visible al entrar
- **Señalización interna** (andenes, áreas restringidas):
  pictogramas + tipografía del sistema, **nunca compite** con
  señalética STPS de seguridad

## 2. Activos personales (equipo)

### Uniformes operativos

- **Camisola**: bordado de monograma 5 cm en pecho izquierdo
- **Chaleco reflectante**: silkscreen del wordmark 25 cm en espalda
- **Gorra**: bordado del monograma 4 cm en frente
- **Casco** (almacén, patio): vinil del monograma 3 cm en costado

### Indumentaria corporativa (oficina)

- **Polo / camisa**: bordado discreto 3 cm pecho izquierdo
- **Sin frases motivacionales** en la espalda
- **Sin logos de patrocinadores deportivos** en uniforme

### Tarjetas de presentación

- **Tamaño**: 89 × 51 mm (estándar México) o 85 × 55 mm (europeo)
- **Anverso**: monograma + nombre + cargo + entidad
- **Reverso**: color base del concepto sólido + frase de marca
- **Material**: cartulina mate 350 g, **sin** laminado brillante
- **Tinta**: digital o impresión offset, **sin** dorados/holográficos

### Stationery completo

- Hoja membretada A4 + carta
- Sobre tamaño DL + Manila
- Carpeta corporativa
- Notepad
- Plantilla de Google Slides / PowerPoint
- Plantilla de Google Docs / Word
- Plantilla de email transaccional
- Plantilla de email marketing

## 3. Digital

### Sitio público

- Implementación de referencia: `website/` en este repo
- Tokens del concepto cargados como CSS variables
- Tipografía primaria self-hosted (`woff2`)
- Performance budget: < 100 kB JS, < 50 kB CSS, LCP < 2 s

### App G3 Admin (web)

- **Tema default**: oscuro (turnos largos de dispatch)
- **Tema light**: opt-in para owners
- **Densidad**: alta (información, no marketing)
- **Touch targets**: 44 px mínimo

### App G3 Drive (móvil)

- **Tamaño mínimo touch**: 48×48 px (uso con guantes)
- **Tipografía**: 16 px base sin requerir zoom
- **Modo oscuro**: por default
- **Modo alto contraste**: opt-in para uso bajo sol directo
- **Botón SOS**: persistente, posición fija, color crítico del
  concepto (Signal / Magma / Crimson / Cat Red / Electric)

### Login screen (todas las apps)

```
   ┌───────────────────────────────────┐
   │                                   │
   │                                   │
   │            [G3 MARK]              │
   │                                   │
   │                                   │
   │       ┌─────────────────┐         │
   │       │   email         │         │
   │       └─────────────────┘         │
   │                                   │
   │       ┌─────────────────┐         │
   │       │   password      │         │
   │       └─────────────────┘         │
   │                                   │
   │       ┌─────────────────┐         │
   │       │    SIGN IN  →   │         │
   │       └─────────────────┘         │
   │                                   │
   │       Forgot password?            │
   │                                   │
   └───────────────────────────────────┘
```

- Fondo: color base oscuro del concepto
- Mark centrado en el primer tercio vertical
- Inputs en blanco con borde delgado
- Botón primario en color de acción del concepto
- Sin imágenes decorativas, sin video de fondo

### Dashboard SaaS

Patrón general (ver mockup-dashboard.svg de cada concepto):

- Top bar 64-72 px con marca + nav + status
- Side nav 80 px colapsable
- KPI cards en grid (4 columnas en desktop)
- Mapa / chart / tabla principal
- Sidebar de detalle opcional

### Favicon / app icon

- **Variante encapsulada** del concepto
- Cuadrado redondeado (radius 22% del lado)
- Fondo: color base oscuro del concepto
- Mark en blanco
- Tamaños: 16, 32, 48, 64, 128, 192, 512 px

### Avatar de redes sociales

- Igual al app icon, 400×400 mínimo
- Nunca usar wordmark completo en avatar (pierde legibilidad)

### Banner / cover de redes

- Color base oscuro del concepto
- Wordmark izquierda + frase de marca derecha
- Sin imágenes de stock
- Sin cifras decorativas

## 4. Eventos y stand

### Stand modular reutilizable

- Pared frontal 3×2.4 m: color base + wordmark grande centrado
- Pantalla 55" con loop de demos (no marketing video)
- Mesa de demo con app G3 Admin / Drive en vivo
- Material físico: 1 brochure + tarjetas + USB-C cable (no
  branded merch)

### Lo que NO se hace en eventos

- Vasos / botellas con logo
- Plumas / cuadernos branded (regalar es no aportar)
- Catering excesivo
- Música alta
- Personal con disfraces / botargas

## 5. Vehículos comerciales (no operación)

### Auto corporativo (gerentes)

- Sin branding visible (ejecutivos no manejan tractos)
- Excepción: stickers traseros discretos en patio

### Camionetas de supervisión

- Wordmark lateral 60 cm + número de unidad
- Color blanco o gris (vs negro de tractos)

## 6. Branding "stealth operator"

Para situaciones donde la visibilidad de marca compromete
operación (escolta, custodia, operaciones sensibles):

- Vehículo en color neutro (blanco / gris)
- **Sin wordmark** en costados
- Sólo placa atornillada interna con monograma + número de unidad
- Plates discretas reglamentarias
- Operadores en uniforme civil con identificación interna

## 7. Branding "premium / luxury"

Para clientes ultra-premium (concierge logistics, art handling,
high-value goods):

- Vehículo en color base oscuro del concepto
- Wordmark más pequeño (40-60 cm vs 90 cm estándar)
- Acabado mate (no brillante)
- Operador en uniforme negro / gris carbón vs naranja-reflectante

## 8. Branding "AI platform" (para G3 AI)

Específico para comunicar G3 AI como producto separado:

- Materiales con más espacio en negro
- Tipografía monospace dominante (sugiere código)
- Visualización de datos en lugar de fotografía
- Color de acento del concepto al 100% (otras submarcas usan
  acento al 60%)
