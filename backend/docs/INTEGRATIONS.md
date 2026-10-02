# Módulo de integraciones (proveedores externos)

Configura desde G3 Admin → **Integraciones**, sin redeploy, los proveedores externos de G3: SMS, correo, push,
WhatsApp, PAC, cobro, IA y almacenamiento. Los servicios piden la configuración efectiva al servicio
`integrations` y arman el adaptador real. Si no hay configuración, el canal queda en **modo registro** y no envía nada.

## Arquitectura

```
G3 Admin ──/api/integrations──▶ gateway ──▶ integrations (:8088) ──▶ bitácora de auth (POST /api/audit/events)
                                   ✗ /api/integrations/internal/* → 404
auth · alerts · billing · invoicing
   └─ IntegrationsClient ──GET /api/integrations/internal/resolve (serviceFetch: x-internal-token + ID token)──▶ integrations
        caché 60 s por instancia · si responde none o está caído → variables de entorno del propio servicio
        ▲
        └── Redis pub/sub g3:<G3_ENV>:integrations:invalidate ◀── integrations publica al guardar/borrar
```

| Pieza | Dónde | Qué hace |
|---|---|---|
| Catálogo | `contracts/src/integrations-catalog.ts` | Fuente de verdad: categorías, proveedores, campos, secretos, alcances, ranuras, `envFallback` y `validateIntegrationSettings`. Se copia a Admin con `scripts/sync-contracts.sh`. |
| DTOs | `contracts/src/dtos/integrations.ts` | `IntegrationConfigDto`, `UpsertIntegrationDto`, `IntegrationOverviewItemDto`, `IntegrationTestDto`, `ResolvedIntegrationDto`. |
| Kit `@g3/integrations` | `integrations-kit/` | Adaptadores con `fetch` inyectable (sin SDKs), `testConnection`, `SecretResolver`, `IntegrationsClient`, `envFallbackFor` y factories `build*`. |
| Servicio | `services/integrations/` | Guarda las configuraciones en Postgres (`integration_configs`, ver [data-model/integrations.md](./data-model/integrations.md)), cifra los secretos, aplica permisos, prueba conexiones, audita y avisa de los cambios. |

### Consumidores

| Servicio | Categoría | Resolución |
|---|---|---|
| auth | `sms` | OTP de G3 Drive. La compañía sale del usuario encontrado por teléfono. Usa `ProviderSmsSender`. |
| auth | `email` | Recuperación de contraseña. La compañía sale del usuario encontrado por correo. Usa `ProviderEmailSender`. |
| alerts | `push` | Plataforma → entorno (`ResolvedPushNotifier`). |
| alerts | `whatsapp` | Compañía del incidente → plataforma → entorno (`ResolvedWhatsAppNotifier`). |
| invoicing | `pac` (`primary`/`backup`) | `buildPacProvider(companyId, resolver)`. Con las dos ranuras arma un `HighAvailabilityPacProvider` con failover. Con una, usa ese PAC. Sin ninguna, usa `MockPacProvider`. |
| billing | `payments` | Plataforma → `STRIPE_*` (`IntegrationBillingProvider`). Sin configuración usa `FakeStripeProvider`. |
| auth (SSO) | — | El `client_secret` OIDC se resuelve con `SecretResolver.resolveReference` (`projects/…` o `env:`). |

Un fallo del proveedor no rompe el flujo. En auth solo se registra en el log, porque la respuesta no debe revelar
si el teléfono o el correo existen. En alerts queda como notificación fallida.

## Prioridad de fuentes

Por categoría y ranura, se usa la primera fuente **habilitada**:

1. **company**: la configuración propia de la compañía, si la categoría admite el alcance `company`.
2. **platform**: el default de G3 Tech para todos.
3. **env**: las variables de respaldo del catálogo (`envFallback`). Primero se buscan en el servicio integrations
   y, si responde `none` o no responde, en el servicio que consume.
4. **none**: modo registro, no envía.

Una configuración deshabilitada (`enabled: false`) se salta y la resolución pasa a la siguiente fuente.

| Categoría | Alcances | Ranuras | Respaldo por entorno |
|---|---|---|---|
| sms | platform, company | default | — |
| email | platform, company | default | — |
| push | platform | default | `EXPO_PUSH_ENABLED=1`, `EXPO_ACCESS_TOKEN` |
| whatsapp | platform, company | default | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE`, `WHATSAPP_LANGUAGE` |
| pac | platform, company | primary, backup | — |
| payments | platform | default | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` |
| ai | platform | default | `GCP_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_MODEL` |
| storage | platform | default | `EVIDENCE_BUCKET`, `EVIDENCE_SIGNER_SA` |

