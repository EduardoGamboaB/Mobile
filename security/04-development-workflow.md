# 04 · Flujo de desarrollo con seguridad integrada

Cada cambio que entra al repositorio sigue este flujo. **No hay
excepciones**, ni siquiera para hotfixes — los hotfixes simplemente
comprimen los pasos pero todos se ejecutan.

```
┌─────────────────────────────────────────────────────────────┐
│ 0. DISCOVERY                                                 │
│    Threat model · clasificación de datos · controles aplicables│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PRE-DESARROLLO                                            │
│    Diseño revisado · controles identificados · checklist abierto│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DESARROLLO                                                │
│    TDD · linters · SAST · dependency check                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. REVIEW                                                    │
│    Code review · security checklist firmado · CI verde       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. STAGING                                                   │
│    Deploy a staging · DAST · pruebas funcionales y de seguridad│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PRODUCCIÓN                                                │
│    Canary 10% → 50% → 100% · monitoreo · postmortem si falla │
└─────────────────────────────────────────────────────────────┘
```

## Fase 0 — Discovery (antes de escribir código)

Antes de cualquier feature no trivial, contestar por escrito en
el ticket:

### 0.1 Threat model (5-10 min con STRIDE)

| Amenaza | Aplica a esta feature | Mitigación inicial |
|---|---|---|
| **S**poofing — suplantación | ¿Autenticación involucrada? | JWT + verify firma |
| **T**ampering — manipulación de datos | ¿Modifica registros? | Validación en backend, no confiar en cliente |
| **R**epudiation — repudio | ¿Acción crítica? | Audit log con timestamp + actor |
| **I**nformation disclosure — fuga | ¿Datos sensibles? | TLS + companyId isolation + least privilege |
| **D**enial of Service | ¿Endpoint público? | Rate limiting + Cloud Armor |
| **E**levation of privilege | ¿Cambia rol o tier? | Validación server-side + tests negativos |

### 0.2 Clasificación de datos

¿Qué datos toca esta feature?

| Categoría | Ejemplos | Restricción |
|---|---|---|
| **Público** | Catálogo de tiers, paginas marketing | Ninguna |
| **Interno** | Métricas operativas agregadas | TLS + auth |
| **Confidencial** | Datos de cliente, evidencias, viajes | TLS + auth + companyId isolation + audit log |
| **Sensible** | Contraseñas, JWT secrets, Stripe keys, PII | Secret Manager + CMEK + access log + rotación |
| **Restringido** | Datos regulados (CNBV si llegamos), info bancaria | Encryption + auditoría externa + revisión Compliance |

### 0.3 Controles aplicables

Identificar **del catálogo DSI** qué controles aplican:

- Ver [02-stack-mapping.md](./02-stack-mapping.md) para mapping
  componente → controles
- Listar los códigos específicos en el ticket
- Si hay control crítico (ponderación 5) sin cumplir, **bloquear
  el inicio del desarrollo** hasta resolver

## Fase 1 — Pre-desarrollo

Antes del primer commit:

- [ ] Diseño revisado por team lead (en discovery, no en review)
- [ ] Threat model documentado en el ticket
- [ ] Clasificación de datos hecha
- [ ] Controles del catálogo identificados (códigos DSI específicos)
- [ ] Branch creada desde `main` actualizado
- [ ] Si toca infra, plan de cambio (`terraform plan`) compartido
- [ ] [`05-security-checklist.md`](./05-security-checklist.md)
  copiado al PR template

## Fase 2 — Desarrollo

### 2.1 Reglas mientras codeas

- **TDD obligatorio** en cualquier lógica de negocio que involucre
  datos del cliente, tier gating, o autenticación
- **Validación server-side siempre**. El frontend valida para UX,
  el backend valida para seguridad — nunca confiar en payload
- **Errores con detalle interno, mensaje genérico al cliente**.
  Stack traces no se devuelven en respuestas HTTP
- **Secretos en variables de entorno**, jamás en código (ni en
  commits, ni en logs, ni en mensajes de error)
- **Logging sin PII**. Nada de "fallo login para user@email.com" —
  loguear el `userId` interno
- **Inputs sanitizados** antes de ir a DB (parametrized queries
  siempre, nunca string concat)

### 2.2 Tooling local antes de commit

