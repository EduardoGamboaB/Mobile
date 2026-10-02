# 06 · Protocolo de pruebas de seguridad

Todo desarrollo se prueba **funcional + de seguridad** antes de
producción. Las pruebas funcionales validan que la feature hace
lo que dice. Las de seguridad validan que **no hace lo que no
debería**.

## Pirámide de pruebas

```
                          ┌──────────────────┐
                          │  Manual pentest  │   Trimestral / pre-launch
                          └──────────────────┘
                       ┌────────────────────────┐
                       │  DAST (ZAP, automated) │   Por feature crítica
                       └────────────────────────┘
                  ┌──────────────────────────────────┐
                  │  Tests E2E de seguridad           │   Por PR
                  └──────────────────────────────────┘
              ┌──────────────────────────────────────────┐
              │  Tests unitarios (negativos + positivos) │   Por PR
              └──────────────────────────────────────────┘
         ┌──────────────────────────────────────────────────┐
         │  SAST + SCA + dependency scan (CI/CD)             │   Cada commit
         └──────────────────────────────────────────────────┘
```

## Nivel 1 — SAST en cada commit (automático)

### Configuración del pipeline

`backend/infra/ci/cloudbuild.yaml` debe incluir step:

```yaml
- id: security-scan
  name: returntocorp/semgrep
  entrypoint: semgrep
  args:
    - --config=p/owasp-top-ten
    - --config=p/typescript
    - --error                # fail on findings
    - --severity=ERROR
    - .

- id: secret-scan
  name: zricethezav/gitleaks
  entrypoint: gitleaks
  args: ['detect', '--source=.', '--no-banner']

- id: dependency-scan
  name: node:20-alpine
  entrypoint: sh
  args:
    - -c
    - |
      cd backend && npm audit --audit-level=high --omit=dev
      cd ../mobile && npm audit --audit-level=high --omit=dev
      cd ../admin && npm audit --audit-level=high --omit=dev
      cd ../website && npm audit --audit-level=high --omit=dev
```

Cualquier falla bloquea el merge.

### Local (pre-commit hook)

```bash
# .git/hooks/pre-commit
#!/usr/bin/env bash
set -e
gitleaks detect --staged --no-banner
npm audit --audit-level=high --omit=dev || true   # warn, no block
```

## Nivel 2 — Tests unitarios de seguridad

Cada microservicio tiene archivos `*.security.spec.ts` (o `.test`)
que validan **explícitamente** los casos negativos:

### Plantilla por endpoint

```typescript
describe('POST /api/trips/:id/release-payment — security', () => {
  test('sin Authorization header → 401', async () => {
    const r = await request(app).post('/api/trips/trp_1/release-payment');
    expect(r.status).toBe(401);
  });

  test('JWT expirado → 401', async () => {
    const expired = signJwtExpired({ sub: 'usr_1', companyId: 'cmp_1', tier: 'starter' });
    const r = await request(app)
      .post('/api/trips/trp_1/release-payment')
      .set('Authorization', `Bearer ${expired}`);
    expect(r.status).toBe(401);
  });

  test('JWT con firma alterada → 401', async () => {
    const valid = signJwt({ sub: 'usr_1', companyId: 'cmp_1', tier: 'starter' });
    const tampered = valid.slice(0, -4) + 'XXXX';
    const r = await request(app)
      .post('/api/trips/trp_1/release-payment')
      .set('Authorization', `Bearer ${tampered}`);
    expect(r.status).toBe(401);
  });

  test('tier free intenta release-payment → 402', async () => {
    const t = signJwt({ sub: 'usr_1', companyId: 'cmp_1', tier: 'free' });
    const r = await request(app)
      .post('/api/trips/trp_1/release-payment')
      .set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(402);
    expect(r.body.missingFeatures).toContain('payment_authorization');
  });

  test('usuario de empresa A no ve trip de empresa B → 404', async () => {
    // setup: trip pertenece a cmp_B
    const t = signJwt({ sub: 'usr_X', companyId: 'cmp_A', tier: 'starter' });
    const r = await request(app)
      .post('/api/trips/trp_owned_by_cmp_B/release-payment')
      .set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(404);            // no 403 — no confirmamos existencia
    expect(r.body.message).toMatch(/no encontrado/i);
  });

  test('payload con campos extra → ignorados o 400', async () => {
    const t = signJwt({ sub: 'usr_1', companyId: 'cmp_1', tier: 'starter' });
    const r = await request(app)
      .post('/api/trips/trp_1/release-payment')
      .set('Authorization', `Bearer ${t}`)
      .send({ override_freight: 999999, isAdmin: true });
    expect([200, 400]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body.freightAmount).not.toBe(999999);
    }
  });
});
```

