# Spec técnico · Módulo de Carta Porte 3.0

> Documento técnico para implementar el complemento Carta Porte 3.0
> dentro de CFDI 4.0 del SAT en G3 Admin.

## 1. Qué exige el SAT

El **complemento Carta Porte 3.0** es obligatorio desde 2024 para
cualquier CFDI que ampare el traslado de bienes/mercancías por
autotransporte federal en México. Lo emite quien factura el flete
(tipo Ingreso) o quien mueve su propia mercancía (tipo Traslado).

### Versión actual
- **CFDI 4.0** (estándar fiscal vigente)
- **Carta Porte 3.0** (complemento publicado en Anexo 20 RMF 2024)

### Tipos de CFDI con Carta Porte

| Tipo | Cuándo usar | Quién lo emite |
|---|---|---|
| **Ingreso (I)** | Transportista cobra por el servicio de flete | Transportista al cliente |
| **Traslado (T)** | Dueño de la mercancía la mueve a sí mismo | Dueño de la carga |

### Excepciones (no requieren Carta Porte)
- Traslado local ≤ 30 km en zona urbana
- Servicio de paquetería con guía propia
- Mercancía propia transportada con vehículos propios sin
  facturar el flete (privado, ≤ 5 t)

## 2. Estructura del XML

El XML tiene 3 capas anidadas:

```
<cfdi:Comprobante> (CFDI 4.0)
  ├─ <cfdi:Emisor>            ← quien factura
  ├─ <cfdi:Receptor>          ← cliente
  ├─ <cfdi:Conceptos>
  │   └─ <cfdi:Concepto>      ← descripción genérica del servicio
  ├─ <cfdi:Impuestos>
  └─ <cfdi:Complemento>
      └─ <cartaporte30:CartaPorte> ← AQUÍ va el complemento
          ├─ <cartaporte30:Ubicaciones>
          │   ├─ <cartaporte30:Ubicacion TipoUbicacion="Origen">
          │   ├─ <cartaporte30:Ubicacion TipoUbicacion="Destino">
          │   └─ (intermedias opcionales)
          ├─ <cartaporte30:Mercancias>
          │   └─ <cartaporte30:Mercancia> (1 a N)
          │       ├─ <cartaporte30:CantidadTransporta> (si va a múltiples destinos)
          │       └─ <cartaporte30:DetalleMercancia> (mercancía peligrosa, refrigerada, etc.)
          └─ <cartaporte30:Mercancias>
              └─ <cartaporte30:Autotransporte>
                  ├─ <cartaporte30:IdentificacionVehicular>
                  ├─ <cartaporte30:Seguros>
                  └─ <cartaporte30:Remolques>
                      └─ <cartaporte30:Remolque> (0-2)
          └─ <cartaporte30:FiguraTransporte>
              └─ <cartaporte30:TiposFigura Tipo="01">  ← operador
```

Más el **TimbreFiscalDigital** que agrega el PAC al final.

## 3. Modelo de datos · esquemas G3

### Tabla `invoicing.invoices` (CFDI master)

