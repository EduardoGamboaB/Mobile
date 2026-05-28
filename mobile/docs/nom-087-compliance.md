# NOM-087-SCT-2-2017 · Cumplimiento en G3 Drive

> Especificación funcional de cómo G3 Drive **cumple nativamente** la
> Norma Oficial Mexicana **NOM-087-SCT-2-2017** que establece los
> tiempos de conducción y pausas obligatorias para conductores del
> autotransporte federal de carga.

## Por qué importa

- **Obligatorio por ley** para cualquier flota que opera autotransporte
  federal de carga en México (SCT + Policía Federal vigilan)
- La bitácora física en papel es **inspeccionable en retenes**
- El no cumplimiento puede generar **multas** y suspensión de
  permisos federales
- La bitácora digital reduce **el riesgo de pérdida** del documento,
  permite **auditoría remota** y **firma electrónica** del responsable

G3 Drive convierte una obligación bureaucrática en **un beneficio
operativo**: la app captura todo automáticamente, alerta antes de
violar la norma, y genera el PDF oficial al cierre del viaje.

## Las 5 categorías de la NOM-087

Cada hora del día se clasifica en una de estas 5 categorías:

| # | Categoría | Símbolo | Cómo se detecta en G3 Drive |
|---|---|---|---|
| 1 | **CONDUCIENDO** | — | GPS en movimiento + motor encendido (telemetría) |
| 2 | **PAUSA** | — | Detención sin actividad declarada (≤30 min) |
| 3 | **ACTIVIDADES AUXILIARES** | — | Operador declara: carga, descarga, combustible, trámites |
| 4 | **CASOS DE EXCEPCIÓN** | — | Operador reporta evento extraordinario con evidencia |
| 5 | **DESCANSO** | — | Operador inicia descanso oficial (≥30 min, idealmente 8h continuas) |

### Eventos puntuales (NOM-087 page 1)

Estos son los **iconos** que aparecen en la bitácora oficial:

| Evento | Símbolo | Acción del operador |
|---|---|---|
| Inicio de viaje | `*` | Auto al asignar viaje en G3 Drive |
| Comida | `✓` | Auto-categorizado como Pausa |
| Descanso | `●` | Operador toca "Iniciar descanso" |
| Descarga | `↓` | Auto al llegar a punto de descarga o manual |
| Retenes (G.N., F.G.R., SEDENA) | `🛑` | Operador toca "Retén" + foto opcional |
| Descompostura | `▲` | Categoría de Casos de Excepción |
| Cierre de viaje | `🟢` | Auto al cerrar POD |
| Carga | `↑` | Auto al llegar a punto de carga o manual |

### Casos de Excepción (NOM-087 sección 3.4)

Estos requieren **evidencia documental obligatoria** (foto, GPS, hora):

- Percance vial (accidente)
- Avería del vehículo
- Bloqueo carretero
- Eventos climatológicos
- Otros (con justificación textual)

### Actividades Auxiliares (NOM-087 sección 3.5)

Cualquier tarea distinta a la conducción:

- Carga o descarga
- Limpieza y mantenimiento técnico de la unidad
- Operativos y/o retenes
- Carga de combustible
- Trámites aduanales / administrativos
- Garantía de seguridad de la carga (custodia)

## Reglas que la app hace cumplir

### Regla 1 · Pausa de 30 min cada 5h (NOM-087 sección 4.1)

> Todo conductor debe realizar una pausa de 30 minutos cuando ha
> conducido hasta cinco horas continuas; la pausa puede distribuirse
> durante un lapso de 5.5 horas según las condiciones de la ruta.

**Cómo lo hace G3 Drive**:

- Contador en vivo de horas continuas conduciendo
- **Alerta amarilla a las 4h 30min**: "30 min más y debes hacer
  pausa por NOM-087"
- **Alerta naranja a las 4h 50min**: "Pausa obligatoria en 10 min"
- **Pantalla bloqueante a las 5h**: el operador NO puede registrar
  más conducción hasta cumplir 30 min de pausa o reportar Caso de
  Excepción

### Regla 2 · Pausas NO acumulables (NOM-087 sección 4.2)

> Los periodos de pausa, en ningún caso podrán ser acumulables.

**Cómo lo hace G3 Drive**:

- El contador de 30 min reinicia desde cero después de cada periodo
  de conducción continua
- Pausas de <30 min no cuentan como cumplimiento

### Regla 3 · Conducción máxima 14h en 24h (NOM-087 sección 4.7)

