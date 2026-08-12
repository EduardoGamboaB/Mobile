# Business Case · Proyecto G3

**De transportista agroindustrial a ecosistema tecnológico del transporte mexicano**

| Campo | Detalle |
|---|---|
| Versión | 1.0 |
| Fecha | Agosto 2026 |
| Clasificación | Confidencial · NDA |
| Preparado para | Consejo / socios / inversionistas potenciales |
| Documentos relacionados | `holding/strategy/growth-plan.md` · `holding/strategy/competitive-benchmark.md` · `docs/investor-deck/` |

---

## 1. Resumen ejecutivo

G3 es un proyecto con dos frentes que se refuerzan mutuamente:

1. **G3 Logistics** — empresa mexicana de transporte agroindustrial (jaula granelera + thermo, ~12 unidades) que opera en el corredor agrícola del Bajío y norte del país. Genera flujo operativo y funciona como laboratorio en vivo de la tecnología.
2. **G3 Platform** — la plataforma tecnológica construida desde esa operación: **G3 Drive** (app del operador) y **G3 Admin** (torre de control web), con cumplimiento nativo de NOM-068, NOM-087 y Carta Porte 3.0.

**La propuesta de este business case**: evolucionar la plataforma core hacia un **ecosistema de 7 verticales** en 36 meses — IoT/telemetría, roadside on-demand, marketplace de fletes, talento de operadores, renta de activos y servicios financieros/seguros — capturando las capas hoy fragmentadas de la industria de carga mexicana.

**Números clave del caso:**

| Métrica | Valor |
|---|---|
| Trayectoria de revenue | $500K → $18M MXN mensuales en 36 meses |
| ARR proyectado al cierre (Q2 2029) | ~$220M MXN |
| Mercado agregado direccionable (7 capas) | ~$11B USD |
| Capital externo requerido | Seed $5–8M USD (Q1 2027) + Series A $15–25M USD (Q3 2028) |
| Autofinanciamiento | Fases 0–2 con cashflow operativo de Logistics (hasta Q4 2026) |
| Equipo | ~101 → ~450 personas en 36 meses |

**Decisión solicitada**: aprobar el arranque de la Fase 1 (IoT + telemetría, Q3–Q4 2026) y los 10 pre-requisitos documentados en la sección 13, incluyendo la constitución formal de las entidades del holding y la firma de 5–10 clientes beta del SaaS.

---

## 2. Contexto estratégico

### 2.1 La industria

El autotransporte de carga es la columna vertebral del comercio mexicano: mueve más del 80% de la carga terrestre nacional, con un parque vehicular del orden de cientos de miles de unidades de carga federal registradas ante la SICT. Es a la vez una industria **enorme, fragmentada y tecnológicamente rezagada**: la gran mayoría de los permisionarios opera menos de 5 unidades, sin TMS, sin telemetría y sin herramientas digitales de cumplimiento.

### 2.2 Los tres vientos de cola (por qué ahora)

1. **Regulación SAT** — El complemento Carta Porte 3.0 del CFDI 4.0 hace obligatorio el timbrado electrónico de cada traslado. Las multas son materiales y la fiscalización se endureció desde 2025. El papel dejó de ser opción.
2. **Fiscalización SICT** — NOM-068 (inspección físico-mecánica) y NOM-087 (horas de servicio) pasaron de letra muerta a inspecciones reales en carretera. La bitácora digital se vuelve el estándar de cumplimiento.
3. **Relevo generacional** — La nueva generación de dueños y dispatchers opera desde el celular y exige visibilidad. WhatsApp ya no es suficiente para retener clientes corporativos.

### 2.3 La ventana

Estos tres vientos abren una **ventana estimada de 24 meses** para establecer la plataforma de referencia antes de que un jugador global localice compliance mexicano o un local consolide las capas. Quien llegue tarde comprará en lugar de competir.

---

## 3. Definición del problema

