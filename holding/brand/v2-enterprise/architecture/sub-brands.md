# Arquitectura de las 16 submarcas G3

Cómo escalar de un mark único a un ecosistema de 16 productos sin
perder coherencia ni convertirse en ruido visual.

## Modelo: **endorsed monolith**

Todas las submarcas son **una sola palabra detrás del monograma G3**.
El monograma nunca cambia — lo que cambia es **el descriptor** y,
en el concepto Grid, **un color de acento**.

```
G3 + [descriptor]
     │
     ├── LOGISTICS  ── transportista (madre operativa)
     ├── DRIVE      ── app móvil para conductores
     ├── ADMIN      ── panel web para owners/dispatchers
     ├── ANALYTICS  ── BI + reporting + data warehouse
     ├── FLEET      ── mantenimiento + telemetría + IoT
     ├── FREIGHT    ── marketplace de carga (broker tech)
     ├── AI         ── plataforma de agentes IA aplicados
     ├── MARKET     ── marketplace de servicios al operador
     ├── TALENT     ── head hunting + capacitación operadores
     ├── SECURE     ── ciberseguridad + custodia operativa
     ├── CLOUD      ── infraestructura GCP propia para clientes
     ├── FINANCE    ── factoring, leasing, capital de trabajo
     ├── FLOW       ── automatización de procesos (RPA logístico)
     ├── CONTROL    ── command center 24/7 dispatch
     └── CONNECT    ── API + integraciones ERP / WMS / TMS
```

## Las 3 categorías visuales

Las 16 submarcas no son iguales en peso — se agrupan por función
estratégica. Esto evita que el sitio web y la papelería se vean
como un catálogo plano.

### **Categoría A — Empresas operativas** (3)

Son entidades legales con razón social propia. Llevan el wordmark
completo en papelería oficial.

- **G3 Logistics** — transportista operativa
- **G3 Tech** — desarrolla los productos SaaS
- **G3 Foundation** (alt: Fundación G3) — brazo social

### **Categoría B — Productos SaaS y servicios** (10)

Productos que se contratan y facturan independientemente. Cada uno
tiene su propio dashboard, ícono de app y página de producto, pero
no son empresas separadas.

- **G3 Drive** — app móvil de conductor
- **G3 Admin** — panel web de operación
- **G3 Analytics** — BI sobre la data de Admin
- **G3 Fleet** — telemetría + mantenimiento
- **G3 Freight** — marketplace de carga
- **G3 AI** — plataforma de los 6 agentes
- **G3 Market** — marketplace de servicios al operador
- **G3 Secure** — ciberseguridad + custodia
- **G3 Cloud** — infraestructura como servicio
- **G3 Connect** — API + integraciones

### **Categoría C — Servicios financieros y de talento** (3)

Servicios con regulación adicional (CNBV para finance, normativa
laboral para talent). Se manejan con extra rigor visual y
compliance.

- **G3 Finance** — factoring, leasing
- **G3 Talent** — head hunting operadores
- **G3 Flow** — automatización de procesos

> Categoría C **no se anuncia con la misma agresividad** que A y B
> hasta tener todos los registros y permisos.

## Diferenciación visual por concepto

### Si elegimos **MONOLITH**

Los 16 descriptores comparten exactamente el mismo bloque negro y
la misma tipografía mono. **Diferenciación = únicamente el texto**.

```
[██ G3 ██] LOGISTICS
[██ G3 ██] DRIVE
[██ G3 ██] ADMIN
...
```

Ventaja: máxima coherencia, autoridad institucional.
Desventaja: requiere contexto para distinguir productos.

### Si elegimos **VECTOR**

Cada submarca puede tener una **dirección vectorial diferente** del
sub-trazo cobalt. Por ejemplo, FREIGHT con flecha hacia adelante,
ADMIN con flecha hacia abajo (vista cenital), AI con vectores
radiales.

Ventaja: sistema modular vivo.
Desventaja: requiere disciplina de diseñador para no perder
consistencia.

