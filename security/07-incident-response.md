# 07 · Respuesta a incidentes

Cuando algo sale mal — y eventualmente sale mal — esta es la
guía. No hay tiempo para improvisar bajo presión, por eso esto
está escrito antes.

## Definiciones

| Tipo | Ejemplo | SLA respuesta |
|---|---|---|
| **Incidente de seguridad** | Acceso no autorizado, fuga de datos, ataque DDoS | 5 min |
| **Incidente operativo P0** | Plataforma caída para todos los clientes | 5 min |
| **Incidente operativo P1** | Función crítica caída ≥ 10% usuarios | 15 min |
| **Cuasi-incidente** | Anomalía sin impacto pero indicativa | 1 hr (log + investigate) |
| **Vulnerabilidad reportada** | Bug bounty / pentest / fuente externa | 24 hr (acknowledge) |

## Roles durante incidente

| Rol | Función |
|---|---|
| **Incident Commander (IC)** | Coordina, no tiene las manos en el sistema. Toma decisiones. |
| **Tech Lead** | Investiga y resuelve técnicamente |
| **Communicator** | Habla con clientes, redes, ejecutivos. Único vocero. |
| **Scribe** | Documenta timeline minuto a minuto en doc compartido |

En equipos chicos un humano puede tener dos roles, pero **IC y
Tech Lead nunca son la misma persona** — la presión de fix divide
el juicio del coordinador.

## Flujo de respuesta — incidente de seguridad

```
T+0      Detección
         ├─ Por alerta automática (Cloud Monitoring / Cloud Armor)
         ├─ Por reporte de cliente
         ├─ Por reporte externo (bug bounty / pentest / community)
         └─ Por descubrimiento interno

T+5 min  Triaje
         IC asignado · severidad confirmada · canal de comunicación
         abierto (Slack #incident-NNN)

T+15 min Contención
         ├─ ¿Aislar el componente afectado?
         ├─ ¿Revocar credenciales comprometidas?
         ├─ ¿Bloquear IPs en Cloud Armor?
         └─ ¿Activar maintenance mode?

T+30 min Investigación
         ├─ Logs de los últimos 24h del componente
         ├─ Cloud Audit Logs de cambios recientes
         ├─ Diff de commits / configs vs últimos días
         └─ Determinar alcance: ¿qué datos? ¿cuántos clientes?

T+1-4 hr Mitigación
         ├─ Fix temporal (rollback, parche, restricción)
         ├─ Comunicación a clientes afectados (si data leak)
         ├─ Comunicación interna a Comité Ejecutivo
         └─ Si datos personales tocados: notificación INAI ≤ 72h

T+4-24h  Resolución
         ├─ Fix definitivo desplegado
         ├─ Reset de credenciales si aplica
         ├─ Monitoreo intensificado por 24-48h

T+5 días Postmortem blameless
         ├─ Timeline completo
         ├─ Causa raíz (5 whys)
         ├─ Qué funcionó / qué no
         ├─ Acciones preventivas con owner y deadline
         └─ Compartido al equipo y al Comité de Riesgo
```

## Cómo declarar un incidente

1. Crear canal Slack `#incident-AAAAMMDD-NNN`
2. Mensaje pinned con:
   - Tipo y severidad
   - IC asignado
   - Tech Lead asignado
   - Communicator asignado
   - Link al doc de timeline (Google Doc compartido)
3. Notificar por separado a:
   - Compliance Officer (siempre)
   - CEO Group (P0 + cualquier dato personal afectado)
   - Consejo (cuando hay impacto material)

## Comunicación externa

### Cuando hay datos personales involucrados

Plazo legal en México (LFPDPPP):

- **INAI**: notificación dentro de las próximas vulneraciones
  (artículo 64 LFPDPPP, regulación específica caso por caso)
- **Titulares de los datos**: informar afectados con detalle
  (qué pasó, qué datos, qué hacer)

Texto base para notificación al titular:

```
Estimado(a) [nombre]:

Le informamos que el [fecha] detectamos un incidente de
seguridad en nuestros sistemas que pudo haber afectado los
siguientes datos suyos: [lista específica].

Acciones que tomamos:
- [acción 1]
- [acción 2]

Acciones que le recomendamos:
- [acción concreta y útil]

Si tiene preguntas, escriba a privacidad@g3logistics.mx o llame
al [número] de lunes a viernes 9-18 hrs.

Atentamente,
G3 Logistics
```

### Cuando NO hay datos personales pero hay impacto operativo

- Email a clientes activos del SaaS afectado
- Post en `status.g3logistics.mx` (si existe) o twitter/linkedin
  corporativo
- Sin entrar en detalles técnicos hasta postmortem público

### Lo que **NO** se hace