La industria opera en **7 capas fragmentadas** — TMS/fleet management, marketplace de fletes, bitácora/compliance, roadside, talento, fintech y seguros — cada una con proveedores aislados que no comparten datos:

- **El transportista** vive con papel, WhatsApp y Excel; cada auditoría es una crisis; pierde 15–20% del valor del flete en ineficiencias.
- **El generador de carga** no tiene visibilidad ni trazabilidad; la reputación del transportista es anecdótica.
- **El asegurador y el banco** no tienen data de conducta para tarificar ni prestar — el crédito y las primas castigan a todos por igual.
- **Los proveedores de servicio** (grúas, llanteras, mecánicos) operan por telefonazo, sin reputación ni demanda agregada.

**El insight central del proyecto**: la **data operativa** (viajes, conducta, transacciones) es la moneda que todas las capas necesitan. Quien la captura puede ordenar las 7 capas en un solo ecosistema.

---

## 4. Opciones analizadas

| Opción | Descripción | Evaluación |
|---|---|---|
| **A. No hacer nada** | Seguir operando G3 Logistics como transportista puro; la tecnología queda como herramienta interna. | Descartada. Deja el moat tecnológico sin monetizar, expone a G3 a que otro consolide el ecosistema y limita el crecimiento al capital intensivo de flota (comprar camiones). |
| **B. Licenciar / comprar software** | Adoptar un TMS de terceros y revender o integrarse como partner. | Descartada. Ningún TMS del mercado cubre compliance mexicano nativo ni el flujo real del operador; se pierde la propiedad de la data — el activo estratégico del caso. |
| **C. Vender solo el SaaS core** | Comercializar Drive + Admin como TMS y detenerse ahí. | Viable pero sub-óptima. El SaaS puro es defendible ($MRR por unidad), pero el valor mayor está en las capas transaccionales y financieras que la data habilita. Un TMS solo invita a que otro construya el ecosistema encima. |
| **D. Ecosistema secuenciado (recomendada)** | Monetizar el SaaS core Y construir las 7 capas en fases, cada una habilitada por la data de la anterior. | **Recomendada.** Maximiza el valor de la data, crea efectos de red compuestos y defiende el negocio en cada capa. El riesgo de ejecución se mitiga con secuenciación estricta y gates de capital por fase. |

---

## 5. Solución propuesta: el ecosistema de 7 fases

### 5.1 Arquitectura del ecosistema

Plataforma core en el centro (G3 Drive + G3 Admin) y 6 verticales que se nutren entre sí:

| Fase | Vertical | Submarca | Trimestre | Revenue objetivo al cierre |
|---|---|---|---|---|
| 0 | Plataforma core (Drive + Admin) | G3 DRIVE · ADMIN | HOY (Q2 2026) | $500K/mes |
| 1 | IoT + Telemetría (sensores, cámaras IA fatiga) | **G3 Fleet** | Q3–Q4 2026 | $1.5M/mes |
| 2 | Roadside on-demand (grúa, llantera, mecánico) | **G3 Market** | Q1–Q2 2027 | $3M/mes |
| 3 | **Marketplace de fletes (el core financiero)** | **G3 Freight** | Q3–Q4 2027 | $7M/mes |
| 4 | Headhunting de operadores | **G3 Talent** | Q1–Q2 2028 | $10M/mes |
| 5 | Renta de tractos y remolques | **G3 Market+** | Q3–Q4 2028 | $12M/mes |
| 6 | Fintech + Seguros | **G3 Finance · G3 Secure** | Q1–Q2 2029 | $18M/mes |

### 5.2 Por qué este orden (no es opcional)

- **Se empieza por IoT/telemetría (Fase 1)** aunque no genere revenue grande, porque: (a) sin data de telemetría las aseguradoras de Fase 6 no pueden tarificar; (b) sin scoring real el marketplace de fletes no puede dar reputación; (c) sin sensores no hay diferenciador frente a Uber Freight.
- **El core financiero es G3 Freight (Fase 3)** — ahí está el volumen ($7M/mes vs $3M de roadside).
- **Finance + Seguros van al final** porque requieren ~36 meses de operación limpia, volumen y data acumulada para que un banco o aseguradora firme.