### Si elegimos **GRID** ⭐ mejor escalabilidad para 16 marcas

Cada submarca tiene **un color del set extendido** asignado:

| Submarca | Color asignado | Hex |
|---|---|---|
| G3 Logistics | Iris (base) | `#5B6CFF` |
| G3 Drive | Acid (movimiento) | `#C8FF3D` |
| G3 Admin | White | `#F0F1F4` |
| G3 Analytics | Iris dark | `#3645B8` |
| G3 Fleet | Amber | `#FFB020` |
| G3 Freight | Coral | `#FF6B5B` |
| G3 AI | Magenta | `#B445FF` |
| G3 Market | Mint | `#3DD9A4` |
| G3 Talent | Sand | `#D9B070` |
| G3 Secure | Crimson | `#FF3B5C` |
| G3 Cloud | Sky | `#5BB8FF` |
| G3 Finance | Gold | `#E0B340` |
| G3 Flow | Lime | `#A4FF3D` |
| G3 Control | Crimson dark | `#B82D44` |
| G3 Connect | Iris light | `#9CA8FF` |
| G3 Foundation | Earth | `#C09060` |

Ventaja: cada submarca instantáneamente identificable, perfecto
para 16 productos.
Desventaja: requiere governance estricta de qué color pertenece
a quién (este documento es la fuente única).

### Si elegimos **FORGE**

Cada submarca usa el mismo escudo, **cambia solo el descriptor**.
Sub-categorías se distinguen por **el color del subrayado**:

- Categoría A → subrayado Cat Red (#CC2229)
- Categoría B → subrayado Brushed Steel (#3A3F45)
- Categoría C → subrayado Hi-Vis (#FFD400)

Ventaja: jerarquía clara y herencia industrial.
Desventaja: 16 escudos puede saturar visualmente.

### Si elegimos **PULSE**

El **punto eléctrico cambia de color** según la submarca. Todo lo
demás permanece idéntico — wordmark italic G3 + descriptor.

Ventaja: minimalismo extremo, escalable infinitamente.
Desventaja: el punto chico puede no leerse a distancia.

## Reglas universales (cualquier concepto)

1. **Orden del wordmark**: `G3 [DESCRIPTOR]`. Nunca al revés.
2. **Capitalización del descriptor**:
   - LOGISTICS, DRIVE, ADMIN, etc. en **mayúsculas** para
     productos B2B core
   - "Foundation" capitalizado normal por su naturaleza social
3. **Sin emoji ni íconos junto al wordmark** para diferenciar
   submarcas
4. **Sin abreviaciones**: "G3 Analytics", no "G3 Anlys"
5. **Subdominios coherentes con la nomenclatura**:
   `admin.g3.mx`, `drive.g3.mx`, `analytics.g3.mx`, etc.

## Roadmap de lanzamiento

No se lanzan los 16 al mismo tiempo. Recomendación:

| Fase | Trimestre | Marcas activas |
|---|---|---|
| 1 | Q1 2026 | Logistics + Drive + Admin |
| 2 | Q2 2026 | + Analytics + Fleet |
| 3 | Q3 2026 | + AI + Freight |
| 4 | Q4 2026 | + Foundation (legal) + Cloud + Connect |
| 5 | 2027 | + Market + Secure + Talent + Finance + Flow + Control |

Las marcas no lanzadas **no aparecen en el sitio público** hasta su
fase. Pero los assets ya están listos en este sistema.

## Decisión de submarcas no incluidas

Si en el futuro aparece una necesidad fuera de las 16 actuales,
**no se inventa marca nueva por reflejo**. Se aplica el filtro de
las 3 pruebas:

1. ¿Audiencia 100% distinta?
2. ¿Modelo de negocio incompatible con las existentes?
3. ¿Riesgo de contaminación cruzada?

Si **alguna respuesta es "no"**, se extiende una marca existente.
Caso contrario, se eleva al Comité de Marca.

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Arquitectura inicial v2 enterprise |