## Permisos

Se basan en los headers que pone el gateway tras validar el JWT: `x-company-id`, `x-user-id` y `x-user-role`.

| Quién | Alcance plataforma | Alcance compañía | Overview |
|---|---|---|---|
| owner/admin de `G3_PLATFORM_COMPANY_ID` | leer, editar, probar, borrar | su compañía | completo (`canEditPlatform: true`) |
| owner/admin de otra compañía | — (403) | leer, editar, probar, borrar | plataforma solo resumida (`provider`, `status`, `enabled`) |
| dispatcher | — | — | solo lectura, sin `hint` de secretos |
| driver | — | — | 403 |

Si la categoría no admite el alcance pedido, la respuesta es 400 (por ejemplo, `payments` con `scope=company`).

## Secretos

Al capturar un campo secreto se acepta cualquiera de estas formas:

| Valor | Se guarda | `hint` |
|---|---|---|
| Literal (`sk_live_…`) | Cifrado con **AES-256-GCM** y `INTEGRATIONS_ENCRYPTION_KEY`. El AAD liga el valor a su alcance, compañía, categoría, ranura, proveedor y campo. | Últimos 4 caracteres, solo si el valor tiene 8 o más. |
| `gsm:projects/<p>/secrets/<s>/versions/<v>` | Como referencia. Sin `/versions/…` se usa `latest`. | La referencia. |
| `env:NOMBRE` | Como referencia a una variable del servicio integrations. | La referencia. |

- **Nunca se devuelve el valor**, solo `{ set, storage, hint }`. Solo el endpoint interno devuelve secretos en
  claro.
- En una actualización, un secreto **omitido o `''`** conserva el guardado y **`null`** lo borra. Si es
  obligatorio, borrarlo da 400.
- **Cambiar de proveedor** descarta los secretos del anterior.
- Para Secret Manager, el `SecretResolver` pide el token de la cuenta de servicio al metadata server
  (`http://metadata.google.internal/…/token`, header `Metadata-Flavor: Google`). Después llama
  `GET https://secretmanager.googleapis.com/v1/<name>:access` y decodifica el base64. Guarda los valores en caché
  5 min y renueva el token un minuto antes de que venza. La cuenta del runtime necesita
  `roles/secretmanager.secretAccessor` sobre ese secreto.
- Rotar `INTEGRATIONS_ENCRYPTION_KEY` deja ilegibles los secretos cifrados: hay que volver a capturarlos. Para
  rotar sin recapturar, guárdalos en Secret Manager (`gsm:`) y rota allá.
- Ningún mensaje de error, log ni evento de auditoría incluye valores de secretos. Los adaptadores pasan todo
  texto del proveedor por `redact()`.

## Endpoints

Todos van bajo `/api` (prefijo global del servicio). El gateway reenvía `/api/integrations/**` al servicio.

| Método | Ruta | Quién | Respuesta |
|---|---|---|---|
| GET | `/integrations/catalog` | autenticado | `IntegrationCategoryDef[]` |
| GET | `/integrations` | owner, admin, dispatcher | `IntegrationOverviewItemDto[]`: todas las categorías y ranuras con la fuente efectiva, `envFallbackPresent` y `canEditPlatform` |
| GET | `/integrations/:category/:slot?scope=company\|platform` | ver Permisos | `IntegrationConfigDto` o 404 |
| PUT | `/integrations/:category/:slot?scope=…` | ver Permisos | Recibe `UpsertIntegrationDto` y devuelve `IntegrationConfigDto` (el estado vuelve a `unverified`). Si la validación falla: 400 `{ statusCode, error, message: 'Configuración inválida', errors: { campo: mensaje } }` |
| DELETE | `/integrations/:category/:slot?scope=…` | ver Permisos | 204 |
| POST | `/integrations/:category/:slot/test?scope=…` | ver Permisos | `IntegrationTestDto`. Guarda `lastTest` y el estado. |
| GET | `/integrations/internal/resolve?companyId&category&slot` | servicios, con `x-internal-token` = `INTERNAL_TOKEN` | `ResolvedIntegrationDto` **con secretos en claro**. El token se compara en tiempo constante. 401 sin token, 502 si un secreto no se puede resolver. |