### 5.3 El flywheel de datos

```
Operación (Drive+Admin) → Telemetría (Fleet) → Marketplaces (Freight·Market·Talent) → Finance (Finance·Secure)
        ▲                                                                                      │
        └──────────── mejores términos financieros retienen a los operadores ─────────────────┘
```

Cada producto genera data que mejora todos los demás: bitácora y viajes alimentan telemetría; conducta y combustible alimentan reputación de marketplace; transacciones alimentan scoring crediticio; el scoring devuelve mejores términos que retienen a los usuarios del core.

---

## 6. Análisis de mercado

### 6.1 Tamaño por capa (aproximados, a validar en data room)

| Capa | TAM estimado | Nota |
|---|---|---|
| TMS + IoT/telemetría | ~$450M USD | Software y hardware conectado al tracto |
| Roadside on-demand | ~$650M USD | Grúa, llantera, mecánico, combustible |
| **Marketplace de fletes** | **~$6.5B USD** | Volumen de fletes anuales México — el core |
| Talento de operadores | ~$180M USD | Reclutamiento y verificación |
| Renta de activos | ~$1.2B USD | Renta operativa de tracto y remolque |
| Fintech + Seguros | ~$2.1B USD | Crédito, factoring, pólizas de flota |
| **Agregado** | **~$11B USD** | Captura objetivo combinada: ~2% en 36 meses |

### 6.2 Beachhead

El nicho de entrada es el **sector agroindustrial** (~40K unidades estimadas): es el segmento que G3 conoce operativamente, el más rezagado en digitalización y con estacionalidad que premia la eficiencia. La expansión posterior es horizontal: refrigerado, construcción, retail last-mile.

### 6.3 Panorama competitivo (resumen del benchmark)

El benchmark completo (`holding/strategy/competitive-benchmark.md`) evaluó 30+ rivales en 7 capas y 14 dimensiones críticas. Conclusiones:

- **En cada capa hay competencia — pero ningún rival compite en las 7.** Samsara/Motive/Geotab en fleet; Uber Freight/Nuvocargo/Cargamos en fletes; Eclipse Total/iBitácora/CONTPAQi en compliance; sin líder claro en roadside MX; OCC/Computrabajo (genéricas) en talento; TruckSmarter (US)/Floid/R2 en fintech; Quálitas/GNP/HDI en seguros.
- **G3 cubre 14/14 dimensiones críticas; ningún rival cubre más de 7.**
- **Cuadrante ganador** (alto compliance MX + ecosistema multi-lado): G3 está solo. Los TMS locales cumplen NOM pero son productos aislados; los globales tienen ecosistema pero compliance superficial.

---

## 7. Modelo de negocio

### 7.1 Tres motores de revenue

| Motor | Mecánica | Margen esperado | Peso 2029 |
|---|---|---|---|
| **SaaS** | Suscripción por unidad · 5 tiers MXN (Free $0 · Starter $349 · Pro $899 · Business $2,499 · Enterprise a medida) | 75–80% bruto | ~35% |
| **Marketplace** | Take-rate por transacción: fletes 5–8% · roadside 12–18% · talent placement 10–15% | 60–70% bruto | ~45% |
| **Fintech** | Margen financiero: spread de crédito/factoring + comisión de primas | Variable, alto | ~20% |

### 7.2 Sinergia estructural

Cada cliente de un motor es pipeline del siguiente sin CAC adicional: el suscriptor SaaS publica fletes en Freight; el transportista de Freight contrata roadside en Market; el historial de ambos habilita crédito en Finance. **El CAC se paga una vez y el LTV se multiplica por capa.**

### 7.3 G3 Logistics en el modelo

