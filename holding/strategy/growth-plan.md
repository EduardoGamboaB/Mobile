# G3 · Plan de crecimiento de producto

> Plan estratégico de evolución del producto G3 desde **plataforma
> operativa** (donde estamos hoy) hacia un **ecosistema multi-lado
> tipo Uber para la logística mexicana**. 5 fases · 36 meses ·
> 7 marketplaces interconectados.

| Fecha | Q2 2026 |
|---|---|
| Estado actual | G3 Drive + G3 Admin con código completo · en validación sobre la operación propia · SaaS pre-revenue |
| Estado a 36 meses | Ecosistema con 7 productos B2B2C · 50,000+ unidades · presencia LATAM |
| Versión documento | 1.0 |

---

## 1. La visión a 5 años

> **G3 es el sistema operativo de la logística de carga en América
> Latina** — la única plataforma donde un transportista resuelve
> *todo* lo que necesita para mover carga: tecnología operativa,
> servicios de carretera, contratación de operadores, renta de
> activos, fletes, seguros y crédito.

Lo que hace que el plan sea creíble: **dogfooding**. G3 opera flota
propia. Cada producto del ecosistema se valida primero contra
nuestra propia operación antes de venderse al mercado.

## 2. Por qué un ecosistema y no apps independientes

La ventaja competitiva no son los productos individuales — es la
**data que se genera y los efectos de red que se acumulan**:

```
   ┌──────────────────────────────────────────────────────────┐
   │              G3 Drive (operadores)                        │
   │              G3 Admin (owners/dispatchers)                │
   │                       │                                   │
   │                       ▼                                   │
   │              Plataforma core                              │
   │   ┌───────────────────┼───────────────────┐               │
   │   │                   │                   │               │
   │ Telemetría        Operaciones         Identidad           │
   │ (IoT, sensores)   (viajes, bitácora)  (operadores,         │
   │   │                   │                empresas)           │
   │   └───────────┬───────┴───────┬────────┬┘                │
   │               │               │        │                  │
   │               ▼               ▼        ▼                  │
   │       ┌───────────────┐ ┌─────────┐ ┌─────────┐           │
   │       │ MARKETPLACES  │ │ FINANCE │ │ SEGUROS │           │
   │       │ Roadside      │ │ Crédito │ │ Pólizas │           │
   │       │ Fletes        │ │ Factoring│ │ Carga  │           │
   │       │ Renta tractos │ └─────────┘ │ Tracto  │           │
   │       │ Renta trailer │             └─────────┘           │
   │       │ Talento       │                                   │
   │       └───────────────┘                                   │
   └──────────────────────────────────────────────────────────┘
```

Cada interacción en cualquier marketplace **alimenta la data** que
hace mejores a todos los demás. Esto es exactamente el flywheel de
Uber, Mercado Libre, Rappi — pero aplicado a un sector que en MX
sigue operando con WhatsApp y Excel.

## 3. Las 7 iniciativas en orden estratégico

### Mapping a submarcas del holding

Las iniciativas que mencionaste **ya están contempladas** en la
arquitectura de marca documentada en
[`holding/brand/v2-enterprise/architecture/sub-brands.md`](../brand/v2-enterprise/architecture/sub-brands.md).
Cada una de las 16 submarcas planeadas tiene su lugar:

| # | Iniciativa | Submarca | Tipo |
|---|---|---|---|
| 1 | Plataforma operativa (actual) | **G3 Drive · G3 Admin** | SaaS B2B |
| 2 | IoT + telemetría | **G3 Fleet** | SaaS + hardware |
| 3 | Marketplace roadside (SOS) | **G3 Market** | Marketplace on-demand |
| 4 | Marketplace de fletes | **G3 Freight** | Marketplace B2B |
| 5 | Marketplace de operadores | **G3 Talent** | Marketplace + ATS |
| 6 | Renta de activos | **G3 Market** (extensión) | Marketplace |
| 7 | Servicios financieros | **G3 Finance · G3 Secure** | Marketplace fintech |

