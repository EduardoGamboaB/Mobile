/**
 * Catálogo de PROVEEDORES EXTERNOS configurables en G3 — fuente de verdad.
 *
 * Sin dependencias a propósito: se copia tal cual a
 * `admin/lib/contracts/integrationsCatalog.ts` con
 * `backend/scripts/sync-contracts.sh` (un test de contracts falla si se
 * desfasa). Para agregar un proveedor: agrégalo aquí, implementa su
 * adaptador en `@g3/integrations` y sincroniza.
 *
 * Alcance:
 * - `platform`: lo contrata G3 Tech para todos (Stripe, Vertex, Storage).
 *   Solo lo edita un owner/admin de la compañía plataforma.
 * - `company`: cada transportista puede traer el suyo (p.ej. su propio
 *   número de WhatsApp o su PAC). Si no configura nada, se usa el default
 *   de la plataforma, y si tampoco hay, el valor de las variables de
 *   entorno; sin nada, el canal queda en modo registro (no envía).
 */

export const INTEGRATION_CATEGORIES = [
  'sms',
  'email',
  'push',
  'whatsapp',
  'pac',
  'payments',
  'ai',
  'storage',
] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type IntegrationScope = 'platform' | 'company';

export type IntegrationFieldType = 'text' | 'secret' | 'select' | 'url' | 'email' | 'phone' | 'boolean';

export interface IntegrationField {
  key: string;
  label: string;
  type: IntegrationFieldType;
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Para `select`. */
  options?: { value: string; label: string }[];
  /** Valor sugerido al crear la configuración. */
  defaultValue?: string | boolean;
}

export interface IntegrationProviderDef {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  fields: IntegrationField[];
  /** Pasos fuera de G3 que el admin debe completar (aprobaciones, DNS…). */
  setupChecklist: string[];
  /** `true` si "Probar conexión" hace una llamada real al proveedor. */
  liveTest: boolean;
}

export interface IntegrationCategoryDef {
  category: IntegrationCategory;
  label: string;
  description: string;
  /** Alcances en los que se puede configurar (el primero es el principal). */
  scopes: IntegrationScope[];
  /** Qué parte de G3 lo usa. */
  usedBy: string[];
  /** Variables de entorno de respaldo (deploy) cuando no hay configuración. */
  envFallback: string[];
  /**
   * Ranuras: una configuración por ranura. Casi todo usa una sola
   * (`default`); el PAC usa `primary` + `backup` para el failover.
   */
  slots: { id: string; label: string }[];
  providers: IntegrationProviderDef[];
}

const ENVIRONMENT: IntegrationField = {
  key: 'environment',
  label: 'Ambiente',
  type: 'select',
  required: true,
  options: [
    { value: 'sandbox', label: 'Pruebas (sandbox)' },
    { value: 'production', label: 'Producción' },
  ],
  defaultValue: 'sandbox',
};

const PAC_CHECKLIST = [
  'Contrato firmado con el PAC y timbres comprados.',
  'CSD (certificado de sello digital) vigente cargado en el PAC para el RFC emisor.',
  'Probar timbrado en sandbox antes de cambiar a producción.',
];

const SINGLE = [{ id: 'default', label: 'Principal' }];

