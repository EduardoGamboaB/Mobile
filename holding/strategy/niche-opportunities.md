# G3 · Oportunidades de nicho vertical

> Estrategia complementaria al [growth plan](./growth-plan.md):
> ¿en qué segmentos hiper-específicos del mercado podemos ganar
> antes de pelear por la categoría completa?

| Fecha | 2026-05-28 |
|---|---|
| Audiencia | Consejo · Strategy team · Ventas |
| Versión | 1.0 |

---

## 1. Por qué nichearse cuando ya tienes una visión amplia

La trampa: pensar que como tu producto puede servir a todo el
mercado, debes venderle a todo el mercado al mismo tiempo. Eso
diluye el go-to-market y hace que nadie te perciba como "el
indicado para mí".

El patrón ganador en plataformas B2B:

| Plataforma | Empezó con nicho | Expandió a |
|---|---|---|
| Stripe | Developers indie de US Bay Area | Pagos globales B2B/B2C |
| Shopify | SMB de e-commerce US/Canadá | Comercio omnicanal global |
| Uber | Black car en SF | Movilidad + delivery + freight global |
| Toast | Restaurantes independientes US | Hospitality completo |
| Brex | Y Combinator startups | Fintech corporativo |
| Faire | Boutiques en Nueva Inglaterra | Marketplace wholesale global |

**El patrón**: ganas un nicho con producto sobrediseñado para ese
nicho, **te conviertes en el estándar de ese nicho**, después
expandes con credibilidad lateral.

Para G3, el riesgo de no nichearse es: ser un "TMS más" entre
Samsara, Motive, Eclipse Total, etc. — sin razón concreta de por
qué un transportista en particular nos elige.

---

## 2. Framework de evaluación de nichos

Cada nicho lo evaluamos en 6 dimensiones:

| Dimensión | Pregunta |
|---|---|
| **Tamaño** | ¿Cuántas unidades / clientes potenciales hay en MX? |
| **Dolor** | ¿Cuál es el dolor agudo y específico del segmento? |
| **Regulación** | ¿Hay normas que la competencia genérica no cumple? |
| **Concentración** | ¿Pocos clientes grandes o muchos chicos? |
| **Fit con G3** | ¿Qué tan natural es extender G3 actual a este nicho? |
| **Riesgo** | ¿Qué puede salir mal? |

Cada uno se puntúa en escala 1-5 (5 = ideal para G3).

---

## 3. Los 7 nichos analizados

### Nicho 1 · Cadena de frío (refrigerado)

**Qué es**: transporte de productos que requieren temperatura
controlada — alimentos perecederos, productos lácteos, carnes,
farmacéutica, biotecnología, flores.

**Quién opera hoy en MX**: flotas dedicadas con reefer
(refrigerador en remolque). Clientes típicos: Lala, Bimbo,
Coca-Cola, FEMSA, Sigma, AstraZeneca, Pfizer.

**Tamaño**:
- ~30,000 unidades reefer en MX (estimación CANACAR)
- Mercado: ~$6-8B USD/año
- Tasa de crecimiento: 7-9% anual (alimentos congelados + farma
  posterior a COVID)

**Dolor único**:
- Cadena de frío rota = producto desperdiciado + cliente pierde
  contrato con farmacias/cadenas
- Auditoría obligatoria de temperatura por NOM-251 (FDA-like)
- Cualquier ruptura debe documentarse minuto a minuto
- Multas SAGARPA + sanción comercial del cliente

**Regulación específica**:
- **NOM-251-SSA1-2009** — Prácticas de higiene para alimentos
- **NOM-072-SSA1-2012** — Etiquetado de medicamentos
- **NOM-220-SSA1-2016** — Farmacovigilancia
- Carta porte con complemento de mercancías refrigeradas

**Fit con G3**:
- ALTO. Solo hace falta integrar sensores de temperatura
  reefer (ya en plan Fase 1 IoT) + módulo de auditoría de
  cadena de frío en G3 Admin + alertas en G3 Drive si la
  temperatura sale de rango
- Reusa toda la base actual (bitácora, evidencias, mapa, POD)