Los productos transversales que sostienen todo:
**G3 AI** (modelos sobre la data), **G3 Analytics** (BI),
**G3 Cloud** (infra), **G3 Connect** (API/integraciones),
**G3 Control** (command center 24/7), **G3 Flow** (RPA).

## 4. Roadmap por fases · 36 meses

### Fase 0 · YA · Plataforma core (Q2 2026 — código completo, pre-producción)

**Productos**: G3 Drive · G3 Admin · backend microservicios · bitácora NOM-087
**Estado**: validación interna sobre ~12 unidades de G3 Logistics · sin clientes SaaS externos · 200+ tests verdes
**Headcount**: 101 personas (línea base actual)

Lo que hay que cerrar para arrancar Fase 1:
- [ ] Producción real para Logistics (no solo staging)
- [ ] 5-10 clientes externos beta del SaaS
- [ ] Llegar a **500+ unidades** en plataforma (entre propias y clientes)
- [ ] Validación legal NOM-087 con auditor externo
- [ ] Stripe real conectado (reemplaza FakeStripeProvider)

**Métrica de salida**: 500 unidades activas · NPS ≥ 60 · churn < 3%/mes

---

### Fase 1 · Q3-Q4 2026 · Telemetría y datos (G3 Fleet)

**Por qué primero**: sin datos de telemetría no podemos diferenciar
con competencia ni habilitar Fase 4 (finance/seguros usan esta data
para tarificar riesgo). **Esta fase NO genera revenue grande, pero
sin ella, las fases 4-5 no se pueden hacer.**

**Producto**: G3 Fleet · capa de IoT integrada a G3 Admin

**Sensores prioritarios**:

| Sensor | Para qué | Costo aprox/unidad | Proveedor |
|---|---|---|---|
| **OBD-II tracker** | RPM, velocidad, ubicación, combustible | $1,500 MXN | Teltonika, Queclink |
| **Cámara DVR + IA fatiga** | Prevención de choques, detección de fatiga (microsueños) | $8,000 MXN | Hikvision, MiX Telematics |
| **Sensor de presión llantas (TPMS)** | Presión y temperatura por llanta | $5,000 MXN (set 18 llantas) | Continental, Doran |
| **Sensor combustible (capacitivo)** | Litros consumidos vs reportados | $3,500 MXN | Escort Online |
| **Sensor en remolque (refrigerado)** | Temperatura cadena de frío | $4,000 MXN | Carrier, Thermo King APIs |

**Modelo comercial**:
- Hardware se vende como **CAPEX** al cliente (G3 facilita compra/financiamiento)
- Software de visualización se cobra como **add-on $300/unidad/mes** sobre el plan base

**Estrategia de implementación**:
- **Mes 1-2**: Selección de proveedores + protocolo de comunicación (MQTT)
- **Mes 3-4**: Instalación en flota propia G3 (~40 unidades) — dogfooding
- **Mes 5-6**: Piloto con 3 clientes Pro (15-20 unidades cada uno)
- **Mes 7-8**: Release general

**KPIs**:
- 100 unidades con telemetría completa al cierre Q4 2026
- Reducción de incidentes en flota propia: ≥ 30% (vs pre-IoT)
- Reducción de robo de combustible: ≥ 50% (medido por diferencia entre sensor y bitácora)

**Capital necesario**: ~$1.5M MXN
- Compra de hardware piloto: $800K
- Desarrollo de adapters/SDK: $400K (2 ingenieros × 4 meses)
- Validación regulatoria con SCT: $300K (auditor + permisos)

---

### Fase 2 · Q1-Q2 2027 · Marketplace Roadside (G3 Market)

