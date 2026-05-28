# Plan Operativo · Carta Porte 3.0 · 90 días

> Plan ejecutable semana por semana para lanzar el módulo de
> Carta Porte 3.0 como gancho de adquisición de G3 Admin.
> Basado en la recomendación 1 de
> [`holding/strategy/niche-opportunities.md`](../../../holding/strategy/niche-opportunities.md).

| Inicio | Q3 2026 (semana del 6 julio) |
|---|---|
| Duración | 12 semanas (90 días) |
| Owner | GM Tech + Product Manager |
| Presupuesto total | ~$1.2M MXN |
| Headcount necesario | 4 personas (3 nuevos hires + 1 reasignado) |

---

## Resumen ejecutivo

| Fase | Semanas | Hito principal |
|---|---|---|
| **Setup** | 1-2 | PAC firmado + equipo onboarded |
| **Desarrollo** | 3-6 | Módulo backend completo + UI admin |
| **Beta interna** | 7 | 5 clientes internos (G3 Logistics + 4 clientes Pro existentes) |
| **Beta externa** | 8-9 | 20 clientes beta cerrados, feedback loop |
| **Refinement** | 10 | Bugs críticos resueltos · UX pulida |
| **Pre-launch** | 11 | Marketing assets · landing · pricing live |
| **Launch público** | 12 | Release general · campaña digital · seguimiento KPIs |

---

## Semana 1-2 · Setup

### Hitos
- [ ] Decidir PAC SAT certificado (ver [pac-comparison.md](./pac-comparison.md))
- [ ] Firmar contrato con PAC seleccionado
- [ ] Hire de 2 ingenieros backend (TypeScript/Node) y 1 producto fiscal
- [ ] Setup ambiente desarrollo + sandbox PAC
- [ ] Importar XSD oficiales del SAT (CFDI 4.0 + complemento Carta Porte 3.0)

### Riesgos semana 1-2
- PAC tarda más en firmar contrato del esperado → Mitigación: cerrar con 2 PACs como contingencia
- Hire de fiscal lento → Mitigación: empezar con consultor externo medio tiempo

### Output medible
- Contrato PAC firmado con sandbox keys
- Equipo de 4 personas operativo

---

## Semana 3 · Schema y modelo de datos

### Hitos
- [ ] Schema PostgreSQL `invoicing.carta_porte` y tablas relacionadas
- [ ] Migraciones idempotentes vía TypeORM
- [ ] Modelo de datos TypeScript en `@g3/contracts`
- [ ] Validación zod para inputs

### Tablas principales
- `invoicing.invoices` (CFDI master)
- `invoicing.carta_porte` (complemento 3.0)
- `invoicing.locations` (origen, destino, intermedios)
- `invoicing.merchandise` (mercancías + fracción arancelaria)
- `invoicing.autotransport` (tracto + remolque)
- `invoicing.operators` (operador asignado por CFDI)
- `invoicing.cfdi_acks` (acuses del SAT)

### Output medible
- 7 tablas creadas con migraciones reversibles
- DTOs versionados en `@g3/contracts`

---

## Semana 4 · Generador XML

### Hitos
- [ ] Implementar generador XML CFDI 4.0 con TDD
- [ ] Implementar generador del complemento Carta Porte 3.0
- [ ] Validación XSD oficial SAT en cada generación
- [ ] Tests con casos reales del SAT (los XML de ejemplo)

### Cobertura mínima de tests
- Ingreso (transportista cobra)
- Traslado (dueño mueve su carga)
- Local (≤30 km · estructura distinta)
- Cross-border (con complemento aduanal)
- Mercancía peligrosa (datos adicionales)

### Output medible
- Generador con 25+ tests unitarios verdes
- XSD validation 100% en muestra de 20 escenarios

---

## Semana 5 · Integración con PAC

### Hitos
- [ ] Interfaz `PacProvider` (mock + real)
- [ ] Adapter del PAC seleccionado
- [ ] Sellado digital del PAC (timbrado)
- [ ] Manejo de errores SAT (catálogo de códigos)
- [ ] Cancelación de CFDI