El negocio de transporte agroindustrial no es el objeto de esta inversión, pero cumple tres funciones en el caso: (1) genera el cashflow que autofinancia las Fases 0–2; (2) es el laboratorio de validación de cada feature antes de venderse; (3) garantiza el bootstrap de oferta/demanda cuando se lancen los marketplaces.

---

## 8. Proyección financiera

### 8.1 Trayectoria de revenue (proyección interna)

| Hito | Revenue mensual (MXN) | Driver |
|---|---|---|
| Hoy (Q2 2026) | $500K | SaaS core + operación |
| Q4 2026 | $1.5M | + G3 Fleet (IoT) |
| Q2 2027 | $3M | + G3 Market (roadside) |
| Q4 2027 | $7M | + **G3 Freight** (inflexión: +130% semestral) |
| Q2 2028 | $10M | + G3 Talent |
| Q4 2028 | $12M | + G3 Market+ (renta) |
| Q2 2029 | **$18M ≈ $220M MXN ARR** | + G3 Finance + G3 Secure |

### 8.2 Estado de resultados proyectado (plantilla — completar con modelo del fundador)

> **Todos los valores marcados [$]/[%] son placeholders.** Deben poblarse con los estados financieros reales y el modelo interno antes de presentar a un comité de inversión.

| Concepto (MXN) | 2026 | 2027 | 2028 | 2029e |
|---|---|---|---|---|
| Revenue SaaS | [$] | [$] | [$] | [$] |
| Revenue Marketplace | $0 | [$] | [$] | [$] |
| Revenue Fintech | $0 | $0 | [$] | [$] |
| **Revenue total** | [$] | [$] | [$] | ~$220M ARR |
| Margen bruto blend | [%] | [%] | [%] | [%] |
| OPEX (equipo + infra + GTM) | [$] | [$] | [$] | [$] |
| EBITDA | [$] | [$] | [$] | [$] |
| Cash burn mensual | [$] | [$] | [$] | [$] |

### 8.3 Supuestos críticos y sensibilidad

| Supuesto | Base | Sensibilidad |
|---|---|---|
| ARPU SaaS blend | $899 MXN/unidad/mes | ±20% mueve el ARR SaaS proporcionalmente |
| Take-rate Freight | 5–8% | El caso es viable desde 4%; cada punto ≈ [$] MXN/año a volumen 2028 |
| Churn mensual SaaS | <3% | >5% sostenido invalida el flywheel — KPI de alarma |
| Adopción de IoT | 100 unidades Q4 26 | Retraso de 2 trimestres empuja Fase 6 fuera de la ventana |
| Timing regulatorio | Fiscalización 2025–2027 | Si la fiscalización se relaja, el inbound compliance-led cae ~40% |

### 8.4 Plan de capital

| Ronda | Cuándo | Monto | Financia | Estado |
|---|---|---|---|---|
| Bootstrap | Hoy → Q4 2026 | Cashflow operativo de Logistics | Fases 0–2 (core, IoT, roadside) | En curso |
| **Seed** | Q1 2027 | **$5–8M USD** | Fases 3–4 (Freight + Talent) | A levantar — objeto de este caso |
| Series A | Q3 2028 | $15–25M USD | Fases 5–6 (Renta + Finance/Seguros) | Condicionada a hitos de Fase 3 |

**Instrumento sugerido para el Seed**: SAFE post-money, cap por negociar. La S.A.P.I. de C.V. ya está constituida con cap table listo para inversión institucional.

---

## 9. Beneficios del caso

**Cuantificables (a 36 meses):**
- ARR ~$220M MXN con margen blend creciente por mezcla de marketplace y fintech.
- Valuación de plataforma (múltiplos SaaS/marketplace) muy superior a la valuación de activos de una flota equivalente.
- 3 motores de revenue diversificados — resiliencia ante ciclos del agro o del flete spot.