**Por qué primero entre los marketplaces**:
1. **Sesión corta** (servicio de 1-3 horas) — más fácil de validar product-market fit
2. **Pago al momento** — no requiere infraestructura compleja de cobranza
3. **Aprovecha el botón SOS que ya existe** en G3 Drive
4. **La demanda ya existe** — los operadores G3 ya llaman a llanteras/grúas, solo formalizamos el match

**Producto**: 3 verticales on-demand desde el SOS de G3 Drive

| Vertical | Cuándo se dispara | Tiempo respuesta esperado |
|---|---|---|
| 🛠️ **Grúa** | Avería que impide moverse | < 90 min |
| 🛞 **Llantera** | Ponchadura / cambio de llanta | < 60 min |
| 🔧 **Mecánico** | Falla que se puede atender en sitio | < 90 min |

**Flujo**:
```
Operador en carretera → toca "Necesito ayuda" en G3 Drive
   → Selecciona tipo (grúa / llantera / mecánico)
   → App calcula los 3-5 proveedores más cercanos
   → Envía solicitud al primero (con foto del problema + GPS)
   → Si no acepta en 5 min, pasa al siguiente
   → Proveedor acepta → ETA visible para operador y dispatch
   → Pago al término: tarjeta corporativa de la empresa o efectivo
```

**Modelo comercial**:
- **Comisión de 15%** sobre el servicio (estándar en marketplaces tipo Uber)
- **Membresía Premium** para proveedores: $499/mes da priority queue + branding
- **Subscripción flota**: incluido en planes Pro+ con tarifas preferentes

**Estrategia de bootstrap** (chicken-and-egg):
- **Oferta inicial**: empezamos firmando 50 proveedores en CDMX + 30 en MTY + 30 en GDL — los reclutamos con un equipo de partnerships dedicado (3 personas)
- **Demanda inicial**: la flota propia G3 + los 500 clientes ya en plataforma generan ~200 solicitudes/mes desde el primer día
- **Subsidio de pruebas**: G3 absorbe la comisión los primeros 30 días para garantizar volumen al proveedor

**KPIs Q2 2027**:
- 200 proveedores activos en MX (las 3 principales ciudades)
- 1,000 servicios/mes
- NPS de proveedores ≥ 50
- Tiempo medio respuesta < 75 min
- Margen bruto ≥ 60%

**Capital necesario**: ~$3M MXN
- Equipo de partnerships (3 personas × 6 meses): $1.2M
- Desarrollo software (matching engine + provider app): $1M
- Subsidio de bootstrap: $500K
- Marketing local (radio + activación en patios): $300K

---

### Fase 3 · Q3-Q4 2027 · Marketplace de Fletes (G3 Freight)

**Por qué es el core del play**: el marketplace de fletes es donde
está el **volumen de revenue del ecosistema**. Una flota Pro/Business
mueve $200K-$2M MXN/mes en carga. Una comisión del 8-12% sobre eso
es un revenue grande y recurrente.

**Producto**: 2 lados

#### Lado embarcador (cliente con carga)
- Publica el flete: origen, destino, tipo de carga, fecha, peso
- Cotización transparente (la app sugiere tarifa basada en histórico)
- Puede aceptar la primera oferta o elegir entre varias
- Pago con factura CFDI 4.0 + carta porte 3.0 automática

#### Lado transportista (con tractos disponibles)
- Ve fletes disponibles con filtros (zona, tipo, monto)
- Cotiza o toma con un tap
- Ya tiene perfil + scoring (de G3 Drive) → el embarcador puede ver su reputación
- Cobra al cierre del viaje vía G3 Finance (Fase 4 lo conecta)

**Diferenciador vs Uber Freight / Convoy**:
- **Carta porte 3.0 automática** — el embarcador ya no la hace a mano
- **Bitácora NOM-087 incluida** — el transportista ya cumple regulación
- **Visibilidad en vivo** del viaje (G3 Drive) — el embarcador ve dónde va su carga
- **POD digital** firmado al instante

