# PR · [Título]

## Resumen

<!-- ¿Qué cambia este PR y por qué? 3-5 líneas máx. -->

## Tipo de cambio

- [ ] Feature nueva
- [ ] Fix de bug
- [ ] Refactor sin cambio de comportamiento
- [ ] Cambio de infraestructura / config
- [ ] Hotfix de producción

---

## Threat model

> Referencia: [`security/04-development-workflow.md`](../security/04-development-workflow.md)

**Categoría de datos tocados**: <!-- Público / Interno / Confidencial / Sensible / Restringido -->

**Amenazas STRIDE consideradas**:
- Spoofing: <!-- aplica / no aplica / mitigación -->
- Tampering: <!-- ... -->
- Repudiation: <!-- ... -->
- Information disclosure: <!-- ... -->
- DoS: <!-- ... -->
- Elevation of privilege: <!-- ... -->

## Controles DSI aplicables

<!-- Listar códigos del catálogo. Ver security/03-controls/. -->
- `Google-Cloud-Run-XX`: [implementado / N/A / mitigado por X]
- `Google-IAM-XX`: [...]

---

## Security Checklist

> Copia editada de [`security/05-security-checklist.md`](../security/05-security-checklist.md).
> Marca con `[x]` o `[N/A]` con razón corta. **PRs con casillas
> sin marcar no se mergean**.

### A · Auth / authz
- [ ] Endpoints nuevos requieren JWT (o están en la lista de públicos)
- [ ] Verificación de role / tier cuando aplica
- [ ] Tests negativos para tier insuficiente

### B · Aislamiento multi-tenant
- [ ] Cada query filtra por `companyId` del JWT
- [ ] Tests cross-tenant en negativo

### C · Secretos
- [ ] Sin secretos en código
- [ ] Sin secretos en logs ni en respuestas HTTP

### D · Input
- [ ] Validación con zod (o equivalente) en backend
- [ ] Queries parametrizadas

### E · Errores
- [ ] Mensaje genérico al cliente, stack trace solo en logs
- [ ] Anti-enumeration en auth

### F · Logging
- [ ] Acciones críticas generan audit log
- [ ] Sin PII en logs

### G · Encryption
- [ ] TLS y CMEK donde aplique

### H · Rate limit
- [ ] Endpoints sensibles / costosos tienen rate limit

### I · Dependencias
- [ ] `npm audit` verde
- [ ] Si hay dependencia nueva, justificación documentada

### J · IAM GCP
- [ ] Service account con least privilege
- [ ] Sin `allUsers` / `allAuthenticatedUsers`

### K · Frontend
- [ ] Sin JWT en localStorage
- [ ] Headers de seguridad configurados

### L · Vertex AI (si aplica)
- [ ] Validación de input
- [ ] Filtrado de output
- [ ] Rate limit por companyId
- [ ] Logs sin PII

### M · Tests de seguridad
- [ ] Tests negativos añadidos (sin auth, auth expirado, cross-tenant, tier insuficiente)

### N · Docs
- [ ] Si cambia API pública, OpenAPI actualizado
- [ ] Si cambia política de datos, aviso de privacidad actualizado

---

## Testing

- [ ] Tests unitarios añadidos / actualizados
- [ ] Tests E2E pasan (si aplica)
- [ ] Manual smoke test en staging
- [ ] SAST verde (semgrep, npm audit, gitleaks en CI)

## Riesgos conocidos / Excepciones

<!-- Si algo no se cumple, documenta acá con justificación y plan. -->

## Aprobaciones

- [ ] Code review L4+: @___________
- [ ] Security review (si ponderación 5 o datos sensibles): @___________
- [ ] Compliance review (si control DSI ponderación 5 sin cumplir): @___________
