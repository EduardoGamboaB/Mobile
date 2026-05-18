# 06 · Procesos clave

Los flujos críticos del grupo, normalizados. Cada proceso tiene
**owner, entradas, pasos, salidas y SLA**.

## A. Procesos de G3 Logistics

### A1 — Ciclo de un viaje (end-to-end)

**Owner**: Director de Operaciones.
**Entrada**: solicitud del cliente (correo, WhatsApp, ERP integrado).
**Salida**: viaje cobrado y archivado.
**SLA total**: cotización < 4 hrs, ejecución según fecha, cobro
< 45 días.

```
1. Cotización (Comercial)
   ├─ Recepción de solicitud → 30 min
   ├─ Cálculo de tarifa (origen-destino, tipo, urgencia)
   ├─ Envío de propuesta al cliente → ≤ 4 hrs hábiles
   └─ Aceptación: se crea folio COT-AAAA-NNNN

2. Asignación (Dispatch)
   ├─ Selección de tracto + remolque + operador
   ├─ Verificación de papeles del operador (licencia vigente)
   ├─ Creación de viaje en G3 Admin → folio G3-AAAA-NNNNN
   └─ Notificación al operador en G3 Drive

3. Pre-viaje (Operador + Patio)
   ├─ Inspección obligatoria en G3 Drive (12 puntos)
   ├─ Carga de combustible y verificación de papeles
   ├─ Recolección de mercancía en origen
   └─ Foto de carta porte sellada (OCR captura datos)

4. En tránsito (Operador + Dispatch)
   ├─ Bitácora viva (casetas, paradas, gasolina, comidas)
   ├─ Posición en vivo visible para cliente y dispatch
   ├─ Alertas automáticas: desvío de ruta, exceso de velocidad
   └─ Comunicación dispatch ↔ operador por chat G3 Drive

5. Entrega (Operador + Cliente)
   ├─ Llegada a destino, "Llegué" en G3 Drive
   ├─ Descarga supervisada
   ├─ Foto de carta porte sellada por destinatario
   ├─ Cierre de viaje en app

6. Autorización de pago al operador (Admin)
   ├─ Dispatch revisa evidencias
   ├─ Owner aprueba liberación de pago en G3 Admin (Starter+)
   └─ Pago se libera al siguiente ciclo de nómina

7. Facturación (Cobranza)
   ├─ Emisión CFDI 4.0 con carta porte 3.0 al cliente
   ├─ Envío por correo + portal del cliente
   └─ Folio archivado

8. Cobranza (Cobranza)
   ├─ Recordatorio cordial día 30
   ├─ Llamada de seguimiento día 40
   ├─ Escalamiento a Director Comercial día 50
   └─ Acción legal día 90 (raro, evitable)
```

### A2 — Onboarding de operador nuevo

**Owner**: Coordinador de Operadores. **SLA**: 5 días hábiles desde
oferta aceptada hasta primer viaje.

| Día | Actividad | Owner |
|---|---|---|
| 1 | Documentación: licencia federal, examen médico, antidoping | Coordinador |
| 1 | Alta en sistemas (G3 Drive, nómina, seguro social) | RRHH |
| 2 | Capacitación HSE (8 hrs presencial) | Gerente HSE |
| 3 | Capacitación operativa: app G3 Drive, protocolos | Coordinador |
| 4 | Práctica con mentor en patio (vehículo, inspección) | Operador senior |
| 5 | Primer viaje con copiloto experimentado | Dispatch |
| 30 | Evaluación de desempeño y retroalimentación | Coordinador |

### A3 — Atención de incidente operativo

**Owner**: Gerente HSE.
**Cobertura**: accidente, robo, falla mecánica grave, retención
por autoridad, lesión del operador.

```
T+0      Operador presiona SOS en G3 Drive
T+1 min  Dispatch ve alerta + ubicación, llama al operador
T+5 min  Si confirmado: Dispatch activa protocolo
         ├─ Notifica a Gerente HSE
         ├─ Notifica a Gerente Flota (si mecánico)
         ├─ Notifica a aseguradora (si accidente)
         └─ Coordina apoyo en sitio (grúa, ambulancia, custodia)
T+30 min Comunicación al cliente: "Tu carga tiene un incidente,
         te informamos cada 30 min hasta resolución"
T+2 hrs  Plan de continuidad: traspaso de carga si aplica
T+24 hrs Investigación causa raíz (HSE + Operador + Dispatch)
T+5 días Postmortem documentado + actualización de procedimiento
         + comunicación de lecciones aprendidas a la flota
```

### A4 — Mantenimiento preventivo de flota

**Owner**: Gerente de Flota. **Disparador**: kilometraje o tiempo,
lo que ocurra primero.

| Servicio | Kilometraje | Tiempo máximo |
|---|---|---|
| Inspección visual | Pre-viaje | Cada salida |
| Cambio de aceite y filtros | 25,000 km | 6 meses |
| Revisión de frenos | 50,000 km | 6 meses |
| Cambio de llantas | Profundidad < 4 mm | 12 meses |
| Revisión mayor | 200,000 km | 12 meses |

Sistema avisa con 7 días + 1,500 km de anticipación.
Unidad fuera de servicio hasta que se completa el servicio
programado.

## B. Procesos de G3 Tech

### B1 — Ciclo de desarrollo de producto

**Owner**: Product Manager. **Cadencia**: trimestral con check
quincenal.