**Modelo comercial**:
- **Comisión sobre el flete**: 8% al transportista + 2% al embarcador (10% total)
- **Plan empresa embarcador**: $5,000 MXN/mes para volumen alto, comisión baja al 4%

**Estrategia de bootstrap**:
- **Embarcadores iniciales**: los clientes existentes de G3 Logistics (~50 clientes activos). Los onboardeamos primero al marketplace, ofreciéndoles la opción de **publicar excedente** que G3 no puede atender (esto antes lo hacían por teléfono con otros transportistas).
- **Transportistas iniciales**: la base de 500 unidades en G3 Drive. Activarles "buscar fletes" como feature opt-in.
- **Etapa supply-first**: necesitamos tener 200+ transportistas listos antes de abrir la app al público.

**KPIs Q4 2027**:
- 50 embarcadores activos publicando fletes
- 500 transportistas registrados, 200 activos (tomaron ≥1 flete/mes)
- 800 fletes facturados/mes via marketplace
- GMV (Gross Merchandise Value): $40M MXN/mes
- Take rate efectivo: 9%
- Revenue: ~$3.6M MXN/mes

**Capital necesario**: ~$8M MXN
- Equipo producto + ingeniería (8 personas × 9 meses): $4M
- Generador de carta porte 3.0 (integración con PAC SAT): $1M
- Equipo onboarding embarcadores (4 personas): $1.5M
- Marketing dirigido a embarcadores: $1.5M

---

### Fase 4 · Q1-Q2 2028 · Marketplace de Operadores (G3 Talent)

**Producto**: dos lados de un mercado laboral de operadores
profesionales

#### Lado operador
- Crea perfil: licencia, experiencia, rutas dominadas, score G3
- Disponibilidad: empleado, freelance, busca cambio
- Ve ofertas filtradas (zona, sueldo, tipo de unidad)

#### Lado transportista
- Publica vacante o "necesito X cubriendo Y ruta"
- Ve operadores compatibles ordenados por score y match
- Verificación automática:
  - Licencia federal vigente (consulta SCT)
  - Antidoping (provider integrado)
  - Background check (provider integrado)
- Contrato digital con firma electrónica
- Pago: opción de nómina o por viaje (vinculado a G3 Drive)

**Diferenciador**: el operador llega con **historial de scoring real** desde G3 Drive. No es un CV inflado — son métricas reales (puntualidad, incidentes, consumo de combustible).

**Modelo comercial**:
- **Cuota de colocación al transportista**: 50% de un mes de sueldo
- **Membresía premium para operadores**: $199/mes (gratis para empezar) por priority en matches
- **Verificaciones**: cargo único de $1,500 por antidoping + $800 por background check

**Estrategia de bootstrap**:
- **Operadores iniciales**: los 46 conductores de G3 Logistics ya tienen perfil completo. Más los ~1,000 conductores de clientes en plataforma.
- **Empresas iniciales**: los clientes Pro+ del SaaS son el primer canal de demanda — ya nos conocen.

**KPIs Q2 2028**:
- 5,000 operadores con perfil activo
- 200 empresas usando G3 Talent
- 300 colocaciones/mes
- Revenue: ~$3M MXN/mes

**Capital necesario**: ~$5M MXN
- Producto + ingeniería (5 personas × 6 meses): $1.8M
- Integraciones (SCT consulta, antidoping, background): $1M
- Equipo legal + HR (contratos digitales): $700K
- Marketing y eventos (foros de transportistas): $1.5M

---

### Fase 5 · Q3 2028 · Marketplace de Activos (Renta tractos/remolques)

**Producto**: extensión de G3 Market para activos pesados

#### Renta de tractos
- Owner publica tracto disponible (días, semanas, meses)
- Renter (otro transportista) ve unidades por zona y tipo
- Verificación obligatoria:
  - Licencia federal del renter
  - Seguro de responsabilidad civil
  - Depósito garantía (10% del valor)
