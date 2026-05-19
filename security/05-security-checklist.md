# 05 · PR Security Checklist

Cada PR copia este checklist en su descripción. **Sin checklist
firmado, no se mergea**. Marca cada item con `[x]` o N/A con
justificación.

## A. Autenticación y autorización

- [ ] Endpoints nuevos requieren JWT válido (excepto los explícitamente
      públicos: `/api/auth/login`, `/api/auth/register-company`,
      `/api/auth/refresh`, `/api/webhooks/stripe`, `/health`)
- [ ] El JWT se verifica en el **gateway**, no en cada servicio
      (servicios confían en `x-company-id`, `x-tier`, `x-user-id`)
- [ ] Validación de **role** cuando aplica (owner / admin / dispatcher /
      driver / viewer)
- [ ] Validación de **tier** cuando aplica (gating en `gateway` +
      enforcement en `contracts/UpgradeRequiredError`)
- [ ] Tests negativos: usuario sin tier intenta acción gated → 402

## B. Aislamiento multi-tenant (companyId)

- [ ] **Cada query a DB filtra por `companyId`** del JWT
- [ ] Tests verifican que usuarios de compañía A **no pueden** leer/
      modificar recursos de compañía B
- [ ] Foreign keys hacia `companies(id)` configuradas con cascade
      correcto
- [ ] Endpoints que listan recursos no aceptan `companyId` como
      parámetro de query — siempre lo derivan del JWT

## C. Manejo de secretos

- [ ] Sin secretos en código (verificado por `gitleaks`)
- [ ] Sin secretos en logs (auditar `console.log` y `Logger.info`)
- [ ] Sin secretos en mensajes de error devueltos al cliente
- [ ] Sin secretos en respuestas HTTP (incluso 4xx/5xx)
- [ ] Secretos nuevos creados en **Secret Manager**, no en variables
      de entorno con valor literal
- [ ] Si se agregó dependencia nueva, no introdujo API key embebida
- [ ] Rotación documentada para secretos nuevos (≤ 90 días)

## D. Validación de input

- [ ] Validación con `zod` (o equivalente) en backend para body, query
      y headers
- [ ] Validación incluye longitud máxima (anti-DoS por payload gigante)
- [ ] Validación rechaza tipos inesperados (no asume formato del
      cliente)
- [ ] Queries a DB usan **parametrización**, jamás string concat
- [ ] Inputs que se renderizan en HTML están escapados (React lo hace
      automático, verificar `dangerouslySetInnerHTML`)
- [ ] Inputs que se incluyen en URLs están URL-encoded

## E. Manejo de errores

- [ ] Errores devuelven **mensaje genérico** al cliente, stack trace
      solo en logs
- [ ] Errores de autenticación devuelven el **mismo mensaje** para
      "usuario no existe" y "contraseña incorrecta" (anti-enumeration)
- [ ] Errores 4xx/5xx incluyen `error code` para soporte, no detalles
      internos
- [ ] Errores no exponen estructura interna (rutas de archivos,
      versiones de librerías, queries SQL)

## F. Logging y auditoría

- [ ] Acciones críticas (login, cambio de tier, autorización de pago,
      borrado de recursos) generan **audit log**
- [ ] Logs incluyen `userId`, `companyId`, `action`, `timestamp`,
      `resource_id`
- [ ] Logs **NO incluyen** PII (email, teléfono, password — ni
      hasheado), tokens, ni body completo de requests
- [ ] Si la feature toca Pub/Sub, los eventos publicados se ven en
      Cloud Logging para auditoría
- [ ] Cloud Audit Logs habilitado en cualquier servicio nuevo de GCP

## G. Encryption

- [ ] Datos en tránsito: TLS 1.3 (Cloud Load Balancer lo termina)
- [ ] Datos en reposo: Cloud SQL CMEK, Storage CMEK
- [ ] JWT firmado con secreto fuerte (≥ 32 chars desde Secret Manager)
- [ ] Si la feature maneja archivos cargados por usuarios (fotos OCR,
      cartas porte), se almacenan en bucket privado con signed URLs
      temporales (no público)