```sql
CREATE TABLE invoicing.invoices (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES auth.companies(id) NOT NULL,
  trip_id UUID REFERENCES trips.trips(id),

  -- CFDI 4.0
  cfdi_version TEXT DEFAULT '4.0',
  series TEXT NOT NULL,                       -- ej. 'CP'
  folio TEXT NOT NULL,                        -- número interno
  uuid_sat TEXT UNIQUE,                       -- UUID del SAT (post-timbrado)
  cfdi_type TEXT NOT NULL                     -- 'I' (Ingreso) o 'T' (Traslado)
    CHECK (cfdi_type IN ('I', 'T')),

  -- Emisor (G3 o nuestro cliente que factura)
  issuer_rfc TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_tax_regime TEXT NOT NULL,             -- c_RegimenFiscal

  -- Receptor
  receiver_rfc TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_zip TEXT NOT NULL,
  receiver_tax_regime TEXT NOT NULL,
  receiver_use_cfdi TEXT NOT NULL,             -- c_UsoCFDI (G03, S01, etc.)

  -- Montos
  subtotal DECIMAL(15,2) NOT NULL,
  iva DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  payment_form TEXT NOT NULL,                  -- c_FormaPago
  payment_method TEXT NOT NULL,                -- PUE / PPD

  -- Carta Porte 3.0 (siempre asociada en este módulo)
  carta_porte_version TEXT DEFAULT '3.0',
  transport_international BOOLEAN DEFAULT FALSE,
  total_distance_km DECIMAL(10,2) NOT NULL,

  -- Estado del proceso
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',              -- borrador editable
      'validating',         -- enviando a PAC
      'stamped',            -- timbrado por PAC y SAT
      'rejected',           -- SAT rechazó (con motivo)
      'cancelled'           -- cancelado por solicitud
    )),

  -- PAC + SAT
  pac_provider TEXT,                           -- 'diverza' / 'facturama' / etc.
  pac_request_id TEXT,
  sat_seal TEXT,                               -- sello digital SAT (post-timbrado)
  sat_certificate_number TEXT,
  sat_stamping_date TIMESTAMPTZ,
  sat_rejection_code TEXT,                     -- código si rejected
  sat_rejection_message TEXT,

  -- Archivos
  xml_url TEXT,                                -- XML timbrado en Cloud Storage
  pdf_url TEXT,                                -- representación impresa

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  stamped_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  UNIQUE (company_id, series, folio)
);

CREATE INDEX idx_invoices_company_date ON invoicing.invoices(company_id, created_at DESC);
CREATE INDEX idx_invoices_status ON invoicing.invoices(status) WHERE status != 'stamped';
CREATE INDEX idx_invoices_trip ON invoicing.invoices(trip_id) WHERE trip_id IS NOT NULL;
```

### Tabla `invoicing.locations` (ubicaciones de carta porte)

```sql
CREATE TABLE invoicing.locations (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoicing.invoices(id) ON DELETE CASCADE NOT NULL,
  sequence INT NOT NULL,                       -- 1=Origen, 2=Destino, 3+=intermedio

  location_type TEXT NOT NULL                  -- 'Origen' / 'Destino'
    CHECK (location_type IN ('Origen', 'Destino')),
  id_location TEXT NOT NULL,                   -- OR/DE + 6 dígitos (ej. OR000001)

  rfc TEXT,                                    -- RFC del cliente en este punto
  name TEXT,

  zip TEXT NOT NULL,                           -- c_CodigoPostal SAT
  state TEXT NOT NULL,                         -- c_Estado
  municipality TEXT,                           -- c_Municipio
  locality TEXT,                               -- c_Localidad
  reference TEXT,                              -- referencia visual

  scheduled_date TIMESTAMPTZ NOT NULL,         -- FechaHoraSalida o FechaHoraProgramada
  distance_to_next_km DECIMAL(10,2),           -- DistanciaRecorrida (si destino o intermedio)

  -- Coordenadas (no van al XML pero las guardamos)
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6)
);

CREATE INDEX idx_locations_invoice ON invoicing.locations(invoice_id, sequence);
```

### Tabla `invoicing.merchandise` (mercancías)

```sql
CREATE TABLE invoicing.merchandise (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoicing.invoices(id) ON DELETE CASCADE NOT NULL,
  sequence INT NOT NULL,

  -- Identificación
  product_service_code TEXT NOT NULL,          -- c_ClaveProdServ (8 dígitos)
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_code TEXT NOT NULL,                     -- c_ClaveUnidad
  unit_description TEXT,

  -- Peso y dimensiones
  weight_kg DECIMAL(15,3) NOT NULL,            -- PesoEnKg

  -- Valor
  value_amount DECIMAL(15,2) NOT NULL,         -- ValorMercancia
  value_currency TEXT DEFAULT 'MXN',
  tariff_code TEXT,                            -- FraccionArancelaria si internacional

  -- Especiales
  is_dangerous BOOLEAN DEFAULT FALSE,
  un_code TEXT,                                -- c_MaterialPeligroso si peligrosa
  packing_code TEXT,                           -- c_TipoEmbalaje

  -- Distribución entre destinos (cuando hay múltiples)
  cantidad_destinos JSONB,                     -- [{ id_destino, cantidad }]

  notes TEXT
);

CREATE INDEX idx_merchandise_invoice ON invoicing.merchandise(invoice_id);
```