- Contrato digital + ENTREGA con foto + ESTADO con foto
- Devolución con inspección documentada en G3 Drive

#### Renta de remolques
- Similar pero menor riesgo (no se conduce)
- Útil para temporadas altas (Buen Fin, fin de año, cosechas)

**Modelo comercial**:
- **Comisión sobre la renta**: 12%
- **Seguro de daños obligatorio**: 3% del valor de la renta (revenue share con aseguradora — pre-Fase 6)
- **Servicio de custodia opcional**: $500/día por tracking enhanced

**Estrategia de bootstrap**:
- **Oferta inicial**: tractos en mantenimiento de G3 Logistics que no se usan + ofertas a clientes con flotas grandes
- **Demanda**: transportistas chicos que en temporada alta necesitan más capacidad sin comprar

**Riesgo principal**: pérdida o daño del activo. Requiere:
- Seguro robusto desde día 1
- GPS forzoso (vía G3 Fleet)
- Inmovilizador remoto en caso de incumplimiento
- Acuerdo con custodia profesional para recuperación

**KPIs Q4 2028**:
- 200 tractos publicados
- 500 remolques publicados
- 100 rentas/mes
- Revenue: ~$2M MXN/mes

**Capital necesario**: ~$4M MXN

---

### Fase 6 · 2029 · Marketplace Financiero (G3 Finance + G3 Secure)

**Por qué llegamos aquí al final**: estos productos solo funcionan
si tenemos **3 cosas que se construyen en fases previas**:

1. **Volumen de usuarios** (al menos 2,000 transportistas activos)
2. **Data de comportamiento** (telemetría de Fase 1 + historial de viajes/pagos de Fases 2-5)
3. **Reputación operativa** (G3 lleva 36 meses operando sin incidentes regulatorios)

#### G3 Finance · Productos crediticios

- **Crédito para renovación de unidades**: $200K-$2M MXN, plazos 24-60 meses
  - Tasa preferencial por scoring G3 (operadores con score 8+ obtienen tasa hasta 30% mejor que mercado)
- **Factoring de viajes**: adelanto de pagos de embarcadores grandes
  - Cobra 1.5% sobre el monto factorizado, pago a 30 días
- **Crédito revolvente de combustible**: línea para gasolineras
- **Microcréditos para llantas/refacciones**: $20K-$80K, plazos cortos

**Modelo**: G3 no presta capital propio (al menos no en Fase 6) — actúa como **originador y servicer**. Tiene partnerships con financieras (Findep, Compartamos Banco, Crediclub, eventualmente bancos tier 1) y se queda con **3-5% de origination fee**.

#### G3 Secure · Marketplace de seguros

- **Pólizas de carga** (mercancía transportada)
- **Pólizas de tracto** (RC + daños propios)
- **Pólizas de remolque**
- **Seguro de operador** (accidentes personales, gastos médicos)

**Modelo**: marketplace puro. Aseguradoras (GNP, AXA, Mapfre, Quálitas) suben pólizas, G3 muestra cotizaciones comparables, transportista elige. **G3 cobra comisión del 8-12%** sobre la prima.

**Diferenciador**: el scoring G3 + telemetría permite **pólizas dinámicas** — pagas menos si manejas bien, las cámaras de prevención de fatiga bajan la tarifa.

**KPIs 2029**:
- $50M MXN de cartera de crédito originada
- $15M MXN de primas de seguro intermediadas
- Revenue G3: ~$4M MXN/mes (entre los dos)

**Capital necesario**: ~$10M MXN
- Equipo financiero senior (Director + analistas de crédito): $3M
- Compliance + licencias CNBV (figura SOFOM si decidimos prestar capital propio en Fase 7): $2M
- Tecnología (modelos de scoring crediticio): $2M
- Marketing + activación: $3M

---

## 5. Resumen ejecutivo · Roadmap visual

