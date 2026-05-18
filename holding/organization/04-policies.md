# 04 · Políticas corporativas

Resumen ejecutivo de las políticas que rigen al grupo. Cada política
tiene un documento extenso firmado y registrado; aquí está la
versión navegable.

## 1. Código de conducta y ética

**Aplica a**: 100% de empleados (incluidos operadores), consejeros,
contratistas y proveedores con relación contractual.

### Principios

1. **Honestidad**: no se miente al cliente, al colega, al regulador.
2. **Cumplimiento legal**: se respetan las leyes mexicanas y los
   estándares aplicables.
3. **Respeto**: cero tolerancia a discriminación o acoso.
4. **Seguridad**: cero atajos en seguridad operativa.
5. **Confidencialidad**: la información del cliente es del cliente.

### Reglas explícitas

- **Regalos**: aceptar regalos > $1,000 MXN de cliente o proveedor
  requiere reportarlo a Compliance. Regalos en efectivo: nunca.
- **Comidas y eventos**: aceptables si son recíprocos y no buscan
  influir decisión específica.
- **Empleo secundario**: permitido si no compite, no canibaliza
  tiempo laboral y se declara.
- **Inversiones**: empleados L5+ no pueden invertir en empresas
  competidoras directas sin notificar a Compliance.

### Sanciones

- Violación menor: amonestación escrita + capacitación
- Violación grave: despido inmediato + acción legal si aplica
- Violación con impacto material: notificación al Consejo y a
  autoridades competentes

### Línea ética

Canal anónimo: `etica@g3logistics.mx` + formulario web. Gestiona
proveedor externo para garantizar anonimato real. Sin represalias.

## 2. Política anti-corrupción y anti-soborno

**Cumplimiento**: Ley General de Responsabilidades Administrativas
(MX), Foreign Corrupt Practices Act (FCPA, EUA — aplica si tenemos
clientes o socios estadounidenses), UK Bribery Act.

### Prohibiciones absolutas

- Pagar, prometer u ofrecer cualquier valor a funcionario público
  para obtener beneficio
- "Facilitation payments" (pagos para acelerar trámites) — incluidos
- Pagos a través de intermediarios para evitar la regla
- Donativos políticos a nombre del grupo (donativos personales sin
  liga al cargo, permitidos)

### Controles

- **Due diligence a terceros**: todo intermediario, agente aduanal
  o gestor pasa filtro previo
- **Aprobaciones**: cualquier gasto > $5,000 MXN con funcionario
  público requiere aprobación de Compliance + Legal
- **Capacitación**: anual obligatoria para roles L4+
- **Auditoría**: revisión anual por auditor externo

## 3. Política de protección de datos personales (LFPDPPP)

**Aplica a**: datos de clientes, empleados, candidatos,
proveedores, usuarios de SaaS.

### Principios

- **Consentimiento explícito** antes de recolectar dato sensible
- **Mínimo necesario**: sólo se pide lo que la operación requiere
- **Calidad**: datos correctos y actualizados
- **Seguridad**: cifrado en tránsito (TLS 1.3) y en reposo (AES-256)
- **Acceso por necesidad**: roles con principio de mínimo privilegio
- **Retención**: por el tiempo legal o de la relación + 5 años
  contables, después se eliminan o anonimizan
- **Derechos ARCO**: respondemos en ≤ 20 días hábiles

### Aviso de privacidad

Publicado en `g3logistics.mx/legal/privacidad/`. Versionado. Cada
cambio se notifica a usuarios activos.

### Encargado del tratamiento

Compliance Officer es el responsable interno. Reporta al INAI
cualquier incidente de seguridad en ≤ 72 hrs.

### Datos de clientes del SaaS (G3 Admin / Drive)

- **Tenancy aislado**: cada cliente es un `companyId` separado,
  sin acceso cruzado
- **Hosting**: GCP us-central1, sin réplicas fuera de México sin
  consentimiento del cliente
- **Eliminación**: cliente puede solicitar borrado completo en
  cualquier momento; ejecutamos en ≤ 30 días
- **No-entrenamiento**: jamás usamos data del cliente para entrenar
  modelos propios o de terceros

## 4. Política de Seguridad y Salud Ocupacional (HSE)

**Cumplimiento**: NOM-068 (condiciones de seguridad para
autotransporte), NOM-087 (horas de servicio del operador),
NOM-013 (mantenimiento), STPS-019 (constitución de comisiones de
seguridad).

### Operadores

- **Capacitación inicial**: 40 hrs antes del primer viaje
- **Capacitación continua**: 16 hrs anuales mínimas
- **Examen médico**: anual + post-incidente
- **Antidoping**: aleatorio + post-incidente + al ingreso
- **Horas de servicio**: respeto estricto a NOM-087 (8 hrs
  manejando, descanso 8 hrs continuas, etc.)