> El tiempo máximo de conducción en 24 horas nunca podrá exceder
> las 14 horas.

**Cómo lo hace G3 Drive**:

- Acumulado de horas de conducción visible en el header
- **Alerta a las 12h**: quedan 2 horas
- **Alerta a las 13h**: queda 1 hora — empieza a buscar lugar de descanso
- **Pantalla bloqueante a las 14h**: forzar inicio de descanso de 8h continuas

### Regla 4 · Descanso de 8h continuas (NOM-087 sección 4.6)

> En rutas que impliquen una conducción máxima de 14 horas, el
> conductor debe tener una pausa no menor a 8 horas continuas.

**Cómo lo hace G3 Drive**:

- Al iniciar un nuevo turno, verifica que el descanso previo
  fue ≥8h continuas
- Si no, alerta al dispatcher antes de asignar viaje
- Permite override solo con justificación escrita del responsable

## Pantallas nuevas en G3 Drive

### 1. Bitácora del día · Grid 24h

Pantalla principal del módulo. Replica el formato oficial de
NOM-087 pero en formato amigable para celular.

```
┌─────────────────────────────────────┐
│ ← Bitácora · DÍA 1                  │
│ MIE 28 MAY 2026                     │
├─────────────────────────────────────┤
│                                     │
│ CONDUCIENDO         06:00 ━━━━━━ 14h│ ← barra horizontal
│ PAUSA                              .│   por categoría,
│ AUX                          .  .  .│   24h en horizontal
│ EXCEPCIÓN                           │
│ DESCANSO   ━━━━━                    │
│                                     │
│         0   6   12   18   24        │ ← regla horaria
│                                     │
├─────────────────────────────────────┤
│ RESUMEN DEL DÍA                     │
│ Conduciendo:        7h 15min        │
│ Pausa:              1h 30min        │
│ Auxiliares:         2h 00min        │
│ Descanso:           8h 00min        │
│ Excepciones:        0h 00min        │
├─────────────────────────────────────┤
│ ✓ Cumple NOM-087 al 100%            │ ← status compliance
└─────────────────────────────────────┘
```

**Interacción**:
- Tocar una barra → ver detalle por hora (eventos puntuales)
- Botón flotante: + Registrar evento (auto-clasifica)
- Header con tab para cambiar entre DÍA 1 y DÍA 2

### 2. Pausa obligatoria · Pantalla bloqueante

Aparece automáticamente a las 5h continuas conduciendo:

```
┌─────────────────────────────────────┐
│                                     │
│            ⏸️  PAUSA                 │
│         OBLIGATORIA                 │
│                                     │
│   Has conducido 5 horas continuas.  │
│   Por NOM-087-SCT-2-2017 debes      │
│   pausar 30 minutos.                │
│                                     │
│         ┌───────────┐               │
│         │           │               │
│         │   30:00   │               │ ← countdown circular
│         │           │               │
│         └───────────┘               │
│                                     │
│         tiempo restante             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ ⚠ Reportar Caso de Excepción│   │ ← si hay emergencia
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Reglas UX**:
- Pantalla bloqueante real — no se cierra hasta cumplir o reportar
  caso de excepción
- Si reporta excepción, requiere foto + descripción
- Vibración suave cada 5 min para confirmar que el operador no se
  durmió

### 3. Caso de Excepción · Registro rápido

```
┌─────────────────────────────────────┐
│ ← Atrás                             │
│                                     │
│ CASO DE EXCEPCIÓN                   │
│                                     │
│ TIPO                                │
│ ┌─────────────┐ ┌─────────────┐     │
│ │ 🚨 Accidente│ │ ▲ Avería    │     │
│ └─────────────┘ └─────────────┘     │
│ ┌─────────────┐ ┌─────────────┐     │
│ │ 🚧 Bloqueo  │ │ 🌪️ Clima    │     │
│ └─────────────┘ └─────────────┘     │
│                                     │
│ DESCRIPCIÓN (obligatoria)           │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ EVIDENCIA (mínimo 1 foto)           │
│ ┌─────┐ ┌─────┐ ┌─────┐             │
│ │  📷 │ │     │ │     │             │
│ └─────┘ └─────┘ └─────┘             │
│                                     │
│ Ubicación GPS: capturada ✓          │
│ Hora: 11:23 capturada ✓             │
│                                     │
│ [ Reportar ahora ]                  │
└─────────────────────────────────────┘
```

**Reglas UX**:
- Foto y GPS son **obligatorios** (NOM-087 3.4: "evidenciadas
  documentalmente")
- Hora se sella automáticamente — el operador no puede falsificar
- Se notifica simultáneamente al dispatcher

### 4. Exportar Bitácora · PDF oficial

```
┌─────────────────────────────────────┐
│ ← Atrás                             │
│                                     │
│ EXPORTAR BITÁCORA                   │
│                                     │
│ Periodo                             │
│ [ 27 may - 28 may  ▾ ]              │ ← rango 2 días
│                                     │
│ Conductor: Pedro Pérez              │
│ Unidad: T-038 · ABC-12-34           │
│ Origen: CDMX → Destino: Monterrey   │
│                                     │
│ Cumplimiento NOM-087                │
│ ✓ Pausas obligatorias respetadas    │
│ ✓ Tiempo máximo de conducción       │
│ ✓ Casos de excepción documentados   │
│ ✓ Firma digital del conductor       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Vista previa del PDF oficial    │ │ ← thumbnail
│ │ Formato SCT NOM-087-SCT-2-2017  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ 📄 Generar PDF oficial ]          │
│ [ 📧 Enviar por correo ]            │
│ [ 💬 Compartir por WhatsApp ]       │
└─────────────────────────────────────┘
```

**Reglas UX**:
- PDF replica el formato oficial NOM-087 (página 1 del documento)
- Incluye la página de aspectos relevantes de la norma (página 2)
- Firma digital del conductor (firma con el dedo, ya implementada
  en POD) → válida según LFEA
- QR code en el PDF: escanéable por inspector para verificar
  autenticidad contra el backend G3

### 5. Registrar evento · NOM-087 aware

Reemplaza la pantalla anterior de Logbook. Ahora cada evento se
clasifica automáticamente en una categoría NOM-087:

```
┌─────────────────────────────────────┐
│ ← Cancelar                          │
│                                     │
│ REGISTRAR EVENTO                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⛽ Carga de combustible         │ │ ← Auxiliar (NOM-087 3.5)
│ │ $4,860 · 180 L                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🚧 Caseta / peaje               │ │ ← Conduciendo (no auxiliar)
│ │ $340                            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🍔 Comida                       │ │ ← Pausa (NOM-087 3.6)
│ │ $220 · 25 min                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📦 Inicio de carga              │ │ ← Auxiliar (3.5)
│ │ Cliente: Bimbo                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📤 Inicio de descarga           │ │ ← Auxiliar (3.5)
│ │ Cliente: Lala                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🛑 Retén / Inspección           │ │ ← Auxiliar (3.5)
│ │ G.N. / F.G.R. / SEDENA          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Cambios vs versión anterior**:
- Más eventos predefinidos alineados a NOM-087
- Cada evento muestra a qué categoría suma (chip pequeño)
- Comida ahora se reconoce como pausa (cuenta hacia los 30 min
  obligatorios)
- Retén nuevo evento (frecuente en MX, NOM-087 lo reconoce
  explícitamente)

## Estructura de datos · backend

### Nuevo schema `hours_of_service`

```sql
CREATE TABLE trips.hours_of_service (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips.trips(id) NOT NULL,
  driver_id UUID REFERENCES drivers.drivers(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'CONDUCIENDO', 'PAUSA', 'AUXILIAR', 'EXCEPCION', 'DESCANSO'
  )),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_min INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at))/60
  ) STORED,
  -- Para EXCEPCION
  exception_type TEXT CHECK (exception_type IN (
    'ACCIDENTE', 'AVERIA', 'BLOQUEO', 'CLIMA', 'OTRO'
  )),
  exception_description TEXT,
  exception_evidence_url TEXT[], -- fotos
  -- Para eventos puntuales
  event_type TEXT CHECK (event_type IN (
    'INICIO_VIAJE', 'COMIDA', 'DESCANSO', 'DESCARGA',
    'RETEN', 'DESCOMPOSTURA', 'CIERRE_VIAJE', 'CARGA'
  )),
  -- Ubicación
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Inmutable después de creación
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hos_trip ON trips.hours_of_service(trip_id, started_at);
CREATE INDEX idx_hos_driver_day ON trips.hours_of_service(driver_id, DATE(started_at));
```

### Endpoint nuevo en trips-service

```
POST   /api/trips/:tripId/hos              Registrar entrada
GET    /api/trips/:tripId/hos              Bitácora de 1 viaje
GET    /api/drivers/:driverId/hos/today    Estado actual NOM-087
GET    /api/drivers/:driverId/hos/period   Bitácora de N días
POST   /api/trips/:tripId/hos/export       Generar PDF oficial
```