export const INTEGRATIONS_CATALOG: readonly IntegrationCategoryDef[] = [
  {
    category: 'sms',
    label: 'SMS',
    description: 'Códigos de acceso (OTP) de G3 Drive.',
    scopes: ['platform', 'company'],
    usedBy: ['auth · login de choferes por SMS'],
    envFallback: [],
    slots: SINGLE,
    providers: [
      {
        id: 'twilio',
        name: 'Twilio',
        description: 'SMS programables con números o Messaging Service.',
        docsUrl: 'https://www.twilio.com/docs/messaging/api/message-resource',
        fields: [
          { key: 'accountSid', label: 'Account SID', type: 'text', required: true, placeholder: 'AC…' },
          { key: 'authToken', label: 'Auth Token', type: 'secret', required: true },
          { key: 'from', label: 'Remitente (número E.164 o Messaging Service SID)', type: 'text', required: true, placeholder: '+52… o MG…' },
        ],
        setupChecklist: ['Número con capacidad SMS hacia México o Messaging Service creado.', 'Geo-permissions de SMS habilitadas para México.'],
        liveTest: true,
      },
      {
        id: 'vonage',
        name: 'Vonage (Nexmo)',
        description: 'API de SMS de Vonage.',
        docsUrl: 'https://developer.vonage.com/en/messaging/sms/overview',
        fields: [
          { key: 'apiKey', label: 'API key', type: 'text', required: true },
          { key: 'apiSecret', label: 'API secret', type: 'secret', required: true },
          { key: 'from', label: 'Remitente', type: 'text', required: true, placeholder: 'G3' },
        ],
        setupChecklist: ['Remitente registrado para México.'],
        liveTest: true,
      },
    ],
  },
  {
    category: 'email',
    label: 'Correo transaccional',
    description: 'Recuperación de contraseña y avisos por correo.',
    scopes: ['platform', 'company'],
    usedBy: ['auth · recuperación de contraseña'],
    envFallback: [],
    slots: SINGLE,
    providers: [
      {
        id: 'sendgrid',
        name: 'SendGrid',
        description: 'Envío por la API v3 de SendGrid.',
        docsUrl: 'https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send',
        fields: [
          { key: 'apiKey', label: 'API key', type: 'secret', required: true, placeholder: 'SG.…' },
          { key: 'fromEmail', label: 'Remitente', type: 'email', required: true, placeholder: 'no-reply@g3logistics.mx' },
          { key: 'fromName', label: 'Nombre del remitente', type: 'text', required: false, defaultValue: 'G3' },
        ],
        setupChecklist: ['Dominio autenticado (SPF/DKIM) en SendGrid.', 'Remitente verificado.'],
        liveTest: true,
      },
      {
        id: 'mailgun',
        name: 'Mailgun',
        description: 'Envío por la API de Mailgun.',
        docsUrl: 'https://documentation.mailgun.com/docs/mailgun/api-reference/',
        fields: [
          { key: 'apiKey', label: 'API key', type: 'secret', required: true },
          { key: 'domain', label: 'Dominio', type: 'text', required: true, placeholder: 'mg.g3logistics.mx' },
          {
            key: 'region', label: 'Región', type: 'select', required: true, defaultValue: 'us',
            options: [{ value: 'us', label: 'EE. UU.' }, { value: 'eu', label: 'Europa' }],
          },
          { key: 'fromEmail', label: 'Remitente', type: 'email', required: true },
          { key: 'fromName', label: 'Nombre del remitente', type: 'text', required: false, defaultValue: 'G3' },
        ],
        setupChecklist: ['Dominio verificado (SPF/DKIM/MX) en Mailgun.'],
        liveTest: true,
      },
    ],
  },
  {
    category: 'push',
    label: 'Notificaciones push',
    description: 'Avisos a G3 Drive y a la torre de control.',
    scopes: ['platform'],
    usedBy: ['alerts · centro de incidentes (SOS, SLA, reglas)'],
    envFallback: ['EXPO_PUSH_ENABLED', 'EXPO_ACCESS_TOKEN'],
    slots: SINGLE,
    providers: [
      {
        id: 'expo',
        name: 'Expo Push',
        description: 'Servicio de push de Expo (G3 Drive está hecho con Expo).',
        docsUrl: 'https://docs.expo.dev/push-notifications/sending-notifications/',
        fields: [
          { key: 'accessToken', label: 'Access token (opcional, si activaste "enhanced security")', type: 'secret', required: false },
        ],
        setupChecklist: ['Credenciales FCM (Android) y APNs (iOS) cargadas en EAS.', 'G3 Drive compilado con EAS (projectId en app.json).'],
        liveTest: true,
      },
    ],
  },
  {
    category: 'whatsapp',
    label: 'WhatsApp',
    description: 'Escalamiento de incidentes por WhatsApp.',
    scopes: ['platform', 'company'],
    usedBy: ['alerts · centro de incidentes'],
    envFallback: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_TEMPLATE'],
    slots: SINGLE,
    providers: [
      {
        id: 'meta_cloud',
        name: 'WhatsApp Cloud API (Meta)',
        description: 'Mensajes de plantilla desde tu número de WhatsApp Business.',
        docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
        fields: [
          { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
          { key: 'businessAccountId', label: 'WhatsApp Business Account ID', type: 'text', required: false },
          { key: 'accessToken', label: 'Token de acceso (System User permanente)', type: 'secret', required: true },
          { key: 'template', label: 'Plantilla aprobada', type: 'text', required: true, defaultValue: 'g3_incidente' },
          { key: 'language', label: 'Idioma de la plantilla', type: 'text', required: true, defaultValue: 'es_MX' },
        ],
        setupChecklist: [
          'Número dado de alta en WhatsApp Business Platform.',
          'Plantilla "g3_incidente" (categoría utilidad, 4 variables: folio, título, urgencia, motivo) aprobada por Meta.',
          'Token de System User con permiso whatsapp_business_messaging.',
        ],
        liveTest: true,
      },
    ],
  },
  {
    category: 'pac',
    label: 'PAC · timbrado CFDI 4.0 / Carta Porte 3.0',
    description: 'Proveedor autorizado de certificación del SAT (primario y respaldo).',
    scopes: ['platform', 'company'],
    usedBy: ['invoicing · timbrado multi-PAC con failover'],
    envFallback: [],
    slots: [
      { id: 'primary', label: 'PAC primario' },
      { id: 'backup', label: 'PAC de respaldo' },
    ],
    providers: [
      {
        id: 'diverza',
        name: 'Diverza',
        description: 'PAC primario recomendado (ver backend/docs/carta-porte-3.0/pac-comparison.md).',
        docsUrl: 'https://www.diverza.com/',
        fields: [
          ENVIRONMENT,
          { key: 'rfc', label: 'RFC emisor', type: 'text', required: true },
          { key: 'user', label: 'Usuario', type: 'text', required: true },
          { key: 'password', label: 'Contraseña / token', type: 'secret', required: true },
        ],
        setupChecklist: PAC_CHECKLIST,
        liveTest: false,
      },
      {
        id: 'facturama',
        name: 'Facturama',
        description: 'PAC de respaldo recomendado.',
        docsUrl: 'https://apisandbox.facturama.mx/guias',
        fields: [
          ENVIRONMENT,
          { key: 'rfc', label: 'RFC emisor', type: 'text', required: true },
          { key: 'user', label: 'Usuario', type: 'text', required: true },
          { key: 'password', label: 'Contraseña', type: 'secret', required: true },
        ],
        setupChecklist: PAC_CHECKLIST,
        liveTest: false,
      },
    ],
  },
  {
    category: 'payments',
    label: 'Cobro de suscripciones',
    description: 'Checkout y renovación de los planes de G3.',
    scopes: ['platform'],
    usedBy: ['billing · checkout y webhook de Stripe'],
    envFallback: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    slots: SINGLE,
    providers: [
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'Suscripciones con Stripe Billing.',
        docsUrl: 'https://docs.stripe.com/billing/subscriptions/overview',
        fields: [
          { key: 'publishableKey', label: 'Publishable key', type: 'text', required: true, placeholder: 'pk_…' },
          { key: 'secretKey', label: 'Secret key', type: 'secret', required: true, placeholder: 'sk_…' },
          { key: 'webhookSecret', label: 'Webhook signing secret', type: 'secret', required: true, placeholder: 'whsec_…' },
        ],
        setupChecklist: ['Productos y precios (MXN) creados para cada plan.', 'Webhook apuntando a /api/webhooks/stripe.'],
        liveTest: true,
      },
    ],
  },
  {
    category: 'ai',
    label: 'IA (OCR y agentes)',
    description: 'Lectura de tickets/evidencias y agentes de G3.',
    scopes: ['platform'],
    usedBy: ['ai · extracción de evidencias, clasificación y asistente'],
    envFallback: ['GCP_PROJECT_ID'],
    slots: SINGLE,
    providers: [
      {
        id: 'vertex',
        name: 'Google Vertex AI',
        description: 'Modelos en Vertex AI con la cuenta de servicio del servicio ai.',
        docsUrl: 'https://cloud.google.com/vertex-ai/docs',
        fields: [
          { key: 'projectId', label: 'Proyecto GCP', type: 'text', required: true },
          { key: 'location', label: 'Región', type: 'text', required: true, defaultValue: 'us-central1' },
          { key: 'model', label: 'Modelo', type: 'text', required: true, placeholder: 'gemini-…' },
        ],
        setupChecklist: ['API de Vertex AI habilitada.', 'La cuenta de servicio del servicio ai tiene rol Vertex AI User.'],
        liveTest: false,
      },
    ],
  },
  {
    category: 'storage',
    label: 'Almacenamiento de evidencias',
    description: 'Bucket privado para fotos y documentos de G3 Drive.',
    scopes: ['platform'],
    usedBy: ['trips · URLs firmadas de evidencias'],
    envFallback: ['EVIDENCE_BUCKET'],
    slots: SINGLE,
    providers: [
      {
        id: 'gcs',
        name: 'Google Cloud Storage',
        description: 'Bucket privado con URLs firmadas V4.',
        docsUrl: 'https://cloud.google.com/storage/docs/access-control/signed-urls',
        fields: [
          { key: 'bucket', label: 'Bucket', type: 'text', required: true, placeholder: 'g3-evidences-prod' },
          { key: 'signerServiceAccount', label: 'Cuenta de servicio firmante', type: 'email', required: true },
        ],
        setupChecklist: ['Bucket con acceso uniforme y sin acceso público.', 'La cuenta firmante tiene roles/iam.serviceAccountTokenCreator.'],
        liveTest: false,
      },
    ],
  },
];