- **Botiquín y extintor**: revisados cada 30 días

### Flota

- **Inspección pre-viaje**: obligatoria por operador, capturada en
  G3 Drive
- **Mantenimiento preventivo**: por kilometraje, no por avería
- **Llantas**: inspección cada inicio de turno + medición de
  profundidad mensual

### Oficinas y patios

- **Comisión mixta de seguridad**: como marca la STPS
- **Simulacros**: 2/año mínimo
- **Reporte de cuasi-accidentes**: cultura de reportar para aprender,
  sin sanción por reportar

### Incidentes

- **Reporte inmediato**: ≤ 30 min al dispatcher
- **Investigación causa raíz**: ≤ 5 días hábiles
- **Lecciones aprendidas**: compartidas a todo el equipo operativo
- **Actualización de procedimiento**: si la causa lo amerita

## 5. Política de prevención de acoso

**Cumplimiento**: NOM-035-STPS (riesgos psicosociales).

### Definiciones

- **Acoso laboral**: conducta repetida que humilla, intimida o
  menoscaba a una persona
- **Acoso sexual**: conducta unilateral de naturaleza sexual no
  deseada
- **Discriminación**: trato diferenciado por género, edad, origen,
  preferencia sexual, religión, condición física

### Prevención

- Capacitación anual obligatoria
- Encuesta de clima organizacional semestral
- Política comunicada en onboarding y publicada en intranet

### Denuncia

- Canal directo a CHRO o vía línea ética
- Investigación: ≤ 15 días hábiles, con confidencialidad estricta
- Sanción: amonestación → suspensión → despido, según gravedad
- Protección al denunciante: cero represalias

## 6. Política de uso aceptable de tecnología

Aplica a empleados con acceso a sistemas internos.

- **Contraseñas**: gestor de contraseñas obligatorio, MFA en todos
  los servicios críticos
- **Equipos**: cifrado de disco obligatorio, lock automático a 5 min
- **Email corporativo**: uso laboral, sin enviar info confidencial
  sin cifrado
- **VPN**: obligatoria para acceso a sistemas internos desde fuera
  de oficina
- **Software no autorizado**: prohibido en equipos corporativos
- **Reporte de incidente**: cualquier acceso no autorizado o pérdida
  de dispositivo se reporta en ≤ 4 hrs a IT/Compliance

## 7. Política de gastos y viáticos

- **Pre-aprobación**: viajes nacionales > 3 días, internacionales
  todos
- **Hospedaje**: tarifa máxima por ciudad (publicada en intranet)
- **Comidas**: $400 MXN/día foráneo
- **Operadores en ruta**: tarifa fija por día de viaje, no
  comprobación individual (simplifica la operación)
- **Comprobación**: ≤ 5 días hábiles después del viaje, con
  factura CFDI

## 8. Política de compensación y bonos

- **Bandas salariales**: por nivel y por ciudad (publicadas
  internamente)
- **Revisión salarial**: anual en enero, basada en performance y
  mercado
- **Bono variable**:
  - Roles L4-L5: hasta 15% del salario anual, ligado a OKRs del área
  - L6-L7: hasta 30%, mix de OKRs área + métricas de la entidad
  - L8 (C-suite): hasta 50%, métricas de la entidad + holding
- **Equity en G3 Tech** (S.A.P.I.):
  - Plan de stock options con vesting 4 años, cliff 1 año
  - Disponible para roles L4+ contratados con paquete que lo
    incluya
- **Compensación de operadores**: salario base + comisión por viaje
  cumplido + bono mensual de seguridad (sin incidentes)

## 9. Política de comunicación externa

- **Voceros oficiales**:
  - Temas corporativos: CEO Group
  - Temas operación de carga: GM Logistics
  - Temas tecnología: GM Tech
  - Temas sociales: Director Ejecutivo Fundación
- **Coordinación**: cualquier entrevista o panel se coordina con
  Comunicación (cuando exista función) o con el CEO Group
- **Redes sociales personales**: empleados pueden expresar opiniones
  personales claramente identificadas como tales, sin hablar a
  nombre de G3
- **Crisis de comunicación**: protocolo dedicado (existe playbook
  separado)

## 10. Política de sustentabilidad

- **Huella de carbono**: medición anual, meta de reducción 5%/año
  por viaje-kilómetro (cambio gradual a flota híbrida/GNV cuando
  el mercado lo permita)
- **Reporte ESG**: anual, alineado a estándares GRI Standards
- **Inversión social**: ≥ 1% de utilidades del grupo a Fundación G3
- **Cadena de suministro**: due diligence ambiental y social a
  proveedores estratégicos

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Documento inicial |