Sin `scope`, se usa `company` si la categoría lo admite y `platform` si no.

El gateway responde **404** a `/api/integrations/internal/*`, con un bloqueo explícito en
`gateway/src/middleware/internal-routes.ts`. La ruta se normaliza antes de compararla, así que `//`, `..`, `%69`,
`\` y mayúsculas no saltan el bloqueo. Además, el gateway nunca reenvía `x-internal-token`.

### Estados

| Estado | Cuándo |
|---|---|
| `unverified` | Se acaba de guardar o cambiar, o pasó una prueba que solo valida formato (`live: false`). |
| `verified` | Pasó una prueba en vivo. |
| `failed` | La última prueba falló. |

## Qué se prueba en vivo

`testConnection` tiene un timeout de 10 s y **nunca envía mensajes**.

| Proveedor | Prueba | `live` |
|---|---|---|
| Twilio | `GET /2010-04-01/Accounts/{sid}.json` con basic auth. Valida el SID `AC…` y el remitente E.164 o `MG…`. Falla si la cuenta no está `active`. | sí |
| Vonage | `GET https://rest.nexmo.com/account/get-balance` (muestra el saldo). | sí |
| SendGrid | `GET /v3/scopes` y exige `mail.send`. | sí |
| Mailgun | `GET /v3/domains/{dominio}` (US o EU). Falla si el dominio no está `active`. | sí |
| Meta WhatsApp | `GET https://graph.facebook.com/v20.0/{phoneNumberId}?fields=display_phone_number,verified_name` | sí |
| Stripe | Valida los prefijos `sk_`/`rk_`, `pk_` y `whsec_` y que test/live coincidan, y luego `GET /v1/balance`. | sí |
| Expo | Solo formato. Expo no tiene forma de verificar credenciales sin mandar un push. | no |
| Diverza / Facturama | Solo formato y RFC: se verifica al primer timbrado. | no |
| Vertex AI / GCS | Solo formato: se verifica al primer uso. | no |

Errores HTTP: 401/403 → "rechazó las credenciales"; 404 → "no encontró el recurso"; 429 → "limitó las
peticiones"; 5xx → "no está disponible". Un timeout o error de red muestra un mensaje genérico, nunca el cuerpo
crudo del proveedor.

## Cómo configurar cada proveedor

Pasos comunes:

1. Entra a Admin → Integraciones como owner/admin. Para el alcance plataforma, entra con la compañía
   `G3_PLATFORM_COMPANY_ID`.
2. Elige categoría, alcance y proveedor, y llena los campos.
3. Para un secreto, pega el valor (se cifra) o, mejor en producción, una referencia `gsm:…`.
4. Guarda y pulsa **Probar conexión**.

### SMS · Twilio

1. En Twilio Console, copia el **Account SID** (`AC…`) y el **Auth Token**.
2. Compra un número con capacidad SMS hacia México, o crea un **Messaging Service** (`MG…`).
3. En Messaging → Settings → Geo permissions, habilita México.
4. En G3, captura `accountSid`, `authToken` y `from`. Un `from` que empieza con `MG` se manda como
   `MessagingServiceSid`.

### SMS · Vonage

1. En el Dashboard, copia el **API key** y el **API secret**.
2. Registra un remitente válido para México (los alfanuméricos tienen restricciones).
3. En G3, captura `apiKey`, `apiSecret` y `from`.

### Correo · SendGrid

1. Autentica el dominio (SPF/DKIM) en Settings → Sender Authentication y verifica el remitente.
2. Crea una API key con permiso **Mail Send** (Restricted Access → Mail Send: Full).
3. En G3, captura `apiKey` (`SG.…`), `fromEmail` y `fromName`.

### Correo · Mailgun

1. Agrega y verifica el dominio (SPF, DKIM y MX). Debe quedar en estado `active`.
2. Copia la **Private API key** y elige la región (US o EU) donde creaste el dominio.
3. En G3, captura `apiKey`, `domain`, `region`, `fromEmail` y `fromName`.

### Push · Expo (plataforma)

1. Carga en EAS las credenciales FCM (Android) y APNs (iOS), y compila G3 Drive con EAS (`projectId` en
   `app.json`).
2. Si activaste "Enhanced push security", genera un **access token** y captúralo. Es opcional.
3. Como la prueba solo valida formato, confirma enviando un push real desde la torre de control.

