# Ingesta de telemetría agnóstica · G3

> Prioridad 3 del roadmap: vehículo y dispositivo como entidades, con ingesta
> de telemetría agnóstica. Muchas flotas ya traen GPS de terceros; leerlo abre
> clientes **sin reinstalar equipo** y nos deja comparar Suntech, Teltonika y
> Queclink antes de elegir el proveedor de Fase 1.

Vive en `services/fleet` (no es un servicio nuevo): la telemetría es parte del
dominio de la flota y alimenta directamente `livePositions` y el recorrido.

## 1. Arquitectura

```
 Equipo GPS ──(TCP/UDP propietario)──▶ Plataforma del proveedor / middleware
                                         (servidor Suntech, flespi, listener
                                          Codec 8, servidor @Track Queclink)
                                                 │  HTTP POST (webhook)
                                                 ▼
 Gateway  /api/telemetry/ingest/:provider   (ruta PÚBLICA: sin JWT)
   · reenvía x-g3-ingest-token y el body (JSON o text/plain)
                                                 ▼
 fleet · TelemetryController.ingest  → 202 IngestResultDto
   1. provider ∈ {suntech, teltonika, queclink, generic}    (si no → 400)
   2. token → companyId  (sha256 + timingSafeEqual vs. todos  (si no → 401)
      los tokens vigentes, sin salida anticipada)
   3. ADAPTERS[provider](body)  → lecturas normalizadas + errores tipados
      (funciones puras, src/telemetry/adapters/*)
   4. por lectura:
        IMEI → Device (índice global). Si no existe o es de OTRA compañía
          → `unknown_device` (contado + registrado en /telemetry/unknown-devices)
        Device inactive            → `device_inactive`
        provider ≠ device.provider → `provider_mismatch` (salvo endpoint generic)
        (deviceId, recordedAt) ya existe → duplicado (idempotencia)
        guardar TelemetryPoint → device.status=active, lastSeenAt
          → tracto.lastLat/lastLng/lastSeenAt (si el punto es más nuevo)
          → evento `telemetry.position_received`
```

Archivos:

| Pieza | Archivo |
|---|---|
| DTOs / tipos | `contracts/src/dtos/telemetry.ts` |
| Evento de dominio | `contracts/src/events/telemetry.ts` |
| Adapters puros | `services/fleet/src/telemetry/adapters/{suntech,teltonika,queclink,generic}.ts` |
| Servicio de ingesta, tokens, recorrido | `services/fleet/src/telemetry/telemetry.service.ts` |
| CRUD de dispositivos y vínculo | `services/fleet/src/devices.service.ts` |
| Repos in-memory | `services/fleet/src/telemetry/in-memory.telemetry.repos.ts` |
| Controllers HTTP | `services/fleet/src/telemetry.controller.ts` |
| Errores → HTTP | `services/fleet/src/errors.ts`, `http-error.filter.ts` |

### Entidades

- **Device**: `id, companyId, provider, externalId (IMEI / ID de equipo), label,
  vehicleId, vehicleKind ('tractor'|'trailer'), status ('pending'|'active'|'inactive'),
  lastSeenAt, createdAt`. El `externalId` es **único global**: un IMEI no puede
  pertenecer a dos compañías (409 sin revelar a cuál pertenece). Un vehículo
  puede tener varios dispositivos; un dispositivo, a lo más un vehículo.
- **TelemetryPoint**: `deviceId, vehicleId, vehicleKind, companyId, provider,
  recordedAt (hora GPS), receivedAt, lat, lng, speedKph, headingDeg, ignition?,
  odometerKm?, fuelLevelPct?, eventCode?, raw`. Si el dispositivo no está
  vinculado, el punto se guarda con `vehicleId = null` (historial del equipo).
- **IngestToken**: por compañía, `g3it_<32 bytes base64url>`. Se guarda sólo
  `sha256`; el secreto se muestra **una vez** al crearlo. Se pueden tener
  varios a la vez (rotación) y revocar.

### Multi-tenant

- Todo lo autenticado por usuario usa `x-company-id` del gateway.
- La ingesta deduce la compañía **del token**, nunca del body. Un IMEI de otra
  compañía se trata como desconocido: no se puede inyectar posición a la flota
  ajena ni descubrir qué IMEIs existen.

### `livePositions` y recorrido

- `GET /tractors/live/positions` (Pro+, `FleetMap`): misma forma `LivePosition`
  de siempre; ahora sale de la **última telemetría** del tracto (incluye
  `speedKph`/`headingDeg`) con respaldo en `lastLat/lastLng` del tracto.
- `GET /vehicles/:id/track?from&to` (Pro+, `FleetMap`, gate en gateway y en
  servicio): tracto o remolque, ISO-8601, default últimas 24 h, máximo 7 días,
  máximo 5 000 puntos (`truncated: true` si hay más).