```
        2026                    2027                    2028              2029
   Q2    Q3    Q4    Q1    Q2    Q3    Q4    Q1    Q2    Q3    Q4    Q1   Q2
   │     │     │     │     │     │     │     │     │     │     │     │
   ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
[FASE 0     ] [    FASE 1     ] [FASE 2     ] [FASE 3     ] [FASE 4  ] [FASE 5 ] [FASE 6]
 Plataforma   IoT/Telemetría     Roadside     Fletes       Talent     Renta   Finance
 core         G3 Fleet           G3 Market    G3 Freight   G3 Talent  G3 Mkt  +Secure
```

| Fase | Trimestre | Iniciativa | Submarca | Revenue mensual al cierre |
|---|---|---|---|---|
| 0 | Q2 2026 | Plataforma core | Drive + Admin | Pre-revenue (beta) |
| 1 | Q4 2026 | IoT y telemetría | G3 Fleet | $1.5M MXN |
| 2 | Q2 2027 | Marketplace Roadside | G3 Market | $3M MXN |
| 3 | Q4 2027 | Marketplace Fletes | G3 Freight | $7M MXN |
| 4 | Q2 2028 | Marketplace Operadores | G3 Talent | $10M MXN |
| 5 | Q4 2028 | Marketplace Activos | G3 Market (ext) | $12M MXN |
| 6 | Q2 2029 | Finance + Seguros | G3 Finance + G3 Secure | $18M MXN |

**Revenue acumulado a cierre Q2 2029**: ~$220M MXN/año

## 6. Estrategia para resolver el "chicken-and-egg" de marketplaces

El problema clásico: los marketplaces necesitan oferta y demanda al
mismo tiempo. **G3 tiene una ventaja única que la mayoría de startups
de marketplace no tienen**:

### Ventaja 1 · Flota propia operando

G3 Logistics genera **1,200+ viajes/mes con flota propia**. Eso significa:
- Demanda garantizada en G3 Market (nuestros operadores piden grúa/llantera)
- Demanda garantizada en G3 Freight (nuestros embarcadores son los primeros)
- Oferta garantizada en G3 Talent (nuestros 46 operadores son perfiles iniciales)
- Oferta garantizada en G3 Market (nuestros tractos son el inventario inicial)

### Ventaja 2 · 500-2,000 clientes ya en plataforma

Antes de abrir cualquier marketplace, ya tenemos clientes pagando
por G3 Drive + Admin. Esos clientes son el **trampolín de demanda
controlada** — los podemos invitar a probar el marketplace nuevo sin
gastar marketing.

### Ventaja 3 · Subsidio inteligente, no masivo

Uber gastó miles de millones en bootstrap. Nosotros no podemos
hacer eso, pero tampoco lo necesitamos porque:
- **Verticalizamos** (no competimos con Uber Freight en todo el mundo, ganamos MX primero)
- **Aprovechamos relaciones** (nuestros embarcadores actuales nos conocen)
- **Subsidiamos selectivamente** (solo los primeros 30 días en cada zona)

## 7. Capital y plan financiero

### Necesidades de capital por fase

| Fase | Inversión | Acumulado | Fuente sugerida |
|---|---|---|---|
| 0 | $0 (ya invertido) | $0 | Fundadores |
| 1 | $1.5M MXN | $1.5M | **Pre-seed / fundadores** · ~$1–1.5M USD (G3 Logistics no aporta capital) |
| 2 | $3M MXN | $4.5M | Mismo pre-seed |
| 3 | $8M MXN | $12.5M | **Ronda Seed Q1 2027** · $5M USD |
| 4 | $5M MXN | $17.5M | Misma ronda Seed |
| 5 | $4M MXN | $21.5M | **Series A Q3 2028** · $15-25M USD |
| 6 | $10M MXN | $31.5M | Misma Series A |

### Justificación de la S.A.P.I.