```
1. Discovery (PM + Diseño + GM Tech)
   ├─ Entrevistas con clientes (mín. 5 por idea)
   ├─ Dogfooding con G3 Logistics
   ├─ Análisis de uso en G3 Admin (métricas)
   └─ Hipótesis priorizada con framework RICE

2. Diseño (Diseño + PM)
   ├─ Wireframes de baja fidelidad
   ├─ Revisión con 3 usuarios potenciales
   ├─ Mock de alta fidelidad
   └─ Handoff a engineering

3. Construcción (Engineering)
   ├─ Specs primero (TDD): tests fallidos
   ├─ Implementación mínima que pasa tests
   ├─ Code review obligatorio (≥ 1 aprobación L4+)
   ├─ Merge a main → CI ejecuta tests
   └─ Deploy a staging automático

4. QA (Engineering + PM)
   ├─ Smoke test manual en staging
   ├─ Validación con cliente piloto (si aplica)
   └─ Decisión go/no-go

5. Lanzamiento (PM + Eng + CS)
   ├─ Deploy a producción (canary 10% → 50% → 100%)
   ├─ Comunicado a usuarios afectados (in-app + email)
   ├─ Documentación actualizada
   └─ Métricas de adopción monitoreadas 30 días
```

### B2 — Onboarding de cliente SaaS

**Owner**: Customer Success Lead. **SLA**: time-to-first-value < 7 días.

| Día | Actividad |
|---|---|
| 0 | Cliente firma y paga (Starter+) o se registra (Free) |
| 0 | Alta automática en G3 Admin con tier seleccionado |
| 1 | CS contacta para agendar setup call (45 min) |
| 2-3 | Setup call: carga inicial de unidades, drivers, primer viaje |
| 4-7 | CS hace check-in cada 2 días para resolver dudas |
| 30 | Health check: NPS + métricas de uso + upsell si aplica |
| 90 | Review trimestral con recomendaciones |

### B3 — Atención de incidente de plataforma

**Owner**: VP Engineering. **Disparador**: alerta en monitoreo o
reporte de cliente.

| Severidad | Definición | SLA respuesta | SLA resolución |
|---|---|---|---|
| P0 | Plataforma caída para todos | 5 min | 1 hr |
| P1 | Función crítica caída para ≥ 10% | 15 min | 4 hrs |
| P2 | Función degradada o caída <10% | 1 hr | 24 hrs |
| P3 | Bug menor, no bloquea operación | 4 hrs | 5 días |

Postmortem obligatorio para P0 y P1. Blameless. Compartido al
equipo en ≤ 5 días.

## C. Procesos transversales

### C1 — Hire de cualquier rol

**Owner**: CHRO Group + Hiring Manager. **SLA**: 60 días para
roles críticos, 90 días estándar.

```
1. Aprobación de la vacante
   ├─ Hiring Manager arma JD basada en plantilla
   ├─ Aprobación según matriz de decisión (ver gobierno)
   └─ Publicación

2. Sourcing
   ├─ Publicación en LinkedIn + sitio careers
   ├─ Referidos internos (bono por referido exitoso)
   └─ Headhunter sólo para L6+ o roles muy especializados

3. Screening
   ├─ Filtro CV por CHRO o reclutador
   ├─ Llamada de 30 min con CHRO
   └─ Filtro técnico si aplica

4. Entrevistas (proceso definido por rol)
   ├─ Operativo: 2 entrevistas + prueba práctica
   ├─ Profesional: 3-4 entrevistas + caso
   ├─ Liderazgo (L5+): 5-6 entrevistas + presentación
   └─ Ejecutivo (L7+): 7+ entrevistas + entrevista con consejero

5. Decisión y oferta
   ├─ Calibración entre entrevistadores (no votación)
   ├─ Aprobación de paquete por CHRO + GM
   └─ Oferta por escrito, 5 días para responder

6. Onboarding (ver C2)
```

### C2 — Onboarding del primer mes

**Owner**: Hiring Manager + CHRO. **Objetivo**: que la persona
contribuya en ≤ 30 días.

```
Día -7   Setup de equipo (laptop, accesos)
Día 0    Bienvenida + entrega de equipo + foto
Día 1    Onboarding corporativo (CHRO): historia, valores,
         políticas, brand book, manual organizacional
Día 2    Tour por áreas (operación, tech, fundación)
Día 3-7  Inmersión en el área del rol
Día 8    Primera asignación productiva
Día 14   1:1 con manager + check con CHRO
Día 30   Evaluación de fin de periodo de prueba
Día 90   Confirmación o ajuste de rumbo
```

### C3 — Cobranza B2B

**Owner**: Gerente de Cuentas por Cobrar. **Disparador**: emisión
de CFDI. **Meta**: DSO ≤ 45 días.

| Día desde factura | Acción |
|---|---|
| 0 | Envío CFDI + acuse al cliente |
| 25 | Email cordial: "Tu factura vence en 5 días" |
| 30 | Vencimiento. Email + WhatsApp si ya está vencida |
| 40 | Llamada del cobrador asignado |
| 50 | Escalamiento al Director Comercial |
| 60 | Reunión con cliente, plan de pago si aplica |
| 90 | Acción legal previa autorización General Counsel + GM Log |

### C4 — Cierre mensual financiero

**Owner**: CFO Group. **Deadline**: día 10 hábil del mes siguiente.

| Día hábil | Actividad | Quién |
|---|---|---|
| 1 | Cierre de operaciones del mes anterior | GMs |
| 2 | Conciliación bancaria | Contabilidad |
| 3-4 | Captura de provisiones y ajustes | Contabilidad |
| 5 | P&L preliminar por entidad | Contabilidad |
| 6-7 | Revisión por GM de cada entidad | GMs |
| 8 | Consolidación holding | CFO Group |
| 9 | Revisión final por CFO + CEO | CFO + CEO |
| 10 | Distribución de reporte al Consejo | Secretario |

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Documento inicial |