### Evento de dominio

`telemetry.position_received` (`TelemetryPositionReceivedEvent`) por cada punto
nuevo aceptado. Consumidores previstos: alerts (desvío de ruta, llegada tarde,
exceso de velocidad), trips (auto-avance de estado por geocerca), scoring.

## 2. Endpoints

| Método | Ruta (vía gateway `/api`) | Auth | Descripción |
|---|---|---|---|
| POST | `/telemetry/ingest/:provider` | `x-g3-ingest-token` | Webhook. 202 + `IngestResultDto` |
| GET | `/telemetry/ingest-tokens` | JWT owner/admin | Lista tokens (sin secreto) |
| POST | `/telemetry/ingest-tokens` | JWT owner/admin | Crea token `{ label? }` → incluye `token` una sola vez |
| DELETE | `/telemetry/ingest-tokens/:id` | JWT owner/admin | Revoca |
| GET | `/telemetry/unknown-devices` | JWT | IMEIs que reportaron sin estar registrados (onboarding) |
| GET/POST | `/devices` | JWT | Lista / alta `{ provider, externalId, label? }` |
| GET/PATCH/DELETE | `/devices/:id` | JWT | Detalle / `{ label?, status?: active\|inactive }` / baja |
| POST | `/devices/:id/link` | JWT | `{ vehicleId, vehicleKind: tractor\|trailer }` |
| POST | `/devices/:id/unlink` | JWT | Desvincula |
| GET | `/vehicles/:id/track?from&to` | JWT Pro+ | Recorrido |

Códigos: 400 proveedor/body inválido, 401 token, 402 plan, 403 rol, 404, 409 IMEI.

`IngestResultDto`:

```json
{ "provider": "queclink", "received": 3, "accepted": 1, "duplicates": 0,
  "unknownDevices": 1,
  "rejected": [
    { "code": "unknown_device", "message": "Dispositivo no registrado", "externalId": "8699..." },
    { "code": "no_gps_fix", "message": "Queclink: accuracy 0 (sin fix)", "externalId": "8605..." }
  ] }
```

Siempre respondemos 202 si el token es válido aunque haya rechazos por punto:
así el proveedor no reintenta en bucle mensajes que nunca serán válidos.

## 3. Cómo conectar un proveedor

1. **Registrar los equipos**: `POST /api/devices` por cada IMEI con su
   `provider`, y vincular con `POST /api/devices/:id/link`.
2. **Crear un token**: `POST /api/telemetry/ingest-tokens` (owner/admin).
   Guardar el `token` (no se vuelve a mostrar).
3. **Configurar el forward** en la plataforma del proveedor / middleware:
   - URL: `https://<gateway>/api/telemetry/ingest/<provider>`
   - Header: `x-g3-ingest-token: g3it_...`
   - Body: el formato del proveedor (abajo).
4. **Verificar**: la respuesta 202 trae `accepted`. IMEIs no registrados
   aparecen en `GET /api/telemetry/unknown-devices` para darlos de alta.

Ejemplo:

```bash
curl -X POST https://api.g3.mx/api/telemetry/ingest/queclink \
  -H 'x-g3-ingest-token: g3it_xxx' -H 'content-type: text/plain' \
  --data-binary '+RESP:GTFRI,300400,860599001234567,GV300,,10,1,1,72.5,184,2240.3,-99.133209,19.432608,20240518143210,0334,0020,3C1F,0402ED4C,00,12345.6,,,,,,20240518143212,0A1B$'
```

## 4. Formatos soportados

Coordenadas inválidas se descartan siempre: no numéricas, fuera de rango
(|lat|>90, |lng|>180) o (0,0). Los mensajes sin fix GPS también
(`no_gps_fix`). Los timestamps se normalizan a ISO UTC.

### Suntech (ST300 / ST4300) — ASCII `;`

`text/plain` (una línea por mensaje) o JSON `{ "messages": ["..."] }`.

```
ST300STT;205027329;04;1097B;20240518;14:32:10;3d8b1;+19.432608;-099.133209;072.50;184.20;9;1;12345678;13.81;100000;1;0042;...
HDR     ;DEV_ID   ;MDL;SW   ;DATE    ;TIME    ;CELL ;LAT       ;LON        ;SPD   ;CRS   ;SAT;FIX;DIST(m);PWR;IO;MODE;MSG_NUM
```

- Headers `STT`, `ALT`, `EMG`, `EVT` (con o sin prefijo `ST300`/`ST4300`).
  `eventCode` = `ALT|EMG|EVT` (null en `STT`). `ALV` (keep-alive) → `unsupported_message`.
- `FIX=1` requerido. `DIST` (m) → `odometerKm`. Primer bit de `IO` = ignición.
- **No cubierto**: protocolo "Universal" con `REP_MAP` (firmware ST300 ≥ 3);
  necesita un parser por máscara.

