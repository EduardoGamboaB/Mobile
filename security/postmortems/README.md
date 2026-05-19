# Postmortems

Cada incidente — operativo o de seguridad — termina en un postmortem
blameless escrito en ≤ 5 días hábiles. Esta carpeta es el archivo
histórico que se discute trimestralmente con el Comité de Riesgo y
Cumplimiento.

## Reglas

1. **Blameless**: enfoque en el sistema, no en personas
2. **Escrito por el IC** (Incident Commander), revisado por el equipo
3. **Compartido a todo el equipo** en ≤ 5 días hábiles post-incidente
4. **Acciones preventivas con owner y deadline** — no recomendaciones
   vagas
5. **No se borran ni editan**, solo se anexan correcciones al final

## Nomenclatura

```
postmortems/
├── README.md (este archivo)
├── _template.md                         plantilla para nuevos PMs
├── YYYY-MM-DD-titulo-corto.md           formato de archivo
├── YYYY-MM-DD-otro-incidente.md
└── ...
```

## Severidades

| Sev | Definición | Aprobador del PM |
|---|---|---|
| **SEC** | Incidente de seguridad (intrusión, fuga, ataque) | Compliance Officer + CEO Group |
| **P0** | Plataforma caída para todos los clientes | VP Engineering + CEO Group |
| **P1** | Función crítica caída ≥ 10% | VP Engineering |
| **P2** | Función degradada o caída < 10% | Tech Lead afectado |
| **P3** | Bug menor con workaround | Tech Lead afectado |

## Plantilla

Usa [`_template.md`](./_template.md) — cópialo y renómbralo con la
fecha + título descriptivo.

## Flujo

```
T+0       Incidente declarado en Slack #incident-AAAAMMDD-NNN
T+5min    IC + Tech Lead + Comms + Scribe asignados
T+30min   Mitigación (rollback / parche / aislamiento)
T+24h     Resolución técnica completa
T+5 días  Postmortem publicado en este folder
T+15 días Acciones preventivas implementadas (o re-planeadas)
T+30 días Re-revisión en sesión del Comité de Riesgo
```

## Ejemplos publicados

(Vacío al cierre de v1.0 — los postmortems se publican cuando ocurren
incidentes. NO inventamos postmortems retroactivos.)