### Tabla `invoicing.autotransport` (vehículo + remolques + seguros)

```sql
CREATE TABLE invoicing.autotransport (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoicing.invoices(id) ON DELETE CASCADE NOT NULL,

  -- Permiso SCT
  perm_sct TEXT NOT NULL,                      -- c_TipoPermiso (TPAF01-TPAF18)
  perm_number TEXT NOT NULL,                   -- NumPermisoSCT

  -- Vehículo
  config TEXT NOT NULL,                        -- c_ConfigAutotransporte (T01-T20)
  plate_vm TEXT NOT NULL,                      -- PlacaVM
  vehicle_year INT NOT NULL,                   -- AnioModeloVM

  -- Seguro de responsabilidad civil
  insurance_civil_company TEXT NOT NULL,
  insurance_civil_policy TEXT NOT NULL,

  -- Seguro de mercancía (si transporta carga peligrosa o de alto valor)
  insurance_cargo_company TEXT,
  insurance_cargo_policy TEXT,
  insurance_cargo_amount DECIMAL(15,2),

  -- Tractor referencia interna (vincula con fleet.tractors)
  tractor_id UUID REFERENCES fleet.tractors(id)
);

CREATE TABLE invoicing.autotransport_trailers (
  id UUID PRIMARY KEY,
  autotransport_id UUID REFERENCES invoicing.autotransport(id) ON DELETE CASCADE NOT NULL,
  subtype TEXT NOT NULL,                       -- c_SubTipoRem (CTR001-CTR031)
  plate TEXT NOT NULL,
  trailer_id UUID REFERENCES fleet.trailers(id)
);
```

### Tabla `invoicing.operators` (operadores por CFDI)

```sql
CREATE TABLE invoicing.operators (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoicing.invoices(id) ON DELETE CASCADE NOT NULL,

  type_figura TEXT NOT NULL DEFAULT '01'       -- 01=Operador, 02=Propietario, 03=Arrendador, 04=Notificado
    CHECK (type_figura IN ('01', '02', '03', '04')),

  rfc TEXT NOT NULL,
  name TEXT NOT NULL,
  federal_license_number TEXT NOT NULL,        -- NumLicencia

  driver_id UUID REFERENCES drivers.drivers(id),

  -- Address (solo si tipo Notificado)
  address_data JSONB
);

CREATE INDEX idx_operators_invoice ON invoicing.operators(invoice_id);
```

## 4. Endpoints REST

```
POST   /api/invoices                          Crear borrador
GET    /api/invoices                          Listar (filtros: status, fecha, cliente)
GET    /api/invoices/:id                      Ver detalle (con relaciones)
PATCH  /api/invoices/:id                      Editar borrador
DELETE /api/invoices/:id                      Eliminar borrador

POST   /api/invoices/:id/preview-xml          Generar XML para vista previa (sin timbrar)
POST   /api/invoices/:id/stamp                Enviar a PAC para timbrar
POST   /api/invoices/:id/cancel               Cancelar CFDI timbrado

GET    /api/invoices/:id/xml                  Descargar XML timbrado
GET    /api/invoices/:id/pdf                  Descargar PDF representativo

POST   /api/invoices/from-trip/:tripId        Auto-generar borrador desde un viaje cerrado

GET    /api/catalogs/clave-prodserv?q=...     Búsqueda en catálogo (60K items)
GET    /api/catalogs/clave-unidad
GET    /api/catalogs/cp/:zip                  Validar y obtener estado/municipio
GET    /api/catalogs/material-peligroso?q=... Buscar UN codes
```