### Cobertura mínima de tests negativos

Para cada endpoint del backend, debe existir test que valide:

- [ ] Auth ausente
- [ ] Auth inválido (4 variantes: expirado, firma mala, tipo mal, malformed)
- [ ] Role insuficiente (cuando aplica)
- [ ] Tier insuficiente (cuando aplica)
- [ ] companyId cross-tenant
- [ ] Input gigante (payload > 1MB) — bloqueado en gateway
- [ ] Input mal tipado
- [ ] Concurrencia / race condition (cuando aplica)

## Nivel 3 — Tests E2E

`backend/services/*/test/**/*.e2e.spec.ts` debe incluir:

### Plantilla flow completo

```typescript
test('ciclo viaje free → upgrade → release-payment', async () => {
  // Free intenta releasePayment → 402
  // Cliente sube a Starter (Stripe webhook simulado)
  // Re-intenta releasePayment → 200
  // Auditoría: evento de cambio de tier en Pub/Sub recording bus
});
```

## Nivel 4 — DAST (Dynamic Application Security Testing)

Después de cada deploy a staging:

```bash
# OWASP ZAP baseline scan automatizado
docker run --rm -v $(pwd):/zap/wrk owasp/zap2docker-stable \
  zap-baseline.py -t https://staging.g3logistics.mx \
  -r zap-report.html \
  -J zap-report.json

# Verificar: ≤ 0 high, ≤ 5 medium
```

Reportes se publican en `security/reports/dast/` con timestamp.

## Nivel 5 — Pruebas manuales de penetración

### Por feature crítica (antes de lanzamiento)

Cuando se va a lanzar feature con **datos sensibles** (autorización
de pagos, cambio de tier, OCR de evidencias, IA), el SRE o un
contratista externo ejecuta un **mini-pentest**:

1. Spoofing: intentar suplantar identidad
2. SQL injection en cada input
3. XSS reflected / stored en formularios
4. SSRF si la feature hace requests outbound
5. IDOR (Insecure Direct Object Reference) cambiando IDs
6. Race conditions en flujos críticos
7. Logic bugs (descuentos > 100%, cantidades negativas, etc.)

### Pre-beta (externo)

El primer pentest externo (caja gris, ASVS L2 + MASVS) y sus criterios de
salida están en [`08-pentest-scope.md`](./08-pentest-scope.md).

### Trimestral (toda la plataforma)

Cada quarter, pentest completo:

- Auth flow
- Tier gating
- Multi-tenant isolation
- API gateway
- Webhooks (Stripe, GitHub si aplica)
- Mobile app reverse engineering (cuando haya release oficial)

Resultados van al **Comité de Riesgo y Cumplimiento**.

## Nivel 6 — Validación de controles DSI

Cada quarter, ejecutar el script de auditoría:

```bash
# Pendiente de crear: security/scripts/audit-controls.sh
# Recorre los 181 controles y verifica estado real
```

Reporte resultante:

| Código DSI | Servicio | Estado | Evidencia | Última verificación |
|---|---|---|---|---|
| Google-Cloud Run-01 | Cloud Run | OK | gcloud iam policies query → no allUsers | 2026-05-19 |
| Google-IAM-04 | IAM | NOK | service account "default" usado en proyecto | 2026-05-19 |
| ... | ... | ... | ... | ... |

## Protocolo de "Listo para producción"

Antes de mover de staging a producción, el **release manager**
firma:

- [ ] Tests unitarios verde (100%)
- [ ] Tests E2E verde (100%)
- [ ] SAST verde (0 findings ERROR)
- [ ] Dependency scan verde (0 high/critical)
- [ ] DAST en staging: 0 high, ≤ 5 medium documentados como falso
      positivo o aceptados
- [ ] Manual smoke test pasó
- [ ] Cloud Build deploy exitoso a staging
- [ ] Sentry / monitoreo no muestra spike en errores
- [ ] Si afecta a control DSI ponderación 5: aprobación de
      Compliance Officer

Sin estas casillas marcadas, no se promueve a producción.

## Reportes

Reportes versionados en:

```
security/reports/
├── sast/           # por commit ID, output de semgrep
├── dast/           # por deploy ID, ZAP HTML + JSON
├── audit/          # trimestrales del catálogo DSI
└── pentest/        # trimestrales o post-incident
```

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Protocolo inicial |