### Eventos Pub/Sub nuevos

```typescript
'hos.driving_started'        { driverId, tripId, startedAt }
'hos.driving_paused'         { driverId, durationDriving }
'hos.pause_required'         { driverId, minutesRemaining }
'hos.daily_limit_warning'    { driverId, hoursDriven, hoursToLimit }
'hos.daily_limit_reached'    { driverId, hoursDriven }
'hos.exception_reported'     { driverId, tripId, type, evidence }
'hos.bitacora_exported'      { tripId, format: 'pdf', period }
```

## PDF oficial · plantilla

El PDF generado replica el formato de NOM-087-SCT-2-2017
exactamente:

- **Página 1 (anverso)**:
  - Datos del permisionario, conductor, vehículo
  - Origen, puntos intermedios, destino
  - Grid 24h × 5 categorías para DÍA 1 y DÍA 2
  - Casos de Excepción totalizados
  - Actividades Auxiliares totalizadas
  - Firma digital del conductor (con su huella biométrica si
    el dispositivo lo soporta)
  - Firma digital del responsable (cuando autoriza desde G3 Admin)
- **Página 2 (reverso)**:
  - Aspectos relevantes de la norma (NOM-087 secciones 3.4, 3.5,
    3.6, 4.1, 4.2, 4.6, 4.7, 7.1, 8.3.1)
  - QR code para verificar autenticidad en `verify.g3logistics.mx`
  - Timestamp de generación + hash SHA-256

El PDF se genera en el backend (`trips-service`) usando el mismo
toolchain que ya tenemos (Puppeteer + HTML template) y se guarda
en Cloud Storage con CMEK (cumple QW-04 del catálogo DSI).

## Tier-gating

| Plan | Bitácora NOM-087 |
|---|---|
| **Free** | Captura básica + PDF oficial (1 unidad) |
| **Starter** | + Exportación masiva por flota |
| **Pro** | + Alertas automáticas anticipadas a admin |
| **Business** | + Dashboard de cumplimiento de flota completa + API |
| **Enterprise** | + Integración con sistemas SCT (cuando esté disponible) |

**Decisión**: la bitácora NOM-087 está **disponible desde Free**
porque es **obligatorio por ley**. No queremos ser el SaaS que
oculta cumplimiento normativo detrás de un paywall. Lo que se
monetiza son las capacidades de análisis y gestión sobre los
datos, no la captura legal mínima.

## Métricas de éxito

| Métrica | Target |
|---|---|
| % de viajes con bitácora 100% capturada | ≥ 98% |
| % de bitácoras exportadas a PDF antes de cierre | ≥ 95% |
| Multas SCT recibidas por flotas G3 / año | 0 |
| Tiempo medio de captura de Caso de Excepción | < 90 segundos |
| Falsos positivos en alertas de pausa | < 2% |
| NPS específico del módulo Bitácora (a operadores) | ≥ 65 |

## Cómo se rolla esto vs lo que ya existe

### Plan de migración del módulo Logbook actual

1. **Fase 1 (semana 1-2)**: Backend
   - Schema `hours_of_service` + migraciones
   - Endpoints nuevos en `trips-service`
   - Generador de PDF oficial con plantilla NOM-087
   - Tests de cumplimiento de las 4 reglas

2. **Fase 2 (semana 3-4)**: Mobile
   - Rediseño de `LogbookCreateScreen` con categorías NOM-087
   - Nueva `HoursOfServiceScreen` (grid 24h)
   - Nueva `PauseRequiredAlert` (full-screen blocker)
   - Nueva `ExceptionCaseScreen`
   - Nueva `BitacoraExportScreen`
   - Tracking automático de conducción vía GPS background

3. **Fase 3 (semana 5)**: Admin
   - Dashboard de cumplimiento de flota
   - Alertas anticipadas (driver con riesgo de incumplimiento)
   - Reporte mensual exportable

4. **Fase 4 (semana 6)**: Validación legal
   - Revisión del PDF generado con abogado especializado en
     transporte
   - Prueba con 3 flotas piloto + auditoría de retén real
   - Ajustes finales antes de release general

## Referencias

- **NOM-087-SCT-2-2017** texto oficial en DOF: ver el PDF
  `BITACORA_FINAL_SISTEMA.pdf` adjunto a este repositorio
- **LFEA** (Ley de Firma Electrónica Avanzada) — para validar
  firma digital del conductor
- **Anexo 20 del CFF** (CFDI) — para vincular con la carta porte

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Especificación inicial NOM-087 |
