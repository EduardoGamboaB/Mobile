import { getCategoryDef } from '../../lib/contracts/integrationsCatalog';
import {
  buildUpsertPayload,
  fieldErrorsFromError,
  initialFormState,
  isSecretReference,
  secretHint,
  storedSecrets,
  validateForm,
} from '../../lib/integrations/form';
import type { IntegrationConfigDto } from '../../lib/integrations/types';
import { G3ApiError } from '../../lib/api/types';

const sms = getCategoryDef('sms');
const email = getCategoryDef('email');
const pac = getCategoryDef('pac');

const stored: IntegrationConfigDto = {
  id: 'int_1',
  scope: 'company',
  companyId: 'c',
  category: 'sms',
  slot: 'default',
  provider: 'twilio',
  enabled: false,
  settings: { accountSid: 'AC1', from: 'MG1' },
  secrets: { authToken: { set: true, storage: 'encrypted', hint: '4321' } },
  status: 'unverified',
  lastTest: null,
  updatedAt: '2026-10-01T00:00:00Z',
  updatedBy: null,
};

describe('formulario de integraciones', () => {
  test('estado inicial: defaults del catálogo (select con defaultValue) o lo guardado', () => {
    const p = initialFormState(pac, null);
    expect(p.provider).toBe('diverza');
    expect(p.values).toEqual({ environment: 'sandbox', rfc: '', user: '', password: '' });
    expect(p.enabled).toBe(true);

    const s = initialFormState(sms, stored);
    expect(s).toEqual({
      provider: 'twilio',
      enabled: false,
      values: { accountSid: 'AC1', authToken: '', from: 'MG1' },
      clearSecrets: [],
    });
    // Cambiar de proveedor arranca con los defaults del nuevo.
    expect(initialFormState(sms, stored, 'vonage').values).toEqual({ apiKey: '', apiSecret: '', from: '' });
  });

  test('obligatorios y formatos con validateIntegrationSettings', () => {
    const st = initialFormState(email, null);
    expect(validateForm(email, st, null)).toEqual({ apiKey: 'Obligatorio', fromEmail: 'Obligatorio' });
    const bad = { ...st, values: { ...st.values, apiKey: 'SG.x', fromEmail: 'no-es-correo' } };
    expect(validateForm(email, bad, null)).toEqual({ fromEmail: 'Correo inválido' });
  });

  test('un secreto guardado se puede dejar vacío; si se marca para borrar vuelve a ser obligatorio', () => {
    const st = initialFormState(sms, stored);
    expect(storedSecrets(stored, 'twilio')).toEqual(['authToken']);
    expect(validateForm(sms, st, stored)).toEqual({});
    expect(validateForm(sms, { ...st, clearSecrets: ['authToken'] }, stored)).toEqual({ authToken: 'Obligatorio' });
    // Otro proveedor: los secretos guardados no cuentan.
    expect(storedSecrets(stored, 'vonage')).toEqual([]);
  });

  test('payload: limpia opcionales guardados con null y recorta espacios', () => {
    const wa = getCategoryDef('whatsapp');
    const cfg: IntegrationConfigDto = {
      ...stored,
      category: 'whatsapp',
      provider: 'meta_cloud',
      enabled: true,
      settings: { phoneNumberId: '1', businessAccountId: '99', template: 'g3_incidente', language: 'es_MX' },
      secrets: { accessToken: { set: true, storage: 'env', hint: 'env:WA_TOKEN' } },
    };
    const st = initialFormState(wa, cfg);
    st.values.businessAccountId = '';
    st.values.phoneNumberId = '  123  ';
    expect(buildUpsertPayload(wa, st, cfg)).toEqual({
      provider: 'meta_cloud',
      enabled: true,
      values: { phoneNumberId: '123', businessAccountId: null, template: 'g3_incidente', language: 'es_MX' },
    });
  });

  test('errores del servidor por campo y error general', () => {
    const e400 = new G3ApiError(400, {
      statusCode: 400, error: 'Bad Request', message: 'inválido', errors: { from: 'Obligatorio' },
    } as unknown as G3ApiError['body']);
    expect(fieldErrorsFromError(e400)).toEqual({ from: 'Obligatorio' });
    const nest = new G3ApiError(400, { statusCode: 400, error: 'Bad Request', message: ['a', 'b'] } as unknown as G3ApiError['body']);
    expect(fieldErrorsFromError(nest)).toEqual({ _form: 'a · b' });
    expect(fieldErrorsFromError(new Error('red'))).toEqual({ _form: 'red' });
  });

  test('referencias a secretos y textos de ayuda', () => {
    expect(isSecretReference('gsm:projects/g3/secrets/x/versions/latest')).toBe(true);
    expect(isSecretReference('env:TWILIO_AUTH_TOKEN')).toBe(true);
    expect(isSecretReference('env:minúsculas')).toBe(false);
    expect(isSecretReference('literal')).toBe(false);
    expect(secretHint({ set: true, storage: 'encrypted', hint: '1234' })).toBe('••••1234 guardado · deja vacío para conservar');
    expect(secretHint({ set: false, storage: null, hint: null })).toBeNull();
  });
});
