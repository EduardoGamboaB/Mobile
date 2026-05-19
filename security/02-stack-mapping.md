# 02 · Mapping de controles al stack G3

Qué control aplica a qué pieza del sistema. Mapa de superficie de
ataque + cobertura.

## Stack G3 — vista de seguridad

```
Internet
  │
  ▼
[Cloud Armor]                       ← Cloud Armor 3 controles
  │  rate limiting + WAF + DDoS
  ▼
[Cloud Load Balancing]              ← LB 6 controles
  │  TLS termination
  ▼
[Cloud CDN]                         ← CDN 6 controles
  │  cache assets estáticos del website
  ▼
[Gateway · Cloud Run]               ← Cloud Run 11 controles
  │  JWT auth + tier gating + proxy
  ▼
[Microservicios · Cloud Run]        ← Cloud Run 11 controles
  │  auth · billing · drivers · fleet · trips · alerts · ai
  ▼ ▼
[Cloud SQL]   [Cloud Storage]       ← Cloud SQL 12  ·  Storage 9
  │                                   evidencias y fotos OCR
  ▼
[Cloud Pub/Sub]                     ← Pub/Sub 5 controles
  │  eventos de dominio
  ▼
[BigQuery]                          ← BigQuery 5 controles
  │  Data Lake (futuro Enterprise)
  ▼
[Vertex AI]                         ← Vertex AI 32 controles
   6 agentes IA

Transversal:
  [Secret Manager]  ← 6 controles · JWT secrets, Stripe keys, DB pass
  [IAM]             ← 17 controles · service accounts, least privilege
  [Cloud Audit Logs] ← exigido por casi todos los servicios
  [Cloud Monitoring] ← métricas y alerting
  [Cloud KMS]        ← CMEK para encryption at rest
```

## Mapping componente → controles aplicables

### Componentes de capa pública

| Componente | Servicios GCP | Bloque de controles |
|---|---|---|
| Website (www.g3logistics.mx) | Cloud Storage + Cloud CDN + Cloud Armor | storage(9) + cdn(6) + armor(3) |
| Admin panel (app.g3logistics.mx) | Cloud Storage + Cloud CDN + Cloud Armor | storage(9) + cdn(6) + armor(3) |
| API Gateway pública | Cloud Run + Load Balancer + Cloud Armor | run(11) + lb(6) + armor(3) |

### Componentes del backend (microservicios)

| Servicio | Servicios GCP | Controles aplicables |
|---|---|---|
| auth | Cloud Run + Cloud SQL + Secret Manager | run + sql + secrets + IAM |
| billing | Cloud Run + Cloud SQL + Secret Manager | run + sql + secrets + IAM |
| drivers | Cloud Run + Cloud SQL | run + sql + IAM |
| fleet | Cloud Run + Cloud SQL + Pub/Sub | run + sql + pubsub + IAM |
| trips | Cloud Run + Cloud SQL + Pub/Sub | run + sql + pubsub + IAM |
| alerts | Cloud Run + Pub/Sub | run + pubsub + IAM |
| ai | Cloud Run + Vertex AI | run + vertex + IAM |

### Componente IA — caso especial

Vertex AI tiene **32 controles dedicados** — el bloque más grande
del catálogo G3. Razón: AI/ML maneja datos sensibles, modelos
fine-tuned, costos elevados y superficie nueva de ataque (prompt
injection, model theft, data poisoning).

**El ai-service debe cumplir con disciplina mayor**:

- VPC Service Controls obligatorios (perímetro)
- Custom service account con scope mínimo
- Cloud KMS CMEK para encryption
- Logging de cada prompt y respuesta para auditoría
- Rate limiting por companyId
- Prompt validation (longitud, contenido) antes de Vertex
- Output filtering antes de devolver al cliente

### Componente mobile (G3 Drive)

Aunque la app vive en el dispositivo del operador, los controles
aplican a su **comunicación con backend**:

| Item | Control |
|---|---|
| Comunicación con gateway | TLS 1.3 obligatorio (CloudLB control) |
| Token JWT | Refresh ≤ 24h, access ≤ 1h (auth/secrets) |
| Datos en dispositivo | Cifrado nativo + Secure Storage de Expo |
| Evidencias (fotos) | Cifrado en tránsito + Storage controls |
| Permisos | Mínimo necesario (cámara, ubicación, almacenamiento) |
| Cert pinning | Recomendado para versiones release |
| Logging de auth events | Server-side, no en el cliente |

### Componente web (G3 Admin + website)

| Item | Control |
|---|---|
| Hosting estático | Cloud Storage controls (bloque público estricto) |
| Cache | CDN controls (cache headers, immutable assets) |
| HTTPS | TLS 1.3, HSTS, redirect 80→443 |
| CSP headers | Content-Security-Policy estricto |
| CORS | Whitelist explícita de dominios |
| JWT en navegador | httpOnly cookie cuando sea posible, no localStorage |
| Rate limit en gateway | Cloud Armor rules |
| XSS / CSRF | Defensa en profundidad: CSP + sameSite cookies |

## Áreas no cubiertas por DSI (responsabilidad propia)

DSI Grupo Salinas se enfoca en cloud config. Hay áreas que el
catálogo no cubre y son responsabilidad propia de G3:

| Área | Quién aplica | Referencia |
|---|---|---|
| OWASP Top 10 en código | Cada team lead | [06-testing-protocol.md](./06-testing-protocol.md) |
| SAST (análisis estático de código) | CI/CD | (semgrep + npm audit en pipeline) |
| DAST (pruebas dinámicas) | SRE | (ZAP automatizado contra staging) |
| SBOM (Software Bill of Materials) | SRE | (Syft + Grype mensual) |
| Threat modeling | Cada feature crítica | STRIDE en discovery |
| Bug bounty | Pendiente | (programa post-launch) |
| Awareness training del equipo | CHRO | Trimestral |

## Riesgo residual aceptado

Después de aplicar los 181 controles + responsabilidad propia,
queda riesgo residual aceptado por el Consejo:

1. **Dependencia del proveedor cloud (GCP)** — mitigada con
   diseño multi-region, no multi-cloud
2. **Insider threat** — mitigada con auditoría, separación de
   funciones, y no con monitoreo invasivo
3. **Compromiso de un cliente del SaaS** — mitigada con
   aislamiento por `companyId`, no con red privada por cliente
4. **0-days en GCP managed services** — aceptada como riesgo
   sistémico de la industria

## Auditoría de cumplimiento

Cada quarter, el SRE corre el script
`security/scripts/audit-controls.sh` (pendiente de crear) que:

1. Recorre los 181 controles
2. Por cada uno, ejecuta una verificación contra el estado real
   de GCP usando `gcloud asset search-all-resources`
3. Genera un reporte CSV con: control, estado (OK / NOK / NA),
   evidencia, fecha de última verificación
4. Sube el reporte al Comité de Riesgo y Cumplimiento

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Mapping inicial · 181 controles → componentes G3 |