```bash
# Backend
cd backend
npm run typecheck      # tsc --noEmit
npm test               # 112 tests deben pasar
npm audit              # 0 vulnerabilidades high/critical

# Mobile
cd mobile
npm run typecheck
npm test               # 49 tests deben pasar
npm audit

# Website y Admin
npm run typecheck
npm run build          # debe compilar sin errores
```

### 2.3 SAST automático en CI

Pipeline `cloudbuild.yaml` ejecuta en cada PR:

- `npm audit --audit-level=high` (falla si hay high/critical)
- `semgrep --config=p/owasp-top-ten` (reglas OWASP)
- Linter de seguridad: `eslint-plugin-security`
- Detección de secretos con `gitleaks`

Cualquier fallo bloquea el merge.

## Fase 3 — Review

### 3.1 Code review obligatorio

Cualquier PR requiere **≥ 1 aprobación de L4+** (Lead / Senior).
Reviews enfocadas en:

- ¿Lógica de tier gating correcta?
- ¿companyId isolation en cada query?
- ¿Manejo de errores no expone información?
- ¿Inputs validados antes de DB?
- ¿Secretos correctamente referenciados?

### 3.2 PR template

El PR debe incluir secciones (template en `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Cambios
<descripción>

## Threat model
- Categoría de datos: [Público / Interno / Confidencial / Sensible]
- Amenazas STRIDE consideradas: [...]
- Mitigaciones aplicadas: [...]

## Controles DSI aplicables
- Google-Cloud Run-XX: [implementado / N/A / mitigado por X]
- Google-IAM-XX: [...]

## Security checklist
- [ ] Sin secretos en código ni en logs
- [ ] Validación server-side
- [ ] companyId isolation verificada
- [ ] Tests negativos para casos de seguridad
- [ ] (resto del checklist en 05-security-checklist.md)

## Testing
- [ ] Tests unitarios añadidos / actualizados
- [ ] Tests de seguridad (negativos) añadidos
- [ ] Manual smoke test en staging
```

### 3.3 CI verde obligatorio

No se mergea si:

- Tests fallan
- Typecheck falla
- npm audit reporta high/critical
- SAST reporta hallazgos no documentados como falso positivo
- Cobertura cae > 5% respecto a `main`

## Fase 4 — Staging

Cada merge a `main` despliega a staging automáticamente
(Cloud Build).

### 4.1 Pruebas de seguridad en staging

Antes de promover a producción, ejecutar
[`06-testing-protocol.md`](./06-testing-protocol.md):

- DAST automatizado (ZAP baseline scan contra staging)
- Pruebas de penetración de autenticación
- Pruebas de tier-gating cross-tenant
- Verificación de logs (no debe haber secretos ni PII expuestos)
- Smoke test funcional

### 4.2 Datos de staging

- Staging NO usa datos de producción
- Si se necesita data realista, generar con
  `backend/scripts/seed-staging.ts` (datos sintéticos)
- Si por necesidad excepcional se copia data prod → staging,
  **anonimizar primero** y aprobar con Compliance Officer

## Fase 5 — Producción

### 5.1 Deploy canary

1. **Deploy a 10% del tráfico** (Cloud Run revision con traffic split)
2. **15 minutos de observación** — métricas:
   - Tasa de error < 0.5%
   - p95 latency dentro de SLO
   - Sin spike de 4xx/5xx
   - Sin spike en gasto cloud
3. Si OK → **50% del tráfico** · 30 minutos
4. Si OK → **100% del tráfico**
5. Si NOK en cualquier paso → **rollback automático** a revisión
   anterior

### 5.2 Post-deploy

- Anotar en `RELEASES.md` qué se desplegó y a qué hora
- Anotar incidentes en `INCIDENTS.md` si los hubo (público interno)
- Si hubo incidente, postmortem en ≤ 5 días hábiles
  (ver [07-incident-response.md](./07-incident-response.md))

## Excepciones documentadas

Los casos donde se acepta no cumplir un control:

| Control | Justificación | Mitigación compensatoria | Aprobador | Caducidad |
|---|---|---|---|---|
| (vacío al momento de v1.0) | | | | |

> Toda excepción se documenta en este archivo. Si no está aquí,
> no es excepción válida.

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Workflow inicial |