export function getCategoryDef(category: IntegrationCategory): IntegrationCategoryDef {
  const def = INTEGRATIONS_CATALOG.find((c) => c.category === category);
  if (!def) throw new Error(`Categoría de integración desconocida: ${category}`);
  return def;
}

export function getProviderDef(category: IntegrationCategory, providerId: string): IntegrationProviderDef | null {
  return getCategoryDef(category).providers.find((p) => p.id === providerId) ?? null;
}

/**
 * Valida una configuración contra el catálogo. Devuelve los errores por
 * campo (vacío = válida). Los secretos ya guardados pueden omitirse en una
 * actualización (`keepSecrets`).
 */
export function validateIntegrationSettings(
  category: IntegrationCategory,
  providerId: string,
  values: Record<string, unknown>,
  opts: { keepSecrets?: string[] } = {},
): Record<string, string> {
  const provider = getProviderDef(category, providerId);
  if (!provider) return { provider: `Proveedor no soportado para ${category}: ${providerId}` };
  const errors: Record<string, string> = {};
  for (const f of provider.fields) {
    const v = values[f.key];
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (empty) {
      if (f.required && !(f.type === 'secret' && opts.keepSecrets?.includes(f.key))) errors[f.key] = 'Obligatorio';
      continue;
    }
    if (f.type === 'boolean' && typeof v !== 'boolean') errors[f.key] = 'Debe ser sí/no';
    if (f.type !== 'boolean' && typeof v !== 'string') errors[f.key] = 'Debe ser texto';
    if (typeof v === 'string') {
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.key] = 'Correo inválido';
      if (f.type === 'url' && !/^https:\/\/\S+$/.test(v)) errors[f.key] = 'Debe ser una URL https://';
      if (f.type === 'phone' && !/^\+\d{10,15}$/.test(v)) errors[f.key] = 'Formato E.164, p.ej. +5215512345678';
      if (f.type === 'select' && f.options && !f.options.some((o) => o.value === v)) errors[f.key] = 'Opción inválida';
      if (v.length > 4000) errors[f.key] = 'Demasiado largo';
    }
  }
  for (const k of Object.keys(values)) {
    if (!provider.fields.some((f) => f.key === k)) errors[k] = 'Campo desconocido';
  }
  return errors;
}