### WhatsApp · Meta Cloud API

1. Da de alta el número en WhatsApp Business Platform y copia su **Phone number ID** y el **WABA ID**.
2. Crea la plantilla **`g3_incidente`** (categoría utilidad, idioma `es_MX`) con 4 variables: folio, título,
   urgencia y motivo. Espera la aprobación de Meta.
3. Crea un **System User** con permiso `whatsapp_business_messaging` y genera un token permanente.
4. En G3, captura `phoneNumberId`, `businessAccountId` (opcional), `accessToken`, `template` y `language`.

### PAC · Diverza (primario) / Facturama (respaldo)

1. Firma el contrato y compra timbres.
2. Carga en el PAC el CSD vigente del RFC emisor.
3. En G3, configura la ranura **primary** (Diverza) y la **backup** (Facturama), con `environment=sandbox`, `rfc`,
   `user` y `password`.
4. Timbra en sandbox antes de pasar a `production`.

> El cliente HTTP de timbrado está **pendiente** de los contratos y las credenciales sandbox.
> `DiverzaPacProvider`/`FacturamaPacProvider` ya validan la configuración, pero `stamp()` lanza
> "adaptador HTTP pendiente de credenciales sandbox". El failover multi-PAC
> (`HighAvailabilityPacProvider`) ya funciona: un error del PAC (excepción o `isOurError`) pasa al respaldo,
> pero un rechazo del SAT no se reintenta.

### Cobro · Stripe (plataforma)

1. Crea los productos y precios en MXN para cada plan.
2. Crea el webhook apuntando a `https://<gateway>/api/webhooks/stripe` y copia el **signing secret**
   (`whsec_…`).
3. En G3, captura `publishableKey` (`pk_…`), `secretKey` (`sk_…`, o restringida `rk_…`) y `webhookSecret`.

> billing ya lee las credenciales (integrations → `STRIPE_*`). Mientras no exista el adaptador real de Checkout,
> billing responde **501** cuando hay llaves cargadas, en lugar de simular cobros. Sin llaves usa
> `FakeStripeProvider`.

### IA · Vertex AI (plataforma)

1. Habilita la API de Vertex AI y da el rol **Vertex AI User** a la cuenta de servicio del servicio `ai`.
2. En G3, captura `projectId`, `location` y `model`.

### Almacenamiento · GCS (plataforma)

1. Crea el bucket con acceso uniforme y sin acceso público.
2. Da `roles/iam.serviceAccountTokenCreator` a la cuenta firmante.
3. En G3, captura `bucket` y `signerServiceAccount`.

## Caché e invalidación

`IntegrationsClient` guarda 60 s, por instancia, la configuración resuelta de cada (compañía, categoría, ranura).
Para que un cambio en Admin se note de inmediato en todas las réplicas de los consumidores:

1. Al guardar o borrar, integrations publica `{ scope, companyId, category, slot }` en el canal Redis
   `g3:<G3_ENV>:integrations:invalidate` (`redisChangePublisher`).
2. Cada consumidor abre una conexión dedicada en modo suscriptor (`subscribeToIntegrationChanges`) e invalida
   solo lo afectado. Un cambio de compañía borra esa compañía; uno de plataforma, esa categoría/ranura en todas.
3. Pub/sub no garantiza la entrega. Al reconectar, el suscriptor descarta toda la caché, y el TTL de 60 s sigue
   como respaldo. Si Redis no está disponible, publicar no falla la operación: solo se registra en el log.

**Por qué pub/sub y no un TTL corto:** un TTL de pocos segundos multiplica las llamadas internas a integrations, y
cada una pasa por un ID token y por descifrar secretos. Ni así sería inmediato. Con pub/sub, el cambio se aplica
en milisegundos y la caché sigue absorbiendo el tráfico normal.

Hoy se suscribe **alerts**. auth y billing construyen su `IntegrationsClient` en su propio `main.ts` y todavía no
se suscriben (siguen con el TTL de 60 s). Basta con agregar el `subscribeToIntegrationChanges` igual que en
`services/alerts/src/main.ts`.

## Auditoría

Cada alta o cambio (`integration.updated`), borrado (`integration.deleted`) y prueba (`integration.tested`) se
registra en la bitácora encadenada de auth mediante su ingesta interna (`POST {AUTH_URL}/api/audit/events` con
`x-internal-token`). La entrada lleva:

