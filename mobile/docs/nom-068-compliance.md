# NOM-068-SCT-2-2014 · Cumplimiento en G3 Drive

> Especificación funcional de cómo G3 Drive cumple nativamente
> la **NOM-068-SCT-2-2014** que establece las condiciones
> físico-mecánicas y de seguridad para la operación de vehículos
> de autotransporte federal en caminos y puentes de jurisdicción
> federal.

## Por qué importa

- **Obligatorio por ley federal**: cualquier vehículo de
  autotransporte de carga federal debe operar en condiciones
  físico-mecánicas verificadas antes de cada salida
- La **SCT** (a través de sus unidades administrativas) y la
  **Guardia Nacional** (vía Policía Federal en caminos) verifican
  cumplimiento en **retenes y revisión documental**
- El no cumplimiento puede generar:
  - Multas (rango similar a NOM-087)
  - Inmovilización del vehículo
  - Suspensión del permiso de autotransporte federal
- Y más grave aún: **un accidente** por una falla que debió
  detectarse en la inspección puede convertir el incidente en
  **responsabilidad civil + penal** del operador y permisionario

G3 Drive convierte la inspección obligatoria en una rutina
**digital, fotodocumentada y auditable** — el operador no puede
salir del patio sin completarla, el dueño tiene evidencia en
caso de incidente.

## Esta NOM + NOM-087 = las 2 normas que SCT revisa

Cuando te detiene un retén federal o SCT te audita, las **2
primeras cosas** que piden son:

| NOM | Qué exige | Cómo lo cumple G3 Drive |
|---|---|---|
| **NOM-068-SCT-2-2014** | Inspección físico-mecánica del vehículo antes de operar | Checklist digital de 12 puntos con foto y firma |
| **NOM-087-SCT-2-2017** | Bitácora de horas de servicio del conductor | Captura automática de 5 categorías + PDF oficial |

Ambas son **regulaciones de obligatorio cumplimiento** y ambas
se generan **sin esfuerzo del operador** en G3 Drive.

## Los 12 puntos de inspección obligatoria

Cada salida del patio debe verificar estos 12 puntos
físico-mecánicos (alineados con NOM-068):

| # | Punto | Qué verifica el operador | Norma específica |
|---|---|---|---|
| 1 | **Llantas delanteras** | Profundidad mínima 4 mm, presión, daños | NOM-068 §5.1 |
| 2 | **Llantas traseras** | Mismo + revisión de pares (≥4mm) | NOM-068 §5.1 |
| 3 | **Luces** | Cuartos, altas, bajas, frenos, direccionales, intermitentes | NOM-068 §5.4 |
| 4 | **Frenos** | Aire, pedal, mangueras, fugas, ABS si aplica | NOM-068 §5.2 |
| 5 | **Aceite y niveles** | Motor, dirección hidráulica, refrigerante, líquido limpiaparabrisas | NOM-068 §5.5 |
| 6 | **Combustible** | Nivel inicial, fugas visibles, tapón de tanque | NOM-068 §5.5 |
| 7 | **Cabina** | Cinturones funcionales, vidrios sin daño, espejos, asiento ergonómico | NOM-068 §5.3 |
| 8 | **Carga** | Estiba correcta, lonas/sellos en su lugar, peso dentro de norma | NOM-012-SCT (peso) |
| 9 | **Documentos de unidad** | Tarjeta de circulación vigente, póliza de RC, refrendo, permiso SCT | LCPAF · Reglamento |
| 10 | **Documentos del operador** | Licencia federal vigente, examen médico vigente | NOM-087 + Ley |
| 11 | **Extintor y botiquín** | Carga vigente, sellos, vigencia, accesible | NOM-068 §5.6 |
| 12 | **Aspecto exterior** | Daños previos documentados, defensas, parabrisas, espejos laterales | NOM-068 §5.3 |

Los puntos 8, 9 y 10 referencian otras normas (NOM-012, NOM-087,
Ley) pero la inspección integrada de los 12 cumple **la
totalidad de lo que SCT verifica** físicamente al detenerte.

## Pantallas y flujo en G3 Drive

### Pantalla 1 · Lista de inspección

Punto de entrada desde el dashboard del operador:

```
┌─────────────────────────────────────┐
│ ← Atrás                             │
│ Inspección NOM-068                  │
│ MIE 28 MAY 2026 · 06:10             │
├─────────────────────────────────────┤
│ 8 de 12 puntos completados          │
│ ████████░░░░ 67%                    │
├─────────────────────────────────────┤
│ ✓  Llantas delanteras       06:11   │
│ ✓  Llantas traseras         06:12   │
│ ✓  Frenos                   06:14   │
│ ⚠  Luces (revisar dirección)        │ ← falla detectada
│ ✓  Aceite y niveles         06:16   │
│ ...                                 │
└─────────────────────────────────────┘
```

### Pantalla 2 · Detalle de checkpoint

Cada punto exige **foto obligatoria** + estado (OK / Falla):

```
┌─────────────────────────────────────┐
│ ← Inspección · 3 de 12              │
│                                     │
│ LUCES                               │
│ NOM-068 §5.4                        │
│                                     │
│ Revisa: cuartos, altas, bajas,      │
│ frenos, direccionales, intermitentes│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │       📷 FOTO OBLIGATORIA       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ESTADO                              │
│ [ ✓ OK ]      [ ⚠ Falla ]           │
│                                     │
│ Notas (opcional):                   │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Pantalla 3 · Reporte de falla

Si el operador marca ⚠ Falla, la app dispara el flujo de
escalación:

```
┌─────────────────────────────────────┐
│ ⚠ FALLA DETECTADA                   │
│                                     │
│ Punto: Luces                        │
│ Hora: 06:15                         │
│                                     │
│ Severidad                           │
│ [ Menor ]  [ Mayor (no salir) ]     │
│                                     │
│ Describe la falla (obligatorio):    │
│ ┌─────────────────────────────────┐ │
│ │ Direccional izquierda no prende │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Foto del problema:                  │
│ [✓ tomada]                          │
│                                     │
│ [ Notificar a dispatch ]            │
└─────────────────────────────────────┘
```

Dispatch recibe la alerta y decide:

- **Falla menor**: autoriza salir + se programa servicio al regreso
- **Falla mayor**: bloquea salida, asigna otra unidad o reagenda
  el viaje
- **Falla crítica** (frenos, dirección, llantas <4mm): la app
  **no permite cerrar la inspección** ni iniciar el viaje

### Pantalla 4 · Bloqueo de inicio de viaje

Si quedan checkpoints sin completar o con falla mayor sin
resolver, esta pantalla bloquea el botón "Iniciar viaje":

```
┌─────────────────────────────────────┐
│            🚫 NO PUEDES SALIR        │
│                                     │
│  Inspección incompleta o con falla. │
│  NOM-068-SCT-2-2014 lo prohíbe.     │
│                                     │
│  Pendientes:                        │
│  ⚠ Luces (falla mayor sin atender)  │
│  ○ Aspecto exterior (sin completar) │
│                                     │
│  [ Volver a inspección ]            │
└─────────────────────────────────────┘
```

## PDF oficial de inspección

Al cierre de cada inspección completa, G3 Drive genera un
**comprobante digital** que se anexa a la bitácora del viaje:

**Contenido del PDF**:
- Datos del operador (nombre, licencia federal)
- Datos de la unidad (placas, marca, modelo, número de tracto)
- Fecha y hora de inicio + cierre de inspección
- Los 12 puntos con su estado (OK / Falla / N/A)
- Foto de cada punto (miniatura + link a foto en alta)
- Firma digital del operador (con el dedo en pantalla)
- QR code para verificación contra el backend
- **Sello oficial**: "Cumple NOM-068-SCT-2-2014 § 5"

Este PDF se incluye automáticamente en el paquete de bitácora
NOM-087 que se exporta al cierre del viaje, así que el operador
en retén muestra **un solo documento** que cumple **las 2 NOMs**.

## Estructura de datos · backend

### Tabla `vehicle_inspections` en trips-service

```sql
CREATE TABLE trips.vehicle_inspections (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips.trips(id) NOT NULL,
  driver_id UUID REFERENCES drivers.drivers(id) NOT NULL,
  vehicle_id UUID REFERENCES fleet.tractors(id) NOT NULL,
  trailer_id UUID REFERENCES fleet.trailers(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  -- Estado overall
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'blocked_by_failure')),
  -- 12 checkpoints
  checkpoints JSONB NOT NULL,
  -- Estructura del JSON checkpoints:
  -- [
  --   { "id": 1, "name": "Llantas delanteras",
  --     "status": "OK" | "FAIL" | "PENDING",
  --     "severity": null | "MINOR" | "MAJOR" | "CRITICAL",
  --     "photo_url": "...",
  --     "notes": "...",
  --     "checked_at": "..." },
  --   ...
  -- ]
  -- Firma del operador
  driver_signature_url TEXT,
  driver_signed_at TIMESTAMPTZ,
  -- Auditoría
  pdf_url TEXT,
  qr_token TEXT UNIQUE,  -- para verificación pública en retén
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_trip ON trips.vehicle_inspections(trip_id);
CREATE INDEX idx_inspections_vehicle_date
  ON trips.vehicle_inspections(vehicle_id, DATE(started_at));