## 5. Catálogos SAT necesarios

Hay que importar y mantener actualizados estos catálogos. Vienen
como Excel publicados por SAT en su portal.

| Catálogo | Tamaño aprox | Frecuencia actualización |
|---|---|---|
| c_ClaveProdServ | 60,000+ items | trimestral |
| c_ClaveUnidad | 1,800 | anual |
| c_CodigoPostal | 145,000 | trimestral |
| c_Estado, c_Municipio, c_Localidad | 3,000 | anual |
| c_ConfigAutotransporte | 20 | rara vez |
| c_SubTipoRem | 31 | rara vez |
| c_TipoPermiso | 18 | rara vez |
| c_MaterialPeligroso | 3,200 | semestral |
| c_TipoEmbalaje | 200 | anual |
| c_RegimenFiscal | 35 | anual |
| c_UsoCFDI | 25 | anual |
| c_FormaPago | 22 | rara vez |
| c_TipoComprobante | 5 | nunca |
| c_FiguraTransporte | 4 | nunca |

**Estrategia**: importar todos al boot del servicio + job semanal
que verifica versión en SAT.

## 6. Flujo end-to-end (happy path)

```
[1] Operador cierra viaje G3-2026-00134 en G3 Drive
    └─ Trip status = 'delivered'
    └─ Evento Pub/Sub: trip.delivered

[2] invoicing-service consume el evento
    └─ Auto-genera borrador de carta porte con:
        ├─ Origen / destino del trip
        ├─ Operador asignado
        ├─ Tractor + remolque del trip
        ├─ Distancia recorrida calculada
        └─ Pre-llena fechas reales

[3] Owner en G3 Admin recibe notificación:
    "Nueva carta porte lista para revisar (G3-2026-00134)"

[4] Owner abre el borrador:
    ├─ Verifica receptor (cliente) — autocompletado de su contactos
    ├─ Captura monto facturado del flete (si es Ingreso)
    ├─ Verifica mercancía declarada (descripción + peso)
    └─ Tap "Vista previa XML"

[5] Backend genera XML local:
    ├─ Valida estructura contra XSD oficial SAT
    ├─ Si OK → muestra preview en Admin
    └─ Si falla → muestra errores en lenguaje claro

[6] Owner tap "Timbrar":
    ├─ Backend envía a PAC en HTTP
    ├─ PAC sella digitalmente y envía a SAT
    ├─ SAT valida y devuelve UUID + sello SAT
    └─ Tiempo total: 8-20 segundos

[7] Resultado:
    ├─ Status = 'stamped'
    ├─ XML + PDF guardados en Cloud Storage
    ├─ Notificación push al owner: "Carta porte timbrada · UUID xxx"
    ├─ Email automático al cliente (receptor) con XML+PDF adjuntos
    └─ Evento Pub/Sub: invoice.stamped
```

## 7. Validaciones y reglas de negocio

### Antes de timbrar

| Validación | Tipo |
|---|---|
| RFC emisor activo en SAT | API SAT |
| RFC receptor activo en SAT | API SAT |
| Régimen fiscal del receptor compatible con uso CFDI | Tabla compatibilidad |
| Código postal válido y compatible con estado | Catálogo SAT |
| Distancia total > suma de tramos | Lógica |
| Peso total ≥ peso de mercancías | Lógica |
| Operador con licencia vigente (NumLicencia válido) | DB G3 |
| Vehículo con permiso SCT vigente | DB G3 |
| Si hay mercancía peligrosa → seguro cargo obligatorio | Lógica |
| Si transporte internacional → datos aduanales obligatorios | Lógica |

### Después del timbrado

- Inmutable: el XML timbrado no se modifica jamás
- Cancelación: requiere motivo (códigos 01-04 del SAT) y se
  envía a SAT como solicitud (puede tardar 72h)
