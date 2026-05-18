# 05 · Aplicaciones de marca

Cómo aterriza la identidad en cada punto de contacto. Cada
aplicación referencia los tokens del [doc de identidad visual](./03-visual-identity.md).

## 1. Papelería corporativa

### Tarjeta de presentación

- **Tamaño**: 85 × 55 mm
- **Material**: cartulina mate 350 g, sin laminado brillante
- **Anverso**: monograma G3 (esquina superior izquierda, 18×18 mm)
  + nombre + cargo + entidad + datos de contacto
- **Reverso**: navy 900 con frase de marca centrada en blanco
- **Tipografía**: Inter en impreso

```
┌────────────────────────────────────────┐
│  [G3]                                  │
│                                        │
│  María Fernanda Torres                 │
│  Gerente Comercial                     │
│  G3 Logistics S.A. de C.V.             │
│                                        │
│  mtorres@g3logistics.mx                │
│  +52 55 5555 0000                      │
│  g3logistics.mx                        │
└────────────────────────────────────────┘
```

### Hoja membretada

- Carta carta (216 × 279 mm)
- Logo en esquina superior izquierda, 25 mm de alto
- Datos de la entidad (razón social, RFC, domicilio) en esquina
  superior derecha, ink-500, 8pt
- Pie de página: dirección completa + sitio web, ink-500, 7pt
- Margen izquierdo y derecho: 25 mm cada uno

### Firma de correo electrónico

Formato único para todo el grupo:

```
Daniela López
Dispatcher Senior · G3 Logistics
+52 55 5555 0000 · dlopez@g3logistics.mx
g3logistics.mx
```

Reglas:
- Sin imágenes pesadas (sólo texto + 1 logo opcional 100×30 px)
- Sin frases motivacionales al final
- Sin "Por favor considere el medio ambiente antes de imprimir"
- Sin íconos de redes sociales: si son relevantes, link textual

## 2. Librea de vehículos (vehicle wrap)

Los tractos son una de las superficies de marca más visibles.
Diseño minimalista y legible a distancia:

### Tracto (cabina)

- **Color base**: navy 900 en toda la cabina
- **Costado**: wordmark "G3 LOGISTICS" en blanco, 120 cm de ancho,
  centrado verticalmente
- **Detalle naranja**: una línea horizontal de 8 cm en road-500 al
  pie del costado, recorre todo el largo
- **Puerta**: número de tracto en blanco (ej. "T-038"), 25 cm de
  alto, Inter peso 900
- **Frente y parte trasera**: monograma G3 grande, 60×60 cm

### Remolque (caja seca)

- **Color base**: blanco para reflectividad y temperatura
- **Costado**: wordmark + frase corta "Tu carga, en vivo." en navy
- **Detalle**: barra naranja inferior de 12 cm de alto
- **Refrigerados**: incluir pictograma de temperatura controlada
  (no usar copo de nieve genérico — usar icono `shield` del set)

### Refletas y permisos

- Permisos SCT obligatorios siempre visibles, sin tapar.
- Folio de unidad federal en costado derecho.
- Datos NOM-068 en parte trasera.

## 3. Uniformes

### Operadores (uniforme estándar)

- **Camisola**: navy 900 con bordado del monograma G3 (esquina
  superior izquierda, 5 cm) + número de operador en manga derecha.
- **Pantalón**: cargo industrial color caqui o gris oscuro.
- **Calzado**: bota dieléctrica con casquillo.
- **Chaleco reflectante**: naranja road-500 con bandas reflectantes
  blancas, sello "G3 LOGISTICS" en espalda.
- **Gorra opcional**: navy con monograma frontal.

### Personal operativo (dispatchers, almacén)

- Polo navy con monograma bordado pequeño + pantalón casual.
- En oficinas administrativas: dress code business casual, sin
  uniforme obligatorio.

### Personal de tech

- Sin uniforme. Se sugiere hoodie o playera con monograma para
  eventos externos (la marca debe identificarse, no normarse).

## 4. Señalización física

### Patios y CEDIS

- **Letrero exterior**: G3 wordmark grande, iluminado. Versión
  blanca del monograma sobre fondo navy 900; o monograma navy
  sobre placa blanca retroiluminada.