## H. Rate limiting y abuse prevention

- [ ] Endpoints sensibles (login, register, password reset) tienen
      rate limit declarado en Cloud Armor
- [ ] Endpoints costosos (Vertex AI, OCR) tienen rate limit por
      `companyId`
- [ ] Webhooks de Stripe verifican firma antes de procesar
- [ ] No hay endpoints que disparen >1 llamada externa por request
      sin rate limit

## I. Dependencias

- [ ] `npm audit --audit-level=high` reporta 0
- [ ] Si se agregó dependencia nueva:
  - [ ] Justificación en el PR (¿por qué no lo hacemos a mano?)
  - [ ] Revisar últimos commits / mantenedor activo
  - [ ] Verificar licencia compatible (no GPL en código propietario)
  - [ ] Pinneada a versión específica (no `^`, no `~`)

## J. IAM y permisos GCP

- [ ] Si la feature requiere acceso a un nuevo recurso GCP:
  - [ ] Service account dedicada (no usar el default del proyecto)
  - [ ] Roles mínimos necesarios (sin `roles/owner` ni `roles/editor`)
  - [ ] Sin `allUsers` ni `allAuthenticatedUsers` en bindings
- [ ] Si la feature crea un bucket nuevo:
  - [ ] `Public access prevention` = enforced
  - [ ] Uniform bucket-level access habilitado
  - [ ] CMEK configurado si almacena datos confidenciales o sensibles

## K. Frontend (mobile / admin / website)

- [ ] No se guarda **JWT en localStorage** (usar httpOnly cookie en
      web cuando posible, Secure Storage de Expo en mobile)
- [ ] Headers de seguridad configurados:
  - [ ] `Content-Security-Policy` (web)
  - [ ] `Strict-Transport-Security` (HSTS)
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Sin `console.log` con datos sensibles en builds de producción
- [ ] Mobile: permisos solicitados son los mínimos necesarios
- [ ] Mobile: cert pinning evaluado para release builds

## L. Vertex AI (cuando aplique)

- [ ] Inputs al modelo validados (longitud, tipo de contenido)
- [ ] Outputs filtrados antes de devolver al cliente (no exponer
      raw response sin revisión)
- [ ] Rate limit por `companyId` para evitar costos explosivos
- [ ] Logs de prompts y respuestas para auditoría (sin PII)
- [ ] Fallback a stub si el modelo falla — ya implementado en
      `services/ai`, mantener al añadir nuevos agentes
- [ ] **No fine-tunear** con datos de cliente sin consentimiento
      explícito (política LFPDPPP)

## M. Tests de seguridad (no funcionales)

Cada PR de feature crítica debe incluir tests que validen:

- [ ] Acceso sin token → 401
- [ ] Acceso con token expirado → 401
- [ ] Acceso con token de tipo equivocado (refresh vs access) → 401
- [ ] Acceso con token manipulado (firma alterada) → 401
- [ ] Usuario de empresa A accede a recurso de empresa B → 404 (no
      403, que confirma existencia)
- [ ] Usuario sin tier requerido → 402 UpgradeRequiredError
- [ ] Payload demasiado grande → 413
- [ ] Payload con campos no esperados → 400 o ignorados (depende del
      diseño documentado)

## N. Documentación

- [ ] Si la feature expone API pública, documentar en
      `docs/api/openapi.yaml` (si existe)
- [ ] Si la feature toca datos del cliente de forma nueva, actualizar
      `holding/organization/04-policies.md` sección de protección
      de datos
- [ ] Si la feature requiere consent del usuario (nuevo permiso,
      nuevo tipo de dato), actualizar el aviso de privacidad
- [ ] Si la feature toca control DSI específico, mencionar el código
      en el PR (ej. "implementa `Google-Cloud Run-01`")

## Firmas

- [ ] Code review aprobado por: __________________ (L4+)
- [ ] Security review aprobado por: __________________ (cuando
      ponderación 5 o datos sensibles/restringidos)
- [ ] PR checklist firmado por: __________________ (autor)

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Checklist inicial |
