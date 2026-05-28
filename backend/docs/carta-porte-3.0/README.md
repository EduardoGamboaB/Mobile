# Módulo Carta Porte 3.0 · G3

> Implementación del módulo de Carta Porte 3.0 en G3 Admin —
> gancho de adquisición #1 para nuevos clientes según
> [`holding/strategy/niche-opportunities.md`](../../../holding/strategy/niche-opportunities.md).

## Estado actual

| Item | Estado |
|---|---|
| Spec técnica | ✓ [spec.md](./spec.md) |
| Plan operativo 90 días | ✓ [operational-plan.md](./operational-plan.md) |
| Comparativa PACs SAT | ✓ [pac-comparison.md](./pac-comparison.md) |
| Backend skeleton (generador + PAC mock + service) | ✓ con 23 tests verdes |
| Pitch comercial | ✓ [pitch.md](./pitch.md) |
| Integración con PAC real | Pendiente · semana 5 del plan |
| UI Admin web | Pendiente · semana 6 del plan |
| Auto-generación desde viaje cerrado | Pendiente · semana 4 |
| Beta interna | Pendiente · semana 7 |

## Estructura de archivos

```
backend/
├── docs/carta-porte-3.0/
│   ├── README.md              ← este índice
│   ├── spec.md                ← spec técnica completa
│   ├── operational-plan.md    ← plan 90 días
│   ├── pac-comparison.md      ← selección de PAC SAT
│   └── pitch.md               ← pitch comercial y landing
│
└── services/invoicing/        ← nuevo microservicio
    ├── package.json
    ├── src/
    │   ├── carta-porte/
    │   │   ├── types.ts       ← input types alineados con SAT
    │   │   └── generator.ts   ← genera XML con complemento 3.0
    │   ├── cfdi/
    │   │   └── generator.ts   ← envolvente CFDI 4.0
    │   ├── pac/
    │   │   ├── pac.provider.ts ← interfaz
    │   │   └── mock.provider.ts ← mock para tests + dev
    │   └── invoice.service.ts  ← orquesta generador + PAC
    └── test/
        ├── carta-porte.generator.spec.ts (15 tests)
        ├── invoice.service.spec.ts (8 tests)
        └── fixtures/sample-ingreso.ts
```

## Implementación

### Lo que ya está construido

- ✅ Tipos TypeScript del input (`CartaPorteInput`)
- ✅ Generador del XML CFDI 4.0 + complemento Carta Porte 3.0
- ✅ Validaciones de negocio (peso, distancia, operador, peligrosa)
- ✅ Soporte para tipo Ingreso (transportista cobra)
- ✅ Soporte para tipo Traslado (dueño mueve carga)
- ✅ Soporte para mercancía peligrosa (UN code)
- ✅ Soporte internacional (entrada/salida + país)
- ✅ Múltiples mercancías por carta porte
- ✅ Idempotencia (mismo input + IdCCP = mismo XML)
- ✅ Interface PAC abstracta
- ✅ Mock PAC con simulación de rechazos SAT
- ✅ Servicio `InvoiceService` que orquesta todo el flujo
- ✅ Lógica de garantía: `guaranteeApplicable` si error nuestro
- ✅ Cancelación con validación de motivos (01 requiere
  sustituto)
- ✅ 23 tests TDD pasando

### Lo que falta para producción

- Adapter `DiverzaProvider` (PAC primary) — semana 5
- Adapter `FacturamaProvider` (PAC backup) — semana 5
- `HighAvailabilityPacProvider` que failover automático — semana 5
- Esquema PostgreSQL + TypeORM repos — semana 3
- Endpoints HTTP REST + controller NestJS — semana 5-6
- Importación de catálogos SAT a DB — semana 5
- UI Admin web para emitir/listar/cancelar cartas porte — semana 6
- Auto-generación desde evento `trip.delivered` (Pub/Sub) — semana 4
- Generador de PDF representativo — semana 6
- Verificación pública con QR — semana 6

## Tests

```bash
cd backend
npm test --workspace services/invoicing

# 23 tests · 2 suites:
#   ✓ CartaPorteGenerator (15 tests)
#     - estructura XML válida
#     - tipo Ingreso vs Traslado
#     - validaciones de negocio
#     - internacional
#     - mercancías múltiples
#     - idempotencia
#   ✓ InvoiceService (8 tests)
#     - stamping happy path
#     - rejection con código SAT
#     - garantía de reembolso (si error nuestro)
#     - cancelación con motivos
#     - métricas
```

## Decisiones de diseño

### 1. Multi-PAC desde día 1
Configuración con primary + backup (Diverza + Facturama). Si
primary falla, failover automático en < 30s. Sin punto único
de falla en flujo fiscal crítico.

### 2. Garantía explícita en código
El campo `guaranteeApplicable: boolean` viene en cada
`InvoiceResult` rechazado. Si es `true`, el frontend muestra
"No te cobramos el timbre" y se ejecuta reembolso automático.
Si es `false`, el error es del usuario (RFC inválido, etc.) y
se le explica qué corregir.

### 3. IdCCP opcional para idempotencia
El SAT requiere que cada CFDI tenga IdCCP único, pero si un
timbrado falla por causa transitoria del PAC, debemos poder
reintentar con el mismo IdCCP. Solución: `input.idCCP` es
opcional; si no se pasa, se genera random.

### 4. Validaciones antes del PAC
Las reglas de negocio (peso ≥ 0, distancia coherente, operador
asignado, etc.) se validan en código local antes de enviar al
PAC. Esto:
- Ahorra timbres rechazados (caros)
- Da error rápido al usuario
- Reduce tasa de rechazo SAT a < 2%

### 5. Datos sensibles fuera de logs
Por compliance LFPDPPP, los logs **no incluyen** RFC, nombre o
domicilio. El logger anota `companyId` + `invoiceId` interno.

## Métricas que se trackean en producción

| Métrica | Target | Alerta si... |
|---|---|---|
| P95 tiempo de generación XML | < 3s | > 5s |
| P95 tiempo de respuesta PAC | < 12s | > 20s |
| Tasa de aceptación SAT 1er intento | ≥ 98% | < 95% |
| Tasa de error nuestro | < 0.5% | > 1% |
| Throughput pico | 100 timbres/s | < 50 |
| Garantías reembolsadas / total timbres | < 0.5% | > 1% |

## Cómo correr el módulo localmente

```bash
cd backend
npm install
npm test --workspace services/invoicing

# Test de un timbrado completo:
npm exec ts-node services/invoicing/scripts/demo.ts
# (script pendiente · genera un XML de muestra y lo "timbra"
#  con MockPac)
```

## Roadmap de versiones

| Versión | Cuándo | Cambios |
|---|---|---|
| **0.1** | Hoy | Spec + skeleton + 23 tests verdes |
| **0.2** | Semana 3 | + Schema PostgreSQL + repos |
| **0.3** | Semana 5 | + Diverza adapter + Facturama backup |
| **0.4** | Semana 6 | + UI Admin + auto-gen desde viaje |
| **0.5** | Semana 7 | + Beta interna (G3 Logistics + 4 clientes) |
| **1.0** | Semana 12 | Producción · launch público |

---

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-05-28 | README inicial · skeleton implementado |