- **Numeración de andenes**: navy con números blancos, peso 900.
- **Señalética de seguridad**: 100% en normativa STPS/NOM-026
  (colores estándar de seguridad). La marca no compite con
  señalización de emergencia.
- **Carteles internos**: paleta corporativa, voz directa.
  - Ej: "Antes de subir a cabina: revisa llantas, frenos, luces.
    3 minutos hoy, 0 paradas en carretera."

### Oficinas corporativas

- Recepción: monograma grande detrás del mostrador
- Salas de junta nombradas con rutas mexicanas históricas
  (Sala Panamericana, Sala 40, Sala Pacífico)
- Murales operativos: gráficas de operación real, actualizadas
  semanalmente (no decoración genérica)

## 5. Digital

### Sitio web

Implementación de referencia: [`website/`](../../website/) en este
repo. Tokens consistentes con esta guía. Cualquier propiedad digital
nueva debe seguir el mismo design system.

### App G3 Admin

- Tema oscuro por default (navy 900 background) — los dispatchers
  trabajan turnos largos
- Tema claro opcional para owners y contadores
- Densidad de información alta, sin "marketing" dentro de la app
- Navegación lateral fija (sidebar)

### App G3 Drive

- Botones de mínimo 44 × 44 px (área táctil con guantes)
- Texto mínimo 16 px sin requerir zoom
- Alto contraste siempre (uso bajo sol)
- Modo nocturno automático para turnos en madrugada
- Botón SOS persistente en pantalla, posición fija superior derecha
- Sin animaciones decorativas — feedback visual instantáneo, no
  delays

### Material descargable (whitepapers, brochures)

- PDF en formato carta
- Portada navy con monograma centrado + título grande
- Interior: tipografía Inter, márgenes generosos (25mm)
- Pie de página: "G3 Logistics — g3logistics.mx — versión X.X"
- Última página: contacto + QR a la página relevante del sitio

### Presentaciones (decks)

- Plantilla en Google Slides y PowerPoint
- Portada estilo hero del sitio
- Datos en gráficas — nunca capturas de pantalla rasterizadas
- Cabecera fija con monograma pequeño
- Pie con folio del deck + fecha + autor
- Densidad: una idea por slide, no más

## 6. Redes sociales

### Avatares

- Todas las cuentas usan el monograma G3 (no el wordmark — pierde
  legibilidad en 64×64)
- Banner / cover: navy 900 con la frase de marca y URL del sitio
- Bio: una línea con la dualidad (transporte + tecnología)

### Plantillas para posts

| Tipo | Composición |
|---|---|
| Anuncio de producto | Navy background + título grande blanco + monograma esquina + naranja como acento mínimo |
| Reporte mensual | Gráfica de datos reales centro + título arriba + URL al detalle |
| Caso de éxito | Foto real de operación + cita corta del cliente + datos cuantitativos |
| Posts internos (cultura) | Foto real del equipo + texto en lenguaje cercano + sin frase motivacional |

## 7. Comunicación a operadores

Esta audiencia merece su propio estilo de aplicación.

- **Medio principal**: WhatsApp grupal por flota / por base
- **Avisos formales**: PDF de una página, gran tipografía, sin jerga
- **Capacitación**: video corto (< 3 min) o ficha visual con
  iconos del set
- **Reconocimientos**: tablón físico en patio con foto + métrica
  (mejor on-time del mes, mejor scoring de seguridad)

## 8. Eventos y stand de feria

- Stand modular reutilizable (no construcción nueva por evento)
- Pared frontal: gradiente navy 900 → navy 700 + monograma centrado
  + frase de marca
- Demo de G3 Admin en pantalla grande conectada a entorno staging
- Material físico mínimo: 1 brochure de 4 páginas + tarjetas
- Wifi propio para demos (no depender del wifi del recinto)
- Catering opcional: café de origen mexicano (cuando se pueda)

## 9. Lo que **no** hacemos

- Regalos promocionales de mala calidad (plumas que no escriben,
  USBs de 1GB, agendas con calendario del año pasado)
- Calendarios de "chicas G3" o cualquier objetivación
- Branding sobre uniformes de operadores que comprometa
  visibilidad o seguridad
- Patrocinios deportivos sin lógica con el negocio (futbol
  primera división, motorsport)
- Souvenirs como prioridad de presupuesto de marketing

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Documento inicial |