**Concentración**: media — hay flotas grandes (Solistica, Estafeta
Cold, Frialsa) pero también muchos transportistas medianos
sirviendo a cadenas locales

**Competidor específico**: **Carrier Transicold** y **Thermo King**
tienen software propio para monitoreo de reefer, pero solo es
de los compresores, no integrado con bitácora del operador.
Hay espacio enorme para producto unificado.

**Puntuación**:
- Tamaño: 4 · Dolor: 5 · Regulación: 5 · Concentración: 3 ·
  Fit: 5 · Riesgo: 3 = **Total 25/30**

**Modelo comercial sugerido**:
- Plan Pro+ + **add-on Cold Chain** ($499 MXN/unidad/mes)
- Hardware sensor temperatura: $4,000 MXN único
- Caso de venta: 1 rechazo de embarque por cadena rota cuesta
  $80K-$500K MXN. G3 evita ese rechazo y se paga solo.

---

### Nicho 2 · Materiales y residuos peligrosos

**Qué es**: transporte de combustibles, químicos industriales,
gases comprimidos, baterías, residuos peligrosos.

**Quién opera hoy en MX**: flotas certificadas con permiso SCT
específico. Clientes típicos: PEMEX, Cydsa, Mexichem (Orbia),
Cementos Mexicanos, Praxair Linde, hospitales con residuos.

**Tamaño**:
- ~15,000-20,000 unidades certificadas hazmat en MX
- Mercado: $3-4B USD/año
- Mayor barrera de entrada que carga seca = mejores márgenes
  (15-25% vs 8-12% en carga seca)

**Dolor único**:
- Permiso SCT específico que renueva anualmente
- Operador requiere capacitación adicional + certificación
- Inspección pre-viaje **mucho más estricta**: válvulas, fugas,
  etiquetas UN, hojas de seguridad
- Un derrame = catástrofe ambiental + multas millonarias +
  cárcel
- **Es el segmento que MÁS le importa al regulador**

**Regulación específica** (es densa):
- **NOM-002-SCT/2011** — Listado de materiales peligrosos
- **NOM-004-SCT/2008** — Etiquetado de materiales peligrosos
- **NOM-005-SCT/2000** — Información de emergencia
- **NOM-006-SCT-2/2011** — Diseño y construcción de unidades
- **NOM-007-SCT-2/2010** — Marcado de unidades
- **NOM-021-SCT-2/2014** — Características de elementos de
  inhibición de carga
- **NOM-028-SCT-2/2010** — Disposiciones especiales operación
- **NOM-040-SCT-2/2012** — Capacitación obligatoria
- + listado SCT de rutas autorizadas

**Fit con G3**:
- ALTO. G3 Drive ya cubre estructura de inspección pre-viaje
  (NOM-068) — extender a checklist hazmat-específico (40+
  puntos) es natural
- Bitácora NOM-087 + log de manipulación de carga peligrosa =
  documento único para auditoría
- Cámara IA con detección de fugas o derrames sería
  diferenciador único

**Concentración**: media — pocos clientes grandes pero
estratégicos. Si PEMEX o Pemex Logística firma con G3 hazmat,
es un contrato anchor que justifica todo el vertical.

**Competidor específico**: **TruckMate** de Trimble tiene módulo
hazmat pero está en inglés y enterprise-only. **HazMatNetwork**
es US-only. **En MX hay vacío total**.

**Puntuación**:
- Tamaño: 3 · Dolor: 5 · Regulación: 5 · Concentración: 4 ·
  Fit: 4 · Riesgo: 4 = **Total 25/30**

**Modelo comercial sugerido**:
- Plan Business + **add-on Hazmat** ($1,500 MXN/unidad/mes)
- Implementación inicial: $50K MXN (incluye configuración de
  checklist específico por tipo de material)
- Anchor client (un cliente grande tipo PEMEX, Cydsa o Praxair)
  + 5-10 cliente medianos = ramp inicial

---

### Nicho 3 · Cross-border MX-US (T-MEC)

**Qué es**: transporte que cruza la frontera norte de México a
USA — Laredo, El Paso, Reynosa, Nuevo Laredo, Mexicali, Tijuana.