Ya documenté en
[`holding/README.md`](../README.md) que **G3 Tech es una S.A.P.I.
de C.V.** Esto es **deliberado** porque permite:

- **Cap table flexible** para incluir inversionistas (Seed + Series A)
- **Vesting de equity** para fundadores y equipo tech senior
- **Plan de stock options** para retener talento
- **Eventual conversión a S.A.B. de C.V.** si llegamos a IPO

### Hitos de valuación esperados

- **Seed Q1 2027** (post Fase 2): $25-35M USD pre-money
- **Series A Q3 2028** (post Fase 4): $80-120M USD pre-money
- **Series B 2030** (post LATAM expansion): $300-500M USD pre-money

## 8. Crecimiento de equipo

Headcount por fase. Línea base actual: 101 personas
([`organization/01-structure.md`](../organization/01-structure.md)).

| Fase | Trimestre | Headcount total | Hires nuevos | Áreas que crecen |
|---|---|---:|---:|---|
| 0 | Q2 2026 | 101 | base | — |
| 1 | Q4 2026 | 125 | +24 | IoT engineers, hardware partnerships, ops |
| 2 | Q2 2027 | 170 | +45 | Partnerships, customer success, marketplace ops |
| 3 | Q4 2027 | 240 | +70 | Sales empresariales, account managers, ingeniería |
| 4 | Q2 2028 | 310 | +70 | HR tech, verificaciones, legal |
| 5 | Q4 2028 | 360 | +50 | Insurance/finance equipo (origen y servicer) |
| 6 | Q2 2029 | 450 | +90 | Finance senior, compliance CNBV, modelos |

**Funciones críticas a hire en orden de prioridad**:

| Trimestre | Rol crítico |
|---|---|
| Q3 2026 | VP Hardware / IoT |
| Q4 2026 | Head of Partnerships (proveedores roadside) |
| Q1 2027 | VP Marketplace (G3 Market) |
| Q2 2027 | VP Sales (canal embarcadores) |
| Q3 2027 | Head of Trust & Safety (verificaciones operadores) |
| Q4 2027 | General Counsel Senior (regulación financiera) |
| Q1 2028 | VP Finance Products (origination + scoring) |
| Q2 2028 | Director Compliance CNBV |

## 9. Dependencias técnicas críticas

### Capa de plataforma core (Fase 0)

Lo que YA tenemos:
- ✅ Auth + multi-tenancy por companyId
- ✅ Backend microservicios + Pub/Sub
- ✅ Mobile + Admin con tier gating
- ✅ Bitácora NOM-087

Lo que falta para soportar el resto:
- [ ] Geo service (búsqueda por proximidad, geohash, ETA)
- [ ] Notifications service (push + SMS + email + webhook)
- [ ] Payments service real (Stripe Connect para marketplace + SPEI)
- [ ] Identity service (KYC, verificación documentos)
- [ ] Rating & reviews service (reusable across marketplaces)

### Lo que cada fase requiere de la fase previa

```
Fase 0 → necesita NADA externo
Fase 1 → necesita Fase 0 estable + protocolo MQTT/IoT
Fase 2 → necesita Fase 0 + Geo service + Notifications + Identity verificada
Fase 3 → necesita Fase 0 + Identity de operadores + Carta porte 3.0
Fase 4 → necesita Fase 0 + Fase 1 (scoring real) + Identity profunda
Fase 5 → necesita Fase 1 (telemetría obligatoria) + insurance del Fase 6 anticipado
Fase 6 → necesita Fase 1 (data) + Fase 3-5 (volumen) + reputación operativa 36+ meses
```

Este orden no es opcional. **Si saltamos pasos, el riesgo regulatorio
y operativo se multiplica.**

## 10. Estrategia de expansión geográfica

### Año 1-2 (Fases 0-2)
Solo **México**. CDMX → MTY → GDL para roadside.
Cobertura nacional para Drive/Admin/Fleet.