**Estratégicos:**
- Propiedad del activo data del transporte mexicano — la posición defendible a 10 años.
- Opcionalidad de expansión LATAM (el playbook de compliance local es replicable país por país).
- Marca paraguas G3 con 7 submarcas que refuerzan la misma red.

---

## 10. Análisis de riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Ejecución multi-vertical** — construir 6 verticales en 36 meses excede la capacidad del equipo | Media | Alto | Secuenciación estricta con gates: ninguna fase arranca sin cerrar los criterios de la anterior; contratación anticipada de líderes por vertical |
| R2 | **Entrada de un global** (Uber Freight, Samsara) con localización MX agresiva | Media | Alto | La ventana de 24 meses es el mitigante: acelerar Fases 1–3; el compliance nativo toma 18+ meses de replicar |
| R3 | **Adopción lenta del SaaS** — el transportista pequeño es conservador | Media | Medio | Plan Free sin fricción; GTM compliance-led (el SAT "vende" por nosotros); cross-sell desde el ecosistema agri conocido |
| R4 | **Dependencia regulatoria** — el caso asume fiscalización sostenida | Baja | Medio | El valor operativo (visibilidad, pagos, OCR) es independiente de la regulación; compliance es acelerador, no único driver |
| R5 | **Riesgo financiero de Fase 6** — crédito/seguros requieren licencias, partners y balance | Media | Medio | Modelo de partnership (banco/aseguradora ponen balance y licencia; G3 pone data y distribución); no se toma riesgo de crédito en balance propio |
| R6 | **Capital: el Seed no cierra en Q1 2027** | Media | Alto | El bootstrap cubre hasta Q4 2026 con Fases 0–2 operando; el plan B es extender Fase 2 con cashflow y retrasar Freight 2 trimestres sin perder la ventana completa |
| R7 | **Concentración en el nicho agri** en etapa temprana | Baja | Bajo | Es deliberado (beachhead); la expansión horizontal está roadmapeada desde Fase 4 |
| R8 | **Retención de talento tech** en un mercado competido | Media | Medio | Equity pool para hires clave; la misión (digitalizar una industria real) es diferenciador de reclutamiento |

---

## 11. Ventaja competitiva (por qué G3 y no otro)

Lo que hace creíble este plan frente a un competidor que arranca de cero:

1. **Operación propia real** — bootstrap garantizado de demanda y oferta en cada marketplace; cada feature se valida en piso antes de venderse.
2. **Clientes en plataforma antes de lanzar los marketplaces** — no se arranca de cero: la base SaaS de Fases 0–2 es la liquidez inicial de Freight.
3. **Cumplimiento NOM-087/068 y Carta Porte 3.0 ya operando** — relación regulatoria limpia con SICT/SAT desde el día 1; 18+ meses de ventaja sobre cualquier entrante.
4. **S.A.P.I. de C.V. constituida** — cap table y gobierno corporativo listos para inversión institucional.
5. **Secuenciación como estrategia** — el orden de las fases es defensivo por diseño: cada capa genera la data sin la cual la siguiente no puede existir. Un competidor no puede saltarse pasos.

---

## 12. Organización y gobernanza

### 12.1 Estructura del holding

Tres entidades bajo el paraguas G3 (constitución formal de las 3 entidades = pre-requisito del arranque):

| Entidad | Rol |
|---|---|
| **G3 Logistics** | Operación de transporte · genera cashflow · laboratorio |
| **G3 Tech (Platform)** | Titular del IP, el SaaS y los marketplaces · vehículo de inversión |
| **G3 Foundation** | Iniciativas sociales del sector (capacitación de operadores) |

### 12.2 Equipo

- **Hoy**: ~101 personas (operación + tecnología + administración).
- **A 36 meses**: ~450 personas, con crecimiento concentrado en producto/ingeniería, comercial y customer success por vertical.
- **Fundadores**: CEO (visión y operación), CTO (arquitectura de plataforma), COO/GTM (comercial B2B). *(Bios y nombres a confirmar en el documento público.)*
- **Governance**: consejo con asiento para el inversionista Seed; comités de producto y riesgo a partir de Fase 3 (marketplace) y Fase 6 (fintech).