- `companyId` de quien actuó. En el alcance plataforma, es la compañía plataforma.
- El actor, la IP (`x-client-ip`) y el user-agent.
- `resource { type: 'integration', id }`.
- `metadata`: `scope`, `category`, `slot`, `provider`, `created`, `previousProvider`, y los **nombres** de los
  campos en `secretsChanged`, `secretsRemoved` y `settingsChanged`. En una prueba, `ok`, `live` y `latencyMs`.

**Nunca** se registran valores. Si auth no responde, se avisa en el log y la operación continúa. Sin `AUTH_URL`
(desarrollo), la auditoría solo va al log.

## Variables de entorno

La lista completa está en [`backend/.env.example`](../.env.example). Las del módulo son:

| Variable | Servicio | Uso |
|---|---|---|
| `INTEGRATIONS_ENCRYPTION_KEY` | integrations | Llave AES-256 de 32 bytes en base64 (`openssl rand -base64 32`). **Obligatoria en producción.** En dev se deriva una de prueba. |
| `G3_PLATFORM_COMPANY_ID` | integrations | Compañía cuyos owner/admin editan el alcance plataforma. Vacía = nadie. |
| `INTERNAL_TOKEN` | integrations, auth, alerts, billing, fleet, trips | Token servicio→servicio de 32 caracteres o más. Obligatorio en producción para integrations. |
| `AUDIT_INGEST_TOKEN` | auth (valida); trips, integrations | Ingesta de auditoría. Si falta, se usa `INTERNAL_TOKEN`. |
| `INTEGRATIONS_URL` | gateway, auth, alerts, billing, invoicing | URL del servicio. Sin ella (o sin `INTERNAL_TOKEN`), los consumidores usan solo el entorno. |
| `AUTH_URL` | integrations | Auditoría (obligatoria en producción). |
| `DATABASE_URL` o `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASS`/`DB_NAME` | integrations | Postgres (schema `integrations`). Obligatoria en producción. Sin ella, memoria (solo dev). |
| `DB_MIGRATE_ON_BOOT` | integrations | `1` aplica las migraciones al arrancar (dev). En producción: Cloud Run Job `node dist/migrate.js`. |
| `REDIS_URL`, `G3_ENV` | integrations (publica), alerts (se suscribe) | Invalidación de cachés. `REDIS_URL` es obligatoria en producción. `G3_ENV` (`dev`/`staging`/`prod`) separa los canales. |
| `SERVICE_AUTH` | integrations, consumidores | `gcp`: las llamadas internas (`serviceFetchFromEnv`) agregan el ID token de Cloud Run. |
| `EXPO_*`, `WHATSAPP_*`, `STRIPE_*`, `GCP_PROJECT_ID`, `VERTEX_*`, `EVIDENCE_*` | consumidores e integrations | Respaldo por entorno (ver la tabla de prioridad). |

### Despliegue

- `docker compose` levanta `integrations` en `:8088` con valores de desarrollo.
- Cloud Build y `deploy.sh` despliegan `g3-integrations` con estos secretos de Secret Manager:
  `INTERNAL_TOKEN=g3-internal-token`, `INTEGRATIONS_ENCRYPTION_KEY=g3-integrations-encryption-key`.
- Después del primer despliegue, configura:

  ```bash
  gcloud run services update g3-integrations --update-env-vars G3_PLATFORM_COMPANY_ID=<id>,AUTH_URL=<url de g3-auth>
  ```

- Agrega `INTEGRATIONS_URL` a auth, alerts y billing.
- Los servicios internos de Cloud Run son `--no-allow-unauthenticated`. Con `SERVICE_AUTH=gcp`, las llamadas
  servicio→servicio (`serviceFetchFromEnv()` de `@g3/platform`) mandan `x-internal-token` y un ID token con
  audiencia = URL del destino. La cuenta de servicio del llamador necesita `roles/run.invoker` sobre el destino.
  Ya lo usan alerts→integrations, integrations→auth (auditoría) e invoicing→integrations. auth y billing siguen
  con el `fetch` global en su `main.ts`.
- Migraciones: antes de cada deploy corre el job `node dist/migrate.js` (la imagen debe incluir `migrations/`).

## Pendientes conocidos

- Faltan los adaptadores HTTP reales de los PAC y de Stripe Checkout.
- auth y billing todavía no se suscriben a la invalidación: un cambio puede tardar hasta 60 s en aplicarse ahí.