### Año 3 (Fases 3-4)
**México completo** + entrada selectiva a:
- **Guatemala** (similar regulación, frontera norte)
- **Belice** (lazo comercial con MX)

### Año 4-5 (Fases 5-6)
**Centroamérica** completa + entrada a:
- **Colombia** (mercado grande de transporte)
- **Perú** (similar marco regulatorio)

### Año 6+ (post-Series B)
**Brasil**, **Chile**, **Argentina** vía adquisición o joint
venture local.

## 11. Riesgos principales y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cambio regulatorio NOM-087 / SCT | Media | Alto | Equipo legal monitoreando + lobbying con CANACAR |
| Competencia entra con capital grande (Uber Freight MX) | Alta | Alto | Vertical depth + relación con clientes + flota propia como moat |
| Datos personales (LFPDPPP, INAI) | Media | Alto | Política DSI ya documentada · Quick wins implementados |
| Hackeo de sensores IoT (fleet) | Media | Alto | Pen testing trimestral · firmware signing · VPN privada |
| Concentración en mercado MX (FX/macro) | Alta | Medio | Diversificar a Centroamérica desde Año 3 |
| Talent tech caro (escasez de senior MX) | Alta | Medio | Equity en S.A.P.I. · cultura del brand book ya documentada |
| Fraude en marketplaces (carga fantasma, operadores falsos) | Alta | Alto | Trust & Safety team desde Fase 2 · verificación con SCT/antidoping |
| Reseña pública negativa por SOS mal atendido | Media | Alto | SLA estricto con proveedores · escalation a admin · seguro de responsabilidad |
| Aseguradoras no firman partnership | Baja | Alto | Plan B: G3 actúa como agente independiente (cédula CNSF) en lugar de marketplace |

## 12. Métricas de éxito · North Star por fase

| Fase | North Star | Métricas guardrail |
|---|---|---|
| 0 | Unidades activas en plataforma | NPS ≥ 60 · churn < 3%/mes |
| 1 | % unidades con telemetría completa | Reducción incidentes ≥ 30% |
| 2 | Servicios roadside por unidad por mes | NPS proveedores ≥ 50 · tiempo respuesta < 75 min |
| 3 | GMV en fletes ($MXN/mes) | Take rate ≥ 9% · re-uso embarcadores ≥ 60% |
| 4 | Colocaciones de operadores por mes | Tiempo medio colocación < 7 días · permanencia 6+ meses ≥ 60% |
| 5 | Días-tracto rentados por mes | Daños/pérdida < 0.5% · ocupación ≥ 70% |
| 6 | Cartera viva (crédito) + primas anuales (seguro) | NPL < 4% (industria 7%) · cross-sell 40%+ clientes existentes |

## 13. Lo que se debe cerrar AHORA (próximos 60 días)

Antes de empezar Fase 1 (Q3 2026), hay decisiones clave:

- [ ] **Constituir formalmente las 3 entidades** del holding (Holding S.A. + Logistics S.A. + Tech S.A.P.I.)
- [ ] **Decidir el concepto de brand v2-enterprise** (ya están los 5 conceptos documentados)
- [ ] **Setup GCP de producción** + auditoría inicial DSI
- [ ] **Implementar VertexAIProvider real** (reemplazar stub en ai-service)
- [ ] **Conectar Stripe real** (reemplazar FakeStripeProvider en billing-service)
- [ ] **TypeORM contra Postgres real** (reemplazar in-memory repos)
- [ ] **5-10 clientes externos beta** del SaaS (firmados con LOI o contrato)
- [ ] **Selección de proveedor IoT principal** (RFP a Teltonika, Queclink, MiX)
- [ ] **Conversaciones exploratorias con financieras** para Fase 6 (sin compromiso, solo intel)
- [ ] **Term sheet preliminar con potencial inversor Seed** para Q1 2027

---

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Plan inicial basado en visión del fundador (audio del 27-may) |