---

## 13. Plan de implementación

### 13.1 Roadmap de 36 meses

El detalle por fase vive en `holding/strategy/growth-plan.md`. Los gates de decisión entre fases:

| Gate | Criterio para avanzar |
|---|---|
| F1 → F2 | 100 unidades con IoT activo · data pipeline de telemetría estable |
| F2 → F3 | Red de proveedores roadside en 3 corredores · NPS proveedor > 40 |
| F3 → F4 | GMV de Freight ≥ [$] MXN/mes · take-rate sostenido ≥ 5% · **gate del Series A** |
| F4 → F5 | 500+ operadores verificados en Talent · tiempo de colocación < 15 días |
| F5 → F6 | 36 meses de data operativa limpia · partner bancario/asegurador firmado |

### 13.2 Próximos 60 días — decisiones críticas

1. **Constituir formalmente las 3 entidades del holding.**
2. **Implementar integraciones productivas reales** — Vertex AI, Stripe, TypeORM (reemplazar stubs actuales).
3. **Firmar 5–10 clientes beta del SaaS** fuera de la operación propia.
4. **RFP a Teltonika / Queclink / MiX** para selección de proveedor IoT de Fase 1.
5. **Term sheet preliminar con potencial inversionista Seed** (aunque la ronda cierre en Q1 2027).
6. Completar estados financieros auditables 2024–2025 (insumo del data room).
7. Definir el modelo de supuestos del marketplace (take-rate, GMV por corredor).
8. Contratar líder de producto para G3 Fleet (Fase 1).
9. Formalizar contratos de dogfooding entre G3 Logistics y G3 Tech (precios de transferencia limpios).
10. Establecer el tablero de KPIs del caso (sección 14) con revisión mensual.

---

## 14. KPIs y criterios de éxito

### 14.1 KPIs por horizonte

| Horizonte | KPI | Objetivo |
|---|---|---|
| 6 meses | Clientes SaaS externos activos | 30+ |
| 6 meses | Unidades con IoT (G3 Fleet) | 100 |
| 12 meses | MRR SaaS + Fleet | $3M MXN |
| 18 meses | GMV mensual G3 Freight | [$] — definir con modelo |
| 24 meses | Take-rate blend sostenido | ≥ 5% |
| 36 meses | ARR total | ~$220M MXN |
| Continuo | Churn mensual SaaS | < 3% |
| Continuo | LTV / CAC | > 3x |

### 14.2 Criterios de kill / pivote

El caso se replantea si: (a) el churn SaaS supera 5% mensual por dos trimestres; (b) Fase 3 no alcanza [$] de GMV a los 6 meses de lanzada; (c) el Seed no cierra para Q3 2027 — en cuyo caso el plan se contrae a la opción C (SaaS puro) con el cashflow disponible.

---

## 15. Recomendación

**Proceder con la opción D (ecosistema secuenciado)**, arrancando la Fase 1 (G3 Fleet · IoT + telemetría) en Q3 2026 con financiamiento propio, y ejecutar los 10 puntos de los próximos 60 días — en particular la constitución del holding, los clientes beta y el term sheet preliminar del Seed.

El razonamiento en una línea: **G3 ya pagó el costo de entrada que detiene a todos los demás** (operación real, compliance en producción, plataforma validada, estructura corporativa lista). La ventana regulatoria y generacional está abierta ahora; el riesgo mayor del proyecto no es ejecutar este plan — es no ejecutarlo y ver a otro consolidar las capas sobre una posición inferior.

---

*Documento generado a partir de la estrategia documentada en `holding/strategy/`. Los valores marcados como [$]/[%]/aproximados deben validarse con estados financieros y el modelo interno antes de uso ante terceros. Distribución restringida.*