### Catálogos del SAT a importar
- c_TipoComprobante (I, E, T, P, N)
- c_UsoCFDI
- c_FormaPago / c_MetodoPago
- c_ClaveProdServ (60K+ productos/servicios)
- c_ClaveUnidad
- c_ConfigAutotransporte (T01-T20)
- c_TipoCarga (peligrosa, sobredimensionada, etc.)
- c_MaterialPeligroso (UN codes)
- c_PartesTransporte (PT01-PT22)
- c_TiposPermiso (TPAF01-TPAF18)
- c_CodigoPostal (todos los CP MX)

### Output medible
- Timbrado exitoso en sandbox · ack del PAC en JSON
- Mock provider 100% funcional para tests

---

## Semana 6 · UI Admin

### Hitos
- [ ] Pantalla "Nueva Carta Porte" (formulario inteligente)
- [ ] Autocompletado desde viaje activo en G3 Drive (origen, destino, operador, unidad)
- [ ] Vista previa del XML antes de timbrar
- [ ] Pantalla "Carta porte timbrada" con descarga PDF + XML
- [ ] Listado con filtros (estado, fecha, cliente)
- [ ] Cancelación con motivo

### UX principios
- 80% del formulario auto-llenado desde data G3 existente
- El owner solo selecciona "Generar" cuando el viaje está cerrado
- Errores SAT en lenguaje claro (no códigos)

### Output medible
- 5 pantallas funcionando end-to-end con backend
- Generación de carta porte completa en < 30 segundos

---

## Semana 7 · Beta interna

### Hitos
- [ ] Dogfooding con la propia flota G3 Logistics (~100 viajes/semana)
- [ ] 4 clientes Pro existentes opt-in al beta
- [ ] Capturar y resolver bugs críticos (severity 1-2)
- [ ] Documentar todos los códigos de error del SAT que aparecen

### Métricas beta
- % de cartas porte timbradas al primer intento (target ≥ 95%)
- Tiempo medio de generación (target < 30 s)
- Errores por causa raíz (clasificar)

### Output medible
- 400+ cartas porte timbradas en sandbox + producción
- 0 bugs severity 1 abiertos al cierre de semana

---

## Semana 8-9 · Beta externa

### Hitos
- [ ] Reclutar 20 clientes beta vía outreach directo (priority a clientes que ya nos pagaron)
- [ ] Onboarding 1:1 con cada uno (call de 30 min)
- [ ] Canal Slack/WhatsApp dedicado para soporte beta
- [ ] Daily standup de feedback (PM + ingeniería)

### Perfiles target del beta
- 5 hombres-camión (1 unidad)
- 8 flotillas chicas (3-10 unidades)
- 5 flotillas medianas (15-30 unidades)
- 2 empresas grandes (50+ unidades) — más fricción pero validación enterprise

### Métricas
- Aceptación SAT ≥ 97% al primer intento
- NPS del módulo ≥ 60
- Tiempo medio de generación ≤ 25 s

### Output medible
- 2,000+ cartas porte timbradas en beta externa
- 15+ casos de éxito documentados
- 5 testimonios en video grabados

---

## Semana 10 · Refinement

### Hitos
- [ ] Bugs críticos resueltos
- [ ] UX iterada con base en hot-spots de feedback
- [ ] Documentación de usuario lista (FAQ + tutoriales)
- [ ] Política de garantía aprobada por Legal: "Si SAT rechaza por error nuestro, te reembolsamos el timbre"

### Output medible
- 0 bugs severity 1 o 2 abiertos
- 1 video tutorial (60 segundos) listo
- Política de garantía publicada

---

## Semana 11 · Pre-launch

### Hitos
- [ ] Landing page específica para Carta Porte 3.0 en g3logistics.mx
- [ ] Campaña digital armada (Google Ads, Meta, LinkedIn)
- [ ] Email a base de leads y clientes históricos
- [ ] Press release a CANACAR, T21, Énfasis Logística (medios sectoriales)
- [ ] Webinar agendado para semana 12 con CANACAR

### Materiales
- Landing page con caso de uso + pricing + garantía + testimonios
- Video demo de 2 minutos
- 3 posts LinkedIn (uno por día las últimas 3 días pre-launch)
- 1 post blog técnico ("Cómo SAT cambió carta porte 3.0 y qué hicimos")

### Output medible
- Landing publicada · 500+ inscritos al webinar

---

## Semana 12 · Launch público

### Hitos
- [ ] Release general a todos los clientes existentes
- [ ] Activación de campañas pagadas (Google + Meta + LinkedIn)
- [ ] Webinar con CANACAR (asistencia target 300+)
- [ ] Tracking diario de KPIs en dashboard

