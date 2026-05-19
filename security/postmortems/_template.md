# Postmortem · [Título corto y descriptivo]

> **Plantilla** — copia este archivo y renómbralo
> `YYYY-MM-DD-titulo-corto.md`. Llena cada sección. Borra estas
> líneas de instrucciones cuando termines.

| Campo | Valor |
|---|---|
| Fecha del incidente | `AAAA-MM-DD HH:MM` (hora del centro, MX) |
| Detectado por | (alerta automática / cliente / interno / externo) |
| Duración del impacto | `X horas Y minutos` |
| Severidad | `SEC / P0 / P1 / P2 / P3` |
| Clientes afectados | `# / total · % del MAU` |
| Datos personales tocados | `Sí / No` (si Sí → notificación LFPDPPP) |
| Componente principal | `gateway / auth-service / billing / ...` |
| Controles DSI involucrados | `Google-Cloud Run-01, ...` (si aplica) |
| Incident Commander | nombre |
| Tech Lead | nombre |
| Communicator | nombre |
| Scribe | nombre |
| Autor del postmortem | nombre |

---

## 1 · Resumen ejecutivo

> 3-4 líneas. Qué pasó, cómo afectó, cómo se resolvió, qué viene.
> Si alguien del consejo solo lee este párrafo, debe entender el
> incidente sin contexto adicional.

[Resumen]

## 2 · Timeline

> Hora local (CT). Cada evento relevante. Granularidad: minutos en
> la fase aguda, horas en investigación.

```
HH:MM  Evento
HH:MM  Evento
...
```

Ejemplo:

```
14:23  Detección por alerta Cloud Monitoring (p95 latency 5s vs 200ms baseline)
14:25  IC asignado, triaje inicia. Severidad P1.
14:27  Confirmado: gateway respondiendo 503 al 18% de requests
14:30  Tech Lead identifica: connection pool exhaustion contra Cloud SQL
14:35  Mitigación temporal: aumentar maxConnections en cloud-sql instance
14:38  Métricas vuelven a baseline
15:00  Investigación causa raíz inicia
17:20  Causa raíz identificada (ver §4)
18:45  Fix definitivo desplegado a producción
```

## 3 · Impacto

| Métrica | Valor |
|---|---|
| Requests afectados | `N` |
| Clientes únicos afectados | `N (% del MAU)` |
| Tiempo total degradado | `N min` |
| SLA breach | `Sí / No` |
| Revenue impactado | `$X MXN estimado` |
| Trabajo perdido del equipo (mitigación) | `N personas × N horas` |
| Datos personales expuestos | `N registros / 0` |

## 4 · Causa raíz (5 whys)

> No te pares en el primer "porque". Sigue preguntando hasta llegar
> a una causa sistémica que se pueda corregir, no a "fulano se
> equivocó".

1. **¿Por qué fallaron los requests?**
   → [respuesta]
2. **¿Por qué [respuesta 1]?**
   → [respuesta]
3. **¿Por qué [respuesta 2]?**
   → [respuesta]
4. **¿Por qué [respuesta 3]?**
   → [respuesta]
5. **¿Por qué [respuesta 4]?**
   → [respuesta — esta es la causa raíz sistémica]

## 5 · Qué funcionó bien

- [Detecciones, decisiones, herramientas que ayudaron]
- ...

## 6 · Qué NO funcionó

- [Procesos, herramientas, falta de visibilidad que extendieron el incidente]
- ...

> No es "qué hizo mal X persona". Es "qué falta en el sistema".

## 7 · Acciones preventivas

> Cada acción tiene **owner y deadline**. Sin owner no es acción.

| # | Acción | Tipo | Owner | Deadline | Estado |
|---|---|---|---|---|---|
| 1 | [descripción concreta y verificable] | Tech / Proceso / Comunicación | @persona | YYYY-MM-DD | TODO |
| 2 | ... | ... | ... | ... | TODO |
| 3 | ... | ... | ... | ... | TODO |

Estados válidos: `TODO`, `IN_PROGRESS`, `DONE`, `WONT_DO` (con
justificación).

## 8 · Cambios técnicos hechos durante el incidente

> Cada commit, config change, infra change que se aplicó en
> mitigación o resolución.

- `SHA commit` — descripción
- `gcloud command` ejecutado
- Config modificado en consola: ...

## 9 · Comunicación externa

> ¿Notificamos a clientes? ¿Cuándo? ¿Por qué medio? ¿Qué dijimos?

- [ ] Email a clientes afectados (fecha + plantilla usada)
- [ ] Post en status.g3logistics.mx (si existe)
- [ ] Notificación INAI (si datos personales)
- [ ] Notificación al consejo

## 10 · Aprendizajes

> 2-3 párrafos. La narrativa del incidente desde un nivel más alto.
> Qué aprendimos como equipo / organización. No técnico — humano y
> sistémico.

[Narrativa]

---

## Aprobaciones

- [ ] Tech Lead: ___________
- [ ] VP Engineering / GM: ___________
- [ ] Compliance Officer (si SEC o datos personales): ___________
- [ ] Comité de Riesgo y Cumplimiento (al cierre del próximo Q)

## Anexos

- Link a Slack #incident-... (archivo)
- Link a doc de timeline en vivo (Google Doc)
- Link a dashboards de métricas en el momento del incidente
- Logs relevantes (Cloud Logging queries)