- Sustitución: si se canceló por error, se emite nuevo y se
  vincula con el cancelado

## 8. Manejo de errores del SAT

El SAT devuelve códigos numéricos cuando rechaza. Catálogo
clave (lista parcial):

| Código | Mensaje SAT | Mensaje G3 al usuario |
|---|---|---|
| 1 | Estructura inválida del CFDI | Hay un error técnico en la generación. Te ayudamos a resolverlo. |
| 5 | RFC del emisor no se encuentra en LCO | Tu RFC no está activo ante SAT. Verifica en sat.gob.mx |
| 305 | Certificado no corresponde al emisor | Hay un problema con nuestro PAC. Intenta de nuevo. |
| 401 | Fecha y hora de generación fuera de rango | La fecha del viaje es inválida (más de 72h vieja). |
| 414 | Conceptos sin descripción | Hace falta la descripción de la mercancía. |
| CP201 | TipoUbicacion no corresponde | Revisa origen/destino del viaje. |
| CP203 | NumPermisoSCT inválido | Verifica el permiso SCT del tracto en Fleet. |
| ... | ... | ... |

**Política**: cada código rejection se traduce a mensaje en
español claro con un CTA (revisar X, llamar a soporte, etc.).

## 9. Cancelación de CFDI

SAT distingue 4 motivos:

| Motivo | Cuándo | Requiere aceptación del receptor |
|---|---|---|
| **01** | Comprobante emitido con errores con relación | Sí (espera 72h) |
| **02** | Comprobante emitido con errores sin relación | No |
| **03** | No se llevó a cabo la operación | No |
| **04** | Operación nominativa relacionada con factura global | No |

Si se sustituye (motivo 01), hay que emitir nuevo CFDI ANTES de
cancelar y vincular UUID.

## 10. Garantía comercial · contrato técnico

### Definición operativa

**"Si SAT rechaza por error nuestro, te reembolsamos el timbre."**

Aplica cuando:
- ✅ Status final = `rejected`
- ✅ El código de rechazo está en la lista de "errores nuestros"
  (lista en `pac/error-codes.ts`)
- ✅ Reclamo se hace en ≤ 30 días naturales
- ❌ NO aplica si el rechazo es por:
  - RFC inválido del cliente (responsabilidad del usuario)
  - Régimen fiscal incompatible (validable antes)
  - Cliente registrado tarde en LCO
  - Errores en data capturada por el usuario

### Implementación técnica

- Backend mide tiempo de respuesta del PAC
- Si error en lista de "nuestros", marca `garantia_aplicable=true`
- Front muestra: "Esta carta tuvo error. Como fue nuestro, no te
  cobramos el timbre. Generamos nueva automáticamente."
- Customer Success Lead aprueba reembolsos > 5 por cliente/mes

### Provisión financiera

Asumiendo tasa de error real ≤ 0.5% y precio timbre $7 MXN:
- 50,000 timbres/mes × 0.5% × $7 = $1,750 MXN/mes
- Reservar $5K MXN/mes para garantías (3x el cálculo)

## 11. Métricas técnicas a trackear

- Tiempo P50 / P95 de generación XML (target P95 < 5s)
- Tiempo P50 / P95 de respuesta del PAC (target P95 < 15s)
- Tasa de aceptación SAT primer intento (target ≥ 98%)
- Tasa de error nuestro (target ≤ 0.5%)
- Tasa de cancelación (informativo, varía por cliente)
- Throughput máximo (target 100 timbres/segundo en peak)

## 12. Estándares de calidad

- 100% de cobertura de tests en `cfdi/` y `carta-porte/`
- Validación XSD obligatoria antes de cada `pac.stamp()`
- Cero logs con RFC o datos personales (cumple LFPDPPP)
- Cifrado at-rest del XML timbrado (CMEK + Cloud Storage)
- Audit log de cada acción (créate, edit, stamp, cancel)

---

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Spec inicial · CFDI 4.0 + Carta Porte 3.0 |