### Queclink (@Track: GV300, GV55, GL300…) — ASCII `,` terminado en `$`

`text/plain` (mensajes separados por `$` o salto de línea) o `{ "messages": [...] }`.

```
+RESP:GTFRI,<proto>,<IMEI>,<name>,<ext pwr>,<report id>,<number>,
  <accuracy>,<speed>,<azimuth>,<alt>,<LON>,<LAT>,<YYYYMMDDHHMMSS>,<mcc>,<mnc>,<lac>,<cell>,<res>,  (× number)
  <mileage>,...,<send time>,<count>$
```

- **Longitud antes que latitud.**
- Se ancla cada posición en su timestamp GPS (14 dígitos precedido de lon/lat
  decimales), así sirve para `GTFRI` multi-posición, `GTIGN/GTIGF` (ignición),
  `GTSOS`, `GTSPD`, `GTGEO`… sin índices fijos por modelo.
- `+BUFF:` = igual que `+RESP:` (mensajes del buffer). `+ACK:`/`GTHBD` → `unsupported_message`.
- `accuracy=0` → `no_gps_fix`. `mileage` sólo en el formato tipo GTFRI.
- `eventCode` = tipo de reporte (null en `GTFRI`).

### Teltonika (FMB/FMC…) — JSON vía middleware

**Supuesto**: Teltonika transmite Codec 8/8E binario por TCP; G3 no abre ese
socket. Un middleware (flespi, listener TCP propio o forward HTTP) decodifica
y nos manda:

```json
{ "imei": "352093081234567",
  "records": [{ "timestamp": "2024-05-18T14:32:10Z",
                "gps": { "lat": 19.43, "lng": -99.13, "speed": 72, "angle": 184, "satellites": 11 },
                "eventId": 239,
                "io": { "239": 1, "16": 12345678, "89": 64 } }] }
```

- `timestamp` ISO o epoch (ms / s). También se acepta un arreglo de envíos.
- AVL IDs: `239` ignición, `16` odómetro (m → km), `89` combustible % (fallback `48`).
- `satellites: 0` → `no_gps_fix`. `eventId` ≠ 0 → `eventCode: "io:<id>"`.

### generic — JSON ya normalizado

Para middlewares propios u otros proveedores. Acepta cualquier dispositivo de
la compañía sin importar su `provider`.

```json
{ "points": [{ "externalId": "X-1", "recordedAt": "2024-05-18T14:32:10Z",
               "lat": 19.4, "lng": -99.1, "speedKph": 50, "headingDeg": 90,
               "ignition": true, "odometerKm": 1234.5, "fuelLevelPct": 40, "eventCode": null }] }
```

### Agregar un proveedor

Una función pura `(body: unknown) => AdapterResult` en
`src/telemetry/adapters/`, una entrada en `ADAPTERS`, el literal en
`TELEMETRY_PROVIDERS` (contracts) y tests con payloads reales.

## 5. Qué falta para producción

- **Persistencia TypeORM/Postgres** (hoy in-memory, se pierde al reiniciar):
  - `devices` con `UNIQUE(external_id)` global, índice `(company_id)`.
  - `telemetry_points` con `UNIQUE(device_id, recorded_at)` (idempotencia vía
    `INSERT ... ON CONFLICT DO NOTHING`), particionada por mes, índice
    `(company_id, vehicle_id, recorded_at)`; retención (ej. 13 meses) o
    TimescaleDB/PostGIS.
  - `vehicle_last_position` (upsert con `WHERE excluded.recorded_at > recorded_at`).
  - `ingest_tokens(hash)`; con muchas compañías conviene token
    `g3it_<id>.<secreto>` para buscar por id y comparar un solo hash.
- **Pub/Sub**: hoy `NoopEventBus` en `main.ts`. Usar `PubSubEventBus` como en
  `services/auth`. Para volumen alto: el webhook sólo valida + encola
  (`g3-telemetry-raw`) y un worker hace parseo/persistencia; agrupar eventos
  por batch.
- **Codec 8/8E binario TCP (Teltonika)** y protocolos TCP nativos de
  Suntech/Queclink: listener TCP (GKE/Compute Engine, no Cloud Run) que haga
  ACK al equipo y publique en `generic`/`teltonika` JSON. Hoy dependemos del
  middleware del proveedor.
- Suntech "Universal" (`REP_MAP`), Queclink GTERI/sensores CAN, fuel por
  proveedor.
- Rate limit por token, tamaño máx. de batch, rechazo de timestamps en el
  futuro lejano, alertas cuando un dispositivo deja de reportar.
- Al borrar un tracto/remolque, desvincular sus dispositivos.
- UI en G3 Admin: alta de dispositivos, tokens y lista de IMEIs desconocidos.