**Tamaño**:
- ~$30B USD/año en flete cross-border MX-US (CANACAR + USMCA data)
- 6 millones de cruces de camión/año en frontera norte
- ~80% del comercio MX-US se mueve por tierra
- Top 3 puertos: Laredo (#1 en US), Otay Mesa, El Paso

**Dolor único**:
- **Doble compliance**: cumples NOM-068/087 en MX + cumples ELD
  FMCSA en US (regulación completamente distinta)
- Espera en frontera puede ser 4-12 horas — afecta horas de
  servicio
- T-MEC requiere documentación específica (T-MEC certificate of
  origin, etc.)
- C-TPAT certification: programa de seguridad voluntario pero
  cada vez más obligatorio para ganar contratos US

**Regulación específica**:
- **NOM-068 + NOM-087** (México)
- **49 CFR Part 395** — Hours of Service (US)
- **FMCSA ELD mandate** — registro electrónico US
- **C-TPAT** — Customs-Trade Partnership Against Terrorism
- **T-MEC capítulo 7** — facilitación comercial
- Certificación CBP (Customs and Border Protection)

**Fit con G3**:
- MEDIO. Hace falta:
  - ELD compliance US (no solo NOM-087)
  - Integración con T-MEC docs y broker aduanal
  - Interfaz bilingüe español-inglés
  - Geolocalización dual MX-US
- Beneficio: nichearnos aquí compite con Nuvocargo, que ya está
  bien capitalizado y enfocado a este vertical

**Concentración**: alta — embarcadores grandes (Walmart,
Caterpillar, automotrices, retailers grandes) dominan el flujo
cross-border

**Competidor específico**: **Nuvocargo** está enfocado 100%
aquí y tiene Series A. **Uber Freight** también opera fuerte
en este corredor. **Compite directo con players capitalizados**.

**Puntuación**:
- Tamaño: 5 · Dolor: 5 · Regulación: 5 · Concentración: 3 ·
  Fit: 3 · Riesgo: 5 = **Total 26/30** ⚠ riesgo competitivo alto

**Modelo comercial sugerido**:
- Plan dedicado **G3 Cross-Border** ($1,900 MXN/unidad/mes +
  comisión 6% sobre flete)
- Hardware ELD US-compliant: $6K MXN único
- Integración con brokers aduanales

**Mi opinión**: nicho **enorme** pero competencia **brutal**. Vale
la pena estudiar pero no como primer nicho. Considerar Año 3-4
cuando ya tengamos volumen doméstico.

---

### Nicho 4 · Auto-transporte de autos nuevos (car carriers)

**Qué es**: transporte de vehículos nuevos desde planta de
ensamble a centros de distribución y agencias.

**Tamaño**:
- ~3,200 unidades car-carrier en MX
- Industria automotriz: 13.5% del PIB MX
- Plantas grandes: Volkswagen Puebla, GM Silao, Ford Cuautitlán,
  Stellantis Saltillo, Nissan Aguascalientes, Toyota Tijuana,
  KIA Pesquería, BMW San Luis Potosí, Audi Puebla, Mazda Salamanca
- Crecimiento: 5-7% anual

**Dolor único**:
- **Daños = pesadilla**: una raspadura en un auto nuevo cuesta
  $15K-$60K MXN. Estimación: 0.2-0.5% de daños es lo "tolerable"
- Documentación obligatoria con foto en cada punto de carga y
  descarga
- OEMs (Volkswagen, GM, Ford) tienen requisitos super específicos
- Permisos especiales para conducir camiones de doble nivel
- Coordinación logística compleja: muchas unidades por viaje

**Regulación específica**:
- NOM-068, NOM-087 estándar
- **NOM-012-SCT-2-2017** específicamente para sobre-altura
- Permisos especiales SCT para car carriers (capacidad 8-9 autos)

**Fit con G3**:
- MEDIO-ALTO. Requiere:
  - Módulo de **fotodocumentación masiva** (8-9 autos × ~12
    fotos = ~100 fotos por viaje · workflow específico)
  - Integración con sistemas de OEMs (SAP, Oracle)
  - Catálogo de daños pre-existente (rayón menor, golpe leve,
    daño mayor)
  - GPS específico por unidad transportada (saber qué auto va
    en qué slot)
- Beneficio: reusas toda la base de G3, añades workflow car-carrier

**Concentración**: ALTA — 10 OEMs concentran el 95% del mercado.
Un solo contrato con Volkswagen sería transformador.

**Competidor específico**: **Auto Logistic** (Solistica),
**Express Auto** son operadores grandes pero usan tech propietaria
o nada. **DRiV / Transport Service** son US-focused. Sin
producto SaaS específico en MX.

**Puntuación**:
- Tamaño: 3 · Dolor: 5 · Regulación: 3 · Concentración: 5 ·
  Fit: 4 · Riesgo: 3 = **Total 23/30**

**Modelo comercial sugerido**:
- Plan dedicado **G3 Auto Carrier** ($899 MXN/unidad/mes +
  cargo por intensidad de fotos)
- Implementación con OEM: $200K-$500K MXN (integración con sus
  sistemas)
- Modelo: pocos contratos grandes, mucho relationship-building

---

### Nicho 5 · Hombre-camión y cooperativas independientes

**Qué es**: el operador independiente que tiene 1-3 tractos
propios, sin oficina formal. En MX se organizan frecuentemente
en cooperativas o uniones para acceder a fletes mejores.

**Tamaño**:
- ~250,000-300,000 hombres-camión en MX (50% del autotransporte
  federal son independientes)
- Cooperativas y uniones: 200+ en MX (CANACAR registra ~150)
- Operación: 1-5 unidades por persona/familia
- **Mercado más grande pero más fragmentado**

**Dolor único**:
- **Cobranza**: el flete pequeño espera 30-60-90 días para cobrar
- **Acceso a fletes**: depende de WhatsApp y referencia personal
- **Compliance**: NO tienen oficina ni contador interno, las
  multas SCT les duelen mucho más
- **Capital**: para renovar un tracto necesitan crédito y la
  banca formal los rechaza
- **Combustible**: vulnerable a robo, sin telemetría

**Regulación específica**: misma NOM-068, NOM-087 (no hay
exención por tamaño)

**Fit con G3**:
- ALTÍSIMO. **Es nuestra audiencia ya**.
- El plan Free está hecho para esta gente
- Voz/UX del brand book habla específicamente al hombre-camión
- Roadmap (Fase 2 roadside, Fase 6 finance) resuelve sus dolores

**Concentración**: BAJA fragmentación natural — pero **alta si
canalizamos por cooperativas**. CANACAR tiene 200,000
afiliados. Llegar a 5-10 cooperativas grandes = acceso a 30K-50K
operadores.

**Competidor específico**: **NADIE serio en MX**. Eclipse Total
es muy caro para ellos. Bitácora Express y similares son simples
pero sin ecosistema. **Espacio totalmente abierto**.

**Puntuación**:
- Tamaño: 5 · Dolor: 5 · Regulación: 4 · Concentración: 2 (per
  individual) / 4 (vía cooperativas) · Fit: 5 · Riesgo: 2
  = **Total 25/30** (vía cooperativas)

**Modelo comercial sugerido**:
- Plan Free + freemium upgrade
- **Partnership con cooperativas**: G3 ofrece
  - Sub-marca cooperativa-branded (G3 + logo cooperativa)
  - Comisión por operadores activados a la cooperativa
  - Capacitación inicial gratuita
- **Microcrédito** desde Fase 6 = cierre del ciclo
- Caso de venta a cooperativa: "Tus 1,000 socios tienen acceso
  a herramientas que no consiguen solos · paga $0 · paga G3
  cuando lleguen al plan Starter"

---

### Nicho 6 · Mujeres en el transporte

**Qué es**: programa específico para incentivar y profesionalizar
mujeres operadoras de camión.

**Tamaño** (orden de magnitud):
- Sólo ~3-5% de operadores de camión en MX son mujeres (vs ~15%
  en EUA según ATA)
- Si subes a 10-15% en 5 años (meta MX), agregas ~30,000-50,000
  operadoras nuevas
- Crecimiento estratégico nacional impulsado por gobierno y
  CANACAR

**Dolor único**:
- Falta de baños y duchas seguras en patios
- Riesgo de seguridad personal en carretera y descansos
- Discriminación en contratación
- Falta de capacitación específica
- Crédito vehicular: aún más difícil que para hombres

**Regulación específica**: ninguna distinta — pero hay programas
gubernamentales (STPS · NOM-035 riesgo psicosocial) y SCT que
pueden subvencionar capacitación

**Fit con G3**:
- ALTO. G3 puede ofrecer:
  - Botón SOS reforzado con custodia femenina (Fase 2 con
    proveedores específicos)
  - Red de patios "Safe for Women" verificada
  - Comunidad de operadoras dentro del chat
  - Crédito preferencial para mujeres operadoras (Fase 6)
  - Capacitación con perspectiva de género

**Concentración**: BAJA pero crecimiento ALTO

**Competidor específico**: **NINGUNO con producto específico
en MX**. Hay programas gubernamentales y de CANACAR pero sin
tech-stack.

**Puntuación**:
- Tamaño: 2 (hoy) / 4 (en 5 años) · Dolor: 5 · Regulación: 3 ·
  Concentración: 2 · Fit: 4 · Riesgo: 3 = **Total 19/30**

**Modelo comercial sugerido**:
- Plan **G3 Drive Mujer** — Free + servicios premium
  - Custodia femenina opcional ($300/viaje)
  - Patios verificados (alianza con dueños)
  - Comunidad cerrada en chat
- Caso de marca: **diferenciador único + responsabilidad social
  + presencia en medios**. Más impacto en imagen que en revenue
  inicial.

**Mi opinión**: probablemente no es el primer nicho económicamente,
pero **es enormemente valioso para marca** y para abrir
conversaciones con gobierno, fundaciones y prensa.

---

### Nicho 7 · Compliance fiscal carta porte 3.0

**Qué es**: NO es un vertical del transporte, sino una
funcionalidad transversal que se ha vuelto el **dolor #1 del
owner** desde 2024 — el complemento carta porte 3.0 del CFDI.

**Tamaño**:
- TODOS los transportistas que emiten CFDI por flete (>95%
  del mercado federal)
- ~500,000 unidades emitiendo CFDI mensualmente
- Penalización por carta porte mal emitida: facturación rechazada,
  retención IVA, multa SAT

**Dolor único**:
- SAT cambió la versión de carta porte cada año desde 2022
  (1.0 → 2.0 → 2.1 → 3.0 → 3.1)
- Errores en complemento = cliente no acredita IVA = no te paga
- Cada cambio requiere re-aprender el complemento
- Software contable (CONTPAQi, SAP) suele tardar 6 meses en
  actualizar

**Regulación específica**:
- **Anexo 20 del CFF** — CFDI
- **Carta Porte 3.0** — Anexo 20 + complemento específico
- **Resolución Miscelánea Fiscal 2026** (anual)

**Fit con G3**:
- ALTÍSIMO. G3 Admin ya emite CFDI 4.0 — agregar complemento
  carta porte 3.0 automático es extensión natural
- Datos para el complemento (ruta, mercancía, peso, operador)
  ya están en G3 desde la captura del viaje
- **Diferenciador único**: G3 puede ofrecer "carta porte
  automática garantizada al 100% · si SAT la rechaza, te
  reembolsamos"

**Concentración**: TRANSVERSAL — sirve a TODOS los segmentos

**Competidor específico**: **CONTPAQi**, **PROSOFT**, **Facturama**,
**KARDEX** tienen módulos pero **no integrados a la operación
mobile** — el dispatcher captura a mano después del viaje.

**Puntuación**:
- Tamaño: 5 · Dolor: 5 · Regulación: 5 · Concentración: 5 ·
  Fit: 5 · Riesgo: 2 = **Total 27/30** ⭐

**Modelo comercial sugerido**:
- Incluido en planes Pro+
- O add-on stand-alone: **$199 MXN/unidad/mes** para clientes
  que solo quieren esta funcionalidad
- Garantía: "1ra rechazada por SAT te la reembolsamos"
- Potencial de ser el **gancho de entrada** a G3 (carta porte
  vendida primero → cliente descubre el resto)

---

## 4. Tabla resumen y ranking

| # | Nicho | Tamaño | Dolor | Regulación | Concentración | Fit G3 | Riesgo | TOTAL | Recomendación |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 7 | **Carta porte 3.0** | 5 | 5 | 5 | 5 | 5 | 2 | **27** | ⭐⭐⭐ |
| 3 | Cross-border T-MEC | 5 | 5 | 5 | 3 | 3 | 5 | 26 | ⚠ |
| 1 | Cadena de frío | 4 | 5 | 5 | 3 | 5 | 3 | **25** | ⭐⭐ |
| 2 | Materiales peligrosos | 3 | 5 | 5 | 4 | 4 | 4 | **25** | ⭐⭐ |
| 5 | Cooperativas hombre-camión | 5 | 5 | 4 | 4 | 5 | 2 | **25** | ⭐⭐⭐ |
| 4 | Auto-carrier | 3 | 5 | 3 | 5 | 4 | 3 | 23 | — |
| 6 | Mujeres operadoras | 2 | 5 | 3 | 2 | 4 | 3 | 19 | (marca) |

---

## 5. Recomendación · los 3 nichos prioritarios

### ⭐ Recomendación 1 · Carta porte 3.0 (Q3 2026 - YA)

**Por qué**: es el dolor más urgente y más universal. **Todos**
los transportistas federales lo sufren. Es el **gancho perfecto**
para que un cliente nuevo pruebe G3.

**Plan de ejecución (3 meses)**:
- **Mes 1**: Desarrollo del módulo de complemento carta porte
  3.0 automático en G3 Admin · contrato con PAC SAT certificado
- **Mes 2**: Beta con 20 clientes existentes · refinar UX
- **Mes 3**: Release general + campaña: "Tu carta porte
  automática · garantizada por SAT o te reembolsamos"

**Métrica de éxito**:
- 500 clientes nuevos activados solo por esta funcionalidad en
  primeros 6 meses post-launch
- 95% de cartas porte aceptadas por SAT en primer intento

### ⭐⭐ Recomendación 2 · Cooperativas hombre-camión (Q4 2026)

**Por qué**: es nuestra audiencia natural, la voz del brand
book ya habla con ellos, y el modelo "cooperativa-as-channel"
nos da acceso a 10-50K operadores con un solo deal de partnership.

**Plan de ejecución (6 meses)**:
- **Mes 1-2**: Identificar las 10 cooperativas más activas en
  MX (CANACAR es punto de entrada · también AMTI, COPARMEX
  regionales)
- **Mes 3-4**: Firmar 2-3 partnerships piloto
  - Modelo: G3 sub-branded para cooperativa · plan Free para
    todos los socios · comisión a cooperativa por upgrades
- **Mes 5-6**: Onboarding masivo · capacitación a operadores ·
  evento en patio
- **Q1 2027**: Conectar Fase 2 (roadside) y Fase 6 (microcrédito)
  específicamente para esta base

**Métrica de éxito**:
- 3 cooperativas firmadas
- 5,000 operadores activos al cierre Q2 2027
- 15% de conversión Free → Starter en 12 meses

### ⭐⭐⭐ Recomendación 3 · Cadena de frío (Q1 2027 - tras Fase 1)

**Por qué**: sweet spot estratégico — alto valor, alto pago,
regulación específica, espacio sin líder claro. **Pero requiere
Fase 1 (IoT) completada primero** porque depende de sensores
de temperatura.

**Plan de ejecución (en paralelo con Fase 1)**:
- **Q4 2026**: Selección de proveedor de sensores reefer
  (Carrier, Thermo King APIs)
- **Q1 2027**: Lanzamiento de add-on "Cold Chain" en G3 Admin
- **Q2 2027**: Caso de éxito con 3 clientes ancla (Lala, Sigma,
  Frialsa o similar)

**Métrica de éxito**:
- 5 clientes con add-on Cold Chain activado
- $500K MXN/mes de revenue solo por este add-on al cierre Q4 2027
- 0 incidentes de cadena rota documentados con G3

---

## 6. Lo que NO recomiendo (por ahora)

### Cross-border T-MEC (Nicho 3)
**Razón**: Nuvocargo está fuerte aquí con $40M+ recaudados, y
Uber Freight juega en este corredor. Pelear ahora = perder
recursos sin ganar mercado. **Re-evaluar en Año 3** cuando G3
tenga volumen doméstico y pueda atacar desde una base sólida.

### Materiales peligrosos (Nicho 2)
**Razón**: el mercado es atractivo (alto margen) pero:
- Requiere certificación SCT especial nuestra (no solo del
  cliente)
- Capacitación de equipo interno en regulación hazmat
- 9 NOMs adicionales que cumplir + auditorías
- Un error puede ser **catastrófico** (multa millonaria, cárcel
  por culpa indirecta)
- Mejor entrar **después** de tener 3+ años de operación limpia
  y reputación construida

### Auto-carrier (Nicho 4)
**Razón**: pocos contratos grandes, sales cycle de 12-18 meses
con OEMs, integración pesada con sus sistemas. Es buen "horizonte
2-3" pero no primer nicho.

### Mujeres operadoras (Nicho 6)
**Razón**: enorme valor de marca pero revenue inicial bajo.
Mejor incluirlo como **iniciativa transversal** desde Fundación
G3, no como nicho económico primario. Lo convertimos en programa
de impacto social, no en P&L line.

---

## 7. Riesgos de nichearse y cómo mitigarlos

| Riesgo | Cómo se manifiesta | Mitigación |
|---|---|---|
| Perder amplitud de plataforma | Equipo de producto solo trabaja en feature del nicho | Mantener roadmap general · feature nicho como módulo opcional |
| Sobre-especialización del equipo | Hire para hazmat o cold chain que no escalan a otros segmentos | Hire generalista + 1 expert consultor por nicho |
| Capturar nicho pero no escalar | "Somos el mejor en X pero solo X" | Definir desde día 1 el "post-nicho" plan: cómo X nos abre Y |
| Subsidio cruzado mal calculado | Plan Free para hombre-camión drena recursos sin convertir | KPI claro: 15% conversión Free→Starter en 12 meses · sino, ajustar |
| Cliente nicho exige features ad-hoc | "Hagan esta excepción especial para nosotros" | Política: features de nicho son módulos opcionales, no excepciones |

---

## 8. Cómo probar un nicho sin betting la empresa

Plan de **piloto controlado** para cada nicho recomendado:

```
ESCALA 1 (3 meses · presupuesto < $200K MXN)
├─ Validación: ¿el dolor es real y suficientemente agudo?
├─ Mecánica: 5-10 entrevistas profundas + 2 prototipos
└─ Output: go / no-go decision

ESCALA 2 (6 meses · presupuesto < $1M MXN)
├─ Validación: ¿pueden pagar?, ¿cuánto?
├─ Mecánica: 10 clientes beta firmados + producto MVP del nicho
└─ Output: PMF (product-market fit) probado o pivot

ESCALA 3 (9-12 meses · presupuesto < $5M MXN)
├─ Validación: ¿escala con margen sano?
├─ Mecánica: go-to-market completo (sales, marketing, customer success)
└─ Output: nicho contributing $X/mes recurrente
```

Cada nicho atraviesa las 3 escalas antes de comprometer recursos
plenos. **Si falla en Escala 1**, dejamos el nicho. Sin sunk-cost
fallacy.

---

## 9. Conclusión-frase

> G3 ya tiene una visión amplia y horizontal (7 capas).
> Pero el comprador transportista **no compra una visión** —
> compra una **solución específica a SU dolor de hoy**.
>
> Los 3 nichos prioritarios (carta porte 3.0 · cooperativas
> hombre-camión · cadena de frío) son los puntos de entrada
> donde G3 puede ganar reputación, casos de éxito y revenue
> recurrente **mientras la plataforma multi-lado se construye
> en paralelo**.
>
> En 24 meses, G3 puede tener: 500 clientes carta porte +
> 5,000 operadores cooperativos + 5 anchor clients de cold
> chain = ~10,000 unidades en plataforma + $4-6M MXN/mes de
> revenue **antes de que Fase 3 marketplace de fletes esté
> lanzado**.

---

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Análisis inicial · 7 nichos · 3 recomendados |
