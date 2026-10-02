import * as fs from 'fs';
import * as path from 'path';
import {
  INTEGRATIONS_CATALOG,
  INTEGRATION_CATEGORIES,
  getProviderDef,
  validateIntegrationSettings,
} from '../src';

describe('Catálogo de proveedores externos', () => {
  test('cubre todas las categorías, sin ids duplicados, con al menos una ranura', () => {
    expect(INTEGRATIONS_CATALOG.map((c) => c.category).sort()).toEqual([...INTEGRATION_CATEGORIES].sort());
    for (const c of INTEGRATIONS_CATALOG) {
      expect(c.slots.length).toBeGreaterThan(0);
      expect(new Set(c.providers.map((p) => p.id)).size).toBe(c.providers.length);
      for (const p of c.providers) {
        expect(new Set(p.fields.map((f) => f.key)).size).toBe(p.fields.length);
        expect(p.docsUrl).toMatch(/^https:\/\//);
      }
    }
  });

  test('el PAC tiene ranuras primario y respaldo', () => {
    expect(INTEGRATIONS_CATALOG.find((c) => c.category === 'pac')!.slots.map((s) => s.id)).toEqual(['primary', 'backup']);
  });

  test('valida obligatorios, formatos, opciones y campos desconocidos', () => {
    expect(validateIntegrationSettings('sms', 'twilio', { accountSid: 'AC1', authToken: 't', from: '+5215500000000' })).toEqual({});
    expect(validateIntegrationSettings('sms', 'twilio', { accountSid: 'AC1', from: '+52155' })).toEqual({ authToken: 'Obligatorio' });
    // Un secreto ya guardado puede omitirse al actualizar.
    expect(validateIntegrationSettings('sms', 'twilio', { accountSid: 'AC1', from: 'MG1' }, { keepSecrets: ['authToken'] })).toEqual({});
    expect(validateIntegrationSettings('email', 'sendgrid', { apiKey: 'SG.x', fromEmail: 'nope' }).fromEmail).toMatch(/inválido/);
    expect(validateIntegrationSettings('pac', 'diverza', {
      environment: 'mañana', rfc: 'AAA010101AAA', user: 'u', password: 'p',
    }).environment).toMatch(/inválida/);
    expect(validateIntegrationSettings('push', 'expo', { hack: 'x' })).toEqual({ hack: 'Campo desconocido' });
    expect(validateIntegrationSettings('sms', 'pigeon', {})).toHaveProperty('provider');
    expect(getProviderDef('whatsapp', 'meta_cloud')!.setupChecklist.join(' ')).toMatch(/g3_incidente/);
  });

  test('la copia de G3 Admin es idéntica (corre backend/scripts/sync-contracts.sh)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/integrations-catalog.ts'), 'utf8');
    const copy = fs.readFileSync(path.join(__dirname, '../../../admin/lib/contracts/integrationsCatalog.ts'), 'utf8');
    expect(copy).toBe(src);
  });
});
