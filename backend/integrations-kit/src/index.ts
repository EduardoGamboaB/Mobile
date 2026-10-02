/**
 * @g3/integrations — kit de proveedores externos de G3.
 *
 * - Adaptadores reales con `fetch` inyectable: SMS (Twilio, Vonage), correo
 *   (SendGrid, Mailgun), push (Expo) y WhatsApp (Meta Cloud API).
 * - `testConnection`: prueba en vivo sin enviar mensajes.
 * - `SecretResolver`: `env:`, `gsm:` (Secret Manager) y literales.
 * - `IntegrationsClient`: resuelve la configuración efectiva vía el
 *   servicio integrations, con caché y respaldo por variables de entorno.
 * - Factories `build*` que devuelven el adaptador real o uno de registro.
 */
export * from './http';
export * from './sms';
export * from './email';
export * from './push';
export * from './whatsapp';
export * from './test-connection';
export * from './secret-resolver';
export * from './env-fallback';
export * from './client';
export * from './factories';