### KPIs semana 12 (primera semana en producción pública)
- 50+ clientes nuevos activados por la funcionalidad
- 5,000+ cartas porte timbradas
- 98%+ aceptación SAT primer intento
- 0 reembolsos (señal de calidad del producto)

### Output medible
- Producto vivo y operando
- Cohorte de adquisición separada en analytics para medir
  efecto del módulo

---

## Presupuesto detallado

| Concepto | Monto MXN | Notas |
|---|---|---|
| **Headcount** (4 personas × 3 meses) | $720K | 2 ingenieros backend $80K/mes · 1 product fiscal $60K · 1 PM reasignado |
| **PAC SAT** (contrato + timbres del beta) | $80K | Fee fijo + ~10K timbres para beta a $7-8 c/u |
| **Consultor fiscal externo** | $90K | $30K/mes · 3 meses · validación legal |
| **Infraestructura** (extra GCP) | $30K | Almacenamiento de XMLs · Cloud Functions de validación |
| **Diseño** (landing + materiales) | $60K | Freelance senior · 4 semanas |
| **Marketing campaña launch** | $180K | Google Ads $80K · Meta $50K · LinkedIn $30K · prensa $20K |
| **Webinar y eventos** | $40K | CANACAR + giras a 3 ciudades |
| **Contingencia 8%** | $96K | Para imprevistos |
| **TOTAL** | **$1,296K** | redondeado a $1.3M MXN |

---

## Métricas de éxito a 6 meses post-launch

| Métrica | Target |
|---|---|
| Clientes nuevos activados por Carta Porte 3.0 | ≥ 500 |
| Cartas porte timbradas/mes (cierre Q1 2027) | ≥ 50,000 |
| Aceptación SAT primer intento | ≥ 98% |
| Revenue mensual del add-on | ≥ $300K MXN |
| Conversión Carta Porte → plan Pro+ | ≥ 25% |
| Reembolsos por garantía | < 0.1% de timbres |
| NPS del módulo | ≥ 65 |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| SAT cambia versión durante el proyecto | Media | Alto | Diseño modular del schema · pivotear en ≤ 2 semanas |
| PAC seleccionado falla técnicamente | Baja | Alto | Multi-PAC desde día 1 (Diverza primary, Facturama backup) |
| Demanda explota y no escalamos | Media | Medio | Sizing conservador · autoscaling de timbrado |
| Bug en producción genera rechazos SAT en masa | Baja | Crítico | Canary release 10% → 50% → 100% en primeros 14 días |
| Competencia (CONTPAQi, Facturama) lanza similar | Media | Medio | Velocidad · sacar primera versión en 12 semanas |
| Cliente confunde garantía con seguro y demanda | Baja | Medio | Legal redacta términos claros · disclaimer en UI |

---

## Quién hace qué

| Rol | Persona | Responsabilidad principal |
|---|---|---|
| **GM Tech** | (existente) | Decisión PAC · ownership ejecutivo |
| **Product Manager** | (reasignar de PM existente) | Roadmap del módulo · feedback loop beta |
| **Tech Lead Backend** | (hire nuevo) | Arquitectura · code review · liderar 1 dev junior |
| **Backend Engineer** | (hire nuevo) | Generador XML · integración PAC |
| **Frontend Engineer** | (reasignar de admin team) | UI Admin de Carta Porte |
| **Fiscal Specialist** | (hire nuevo o consultor) | Asegurar cumplimiento SAT · catálogos · validación legal |
| **Customer Success Lead** | (existente) | Onboarding beta · captura testimonios |
| **Marketing Lead** | (existente) | Landing · campañas · webinar |

---

## Dependencias externas

| Dependencia | Responsable | Status |
|---|---|---|
| PAC SAT firmado con sandbox | GM Tech | Semana 1 |
| Catálogos SAT actualizados | Backend | Semana 5 |
| XSDs oficiales SAT | Backend | Semana 3 |
| Consultor fiscal | CHRO | Semana 1 |
| Términos legales de garantía | General Counsel | Semana 10 |
| Aprobación gasto $1.3M | CFO + CEO | Semana 0 (PRE-INICIO) |
| Canal de comunicación con CANACAR | Comercial | Semana 11 |

---

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Plan inicial · 12 semanas · $1.3M MXN |