- Minimizar el incidente ("nada importante pasó")
- Culpar a otra empresa, proveedor o empleado sin investigar
- Decir "estamos investigando" durante días sin update
- Esconder el incidente porque "no se enteró nadie"

## Postmortem blameless

Plantilla obligatoria post-incidente (≤ 5 días hábiles):

```markdown
# Postmortem · [Título corto]

**Fecha del incidente**: AAAA-MM-DD HH:MM (CT)
**Duración del impacto**: X minutos / horas
**Severidad**: P0 / P1 / Security
**Clientes afectados**: # / total · % del MAU
**IC**: nombre
**Autor del postmortem**: nombre

## Resumen ejecutivo (3-4 líneas)
[Qué pasó, cómo afectó, cómo se resolvió, qué viene]

## Timeline
- 14:23 — Detección por alerta de Cloud Monitoring
- 14:25 — IC asignado, triaje inicia
- ...

## Impacto
- [Cliente / endpoint / dato] afectado
- # de usuarios / requests / dollars / etc.

## Causa raíz (5 whys)
1. ¿Por qué se cayó? — Memoria insuficiente
2. ¿Por qué falta memoria? — Carga 10x normal
3. ¿Por qué la carga 10x? — Cliente integrado mal con webhook
4. ¿Por qué no detectamos antes? — No teníamos rate limit por cliente
5. ¿Por qué no había rate limit? — No estaba en checklist de onboarding

## Qué funcionó
- [cosas que ayudaron a resolverlo rápido]

## Qué NO funcionó
- [cosas que extendieron el impacto o complicaron]

## Acciones preventivas
| # | Acción | Owner | Deadline |
|---|---|---|---|
| 1 | Rate limit por companyId en webhook | Tech Lead Backend | 2026-MM-DD |
| 2 | Alerta en Cloud Monitoring por carga anómala | SRE | 2026-MM-DD |
| 3 | Actualizar onboarding checklist con rate limit | CS Lead | 2026-MM-DD |

## Acciones técnicas concretas tomadas
- Commit [SHA] revirtió el cambio
- Configuración X actualizada
- Cliente notificado
```

Postmortems se publican en `security/postmortems/AAAA-MM-DD-titulo.md`
y se discuten en la siguiente sesión del Comité de Riesgo y
Cumplimiento.

## Runbooks por tipo de incidente

### A. Credenciales / secretos comprometidos

```bash
# 1. Rotar el secreto en Secret Manager
gcloud secrets versions add SECRET_NAME --data-file=- < new_value.txt

# 2. Forzar re-deploy de servicios que lo usan (toma nueva versión)
gcloud run services update SERVICE --region=$REGION

# 3. Revocar tokens emitidos (si JWT secret comprometido)
# Cambiar accessSecret en config + invalidar refresh tokens en DB

# 4. Auditar Cloud Audit Logs de uso del secreto
gcloud logging read 'resource.type="secretmanager.googleapis.com/Secret"
  AND timestamp>="2026-05-19T00:00:00Z"' --limit=100
```

### B. Acceso no autorizado detectado

```bash
# 1. Identificar el actor (IP, user agent, userId si autenticado)
# 2. Bloquear IP en Cloud Armor
gcloud compute security-policies rules create 1000 \
  --security-policy=g3-armor-policy \
  --src-ip-ranges=X.X.X.X/32 \
  --action=deny-403

# 3. Si tiene cuenta: revocar sesiones, suspender cuenta
# 4. Snapshot de logs de su actividad para investigación
```

### C. Fuga de datos sospechada

1. Aislar componente: detener tráfico de salida si posible
2. Snapshot inmediato del estado actual (logs, DB, configs)
3. NO borrar nada — evidencia forense
4. Activar runbook de comunicación legal (LFPDPPP)
5. Determinar alcance preciso antes de notificar (no estimar de
   más, no estimar de menos)

### D. Servicio caído (P0)

Ver `docs/runbooks/service-down.md` (pendiente de crear).

### E. Ataque DDoS detectado

1. Cloud Armor debería absorber con `rate-based-ban`
2. Si no es suficiente: subir nivel de Cloud Armor a Adaptive
   Protection
3. Activar emergencias en provider (caso extremo)
4. Comunicar a clientes que "servicio puede tener latencia
   elevada por mitigación de tráfico anómalo"

## Bug bounty (futuro)

Cuando esté el programa:

- Reportes a `security@g3logistics.mx`
- Acknowledge en ≤ 24h
- Triage en ≤ 5 días hábiles
- Fix según severidad (Critical 30d, High 60d, Medium 90d)
- Recompensa según severidad (USD 100-5,000)
- Publicación en hall of fame (si el reporter quiere)

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Runbook inicial |