```

### Endpoints en trips-service

```
POST   /api/inspections                       Iniciar inspección
PATCH  /api/inspections/:id/checkpoint/:n     Marcar checkpoint
POST   /api/inspections/:id/sign              Firmar y cerrar
GET    /api/inspections/:id                   Ver detalle
GET    /api/inspections/:id/pdf               Generar PDF oficial
GET    /api/verify/inspection/:qrToken        Verificación pública (sin auth)
                                              — usado por inspector
                                                en retén
```

### Eventos Pub/Sub

```typescript
'inspection.started'           { tripId, vehicleId, driverId }
'inspection.failure_reported'  { inspectionId, point, severity }
'inspection.blocked'           { vehicleId, reason }
'inspection.completed'         { inspectionId, allOk: boolean }
```

## Tier-gating

**La inspección NOM-068 está disponible desde el plan Free** —
misma decisión que con NOM-087, por el mismo motivo: no podemos
ocultar cumplimiento legal detrás del paywall.

Lo que se monetiza:

| Plan | Funcionalidad inspección |
|---|---|
| **Free** | Captura básica + PDF oficial |
| **Starter** | + OCR de placas y números de serie en fotos |
| **Pro** | + Análisis IA de fotos (la IA detecta fallas que el operador no marcó) |
| **Business** | + Dashboard de cumplimiento de flota + alertas predictivas |
| **Enterprise** | + Integración con sistemas de mantenimiento predictivo |

## Métricas de éxito

| Métrica | Target |
|---|---|
| % de viajes con inspección 100% completa antes de salir | ≥ 99% |
| Tiempo medio de inspección | < 8 min |
| % de inspecciones con foto en todos los puntos | 100% |
| Fallas detectadas / 100 inspecciones | ≥ 5 (validación de uso real) |
| Multas SCT recibidas por inspección incompleta / año | 0 |
| Falsos negativos (falla no detectada → incidente) | < 1% |

## Cómo se rolla esto

Esta funcionalidad **ya está parcialmente implementada** en G3
Drive (mockups documentados en
[`mobile/mockups/`](../mockups/)). Lo pendiente para
cumplimiento estricto de NOM-068:

### Fase A · Backend (semana 1-2)
- [ ] Schema `vehicle_inspections` + migraciones
- [ ] Endpoints en `trips-service`
- [ ] Generador de PDF oficial con plantilla NOM-068
- [ ] QR de verificación pública

### Fase B · Mobile (semana 3)
- [ ] Vincular pantallas existentes (PreTripInspection,
      CheckpointDetail) al backend nuevo
- [ ] Pantalla de bloqueo si hay falla mayor
- [ ] Captura de firma digital al cierre

### Fase C · Admin (semana 4)
- [ ] Dashboard de inspecciones recientes por unidad
- [ ] Reporte de fallas detectadas por unidad / por operador
- [ ] Alerta a Gerente HSE cuando hay falla mayor recurrente

### Fase D · Validación (semana 5)
- [ ] Revisión legal del PDF con auditor de transporte
- [ ] Prueba con la flota propia G3 Logistics
- [ ] Validación en retén real (sin tráfico, con Guardia
      Nacional cooperando)

## Referencias normativas

- **NOM-068-SCT-2-2014** — Diario Oficial de la Federación,
  texto completo accesible en
  `https://www.dof.gob.mx/nota_detalle.php?codigo=NOM-068-SCT-2-2014`
- **NOM-087-SCT-2-2017** — Tiempos de conducción y pausas
  (ver [`nom-087-compliance.md`](./nom-087-compliance.md))
- **NOM-012-SCT-2-2017** — Peso y dimensiones
- **Ley de Caminos, Puentes y Autotransporte Federal**
- **Reglamento de Autotransporte Federal y Servicios Auxiliares**

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Especificación inicial NOM-068 |
