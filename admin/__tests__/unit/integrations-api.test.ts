import { integrationsHttp } from '../../lib/integrations/api';
import { buildUpsertPayload, initialFormState } from '../../lib/integrations/form';
import { getCategoryDef } from '../../lib/contracts/integrationsCatalog';
import type { IntegrationConfigDto, IntegrationOverviewItemDto } from '../../lib/integrations/types';
import { tokenStore } from '../../lib/api/client';
import { G3ApiError } from '../../lib/api/types';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const API = 'https://api.g3.test/api';

function config(over: Partial<IntegrationConfigDto> = {}): IntegrationConfigDto {
  return {
    id: 'int_1',
    scope: 'company',
    companyId: 'cmp_test_1',
    category: 'sms',
    slot: 'default',
    provider: 'twilio',
    enabled: true,
    settings: { accountSid: 'AC123', from: '+525500000000' },
    secrets: { authToken: { set: true, storage: 'encrypted', hint: '1234' } },
    status: 'verified',
    lastTest: null,
    updatedAt: '2026-10-01T00:00:00Z',
    updatedBy: 'usr_test_1',
    ...over,
  };
}

describe('integrationsHttp — rutas y query scope', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('catálogo y overview', async () => {
    const overview: IntegrationOverviewItemDto[] = [
      {
        category: 'sms',
        slot: 'default',
        effective: { source: 'platform', provider: 'twilio', status: 'verified', enabled: true },
        company: null,
        platform: { provider: 'twilio', status: 'verified', enabled: true },
        envFallbackPresent: false,
        canEditPlatform: false,
      },
    ];
    const m = makeFetchMock()
      .on('GET /api/integrations/catalog', { body: [] })
      .on('GET /api/integrations', { body: overview });
    teardown = installGlobalFetchMock(m);

    await integrationsHttp.catalog();
    const r = await integrationsHttp.overview();
    expect(m.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET ${API}/integrations/catalog`,
      `GET ${API}/integrations`,
    ]);
    expect(m.calls[1].headers.authorization).toBe('Bearer tok');
    expect(r[0].effective.source).toBe('platform');
  });

  test('GET / PUT / DELETE / test por categoría, ranura y alcance', async () => {
    const m = makeFetchMock()
      .on('GET /api/integrations/pac/backup?scope=company', { body: null })
      .on('PUT /api/integrations/pac/primary?scope=platform', { body: config({ category: 'pac', slot: 'primary' }) })
      .on('DELETE /api/integrations/whatsapp/default?scope=company', { status: 204 })
      .on('POST /api/integrations/sms/default/test?scope=company', {
        body: { ok: true, message: 'ok', latencyMs: 120, testedAt: '2026-10-02T00:00:00Z', live: true },
      });
    teardown = installGlobalFetchMock(m);

    expect(await integrationsHttp.get('pac', 'backup', 'company')).toBeNull();
    await integrationsHttp.upsert('pac', 'primary', 'platform', { provider: 'diverza', enabled: true, values: {} });
    await integrationsHttp.remove('whatsapp', 'default', 'company');
    const t = await integrationsHttp.test('sms', 'default', 'company');

    expect(m.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET ${API}/integrations/pac/backup?scope=company`,
      `PUT ${API}/integrations/pac/primary?scope=platform`,
      `DELETE ${API}/integrations/whatsapp/default?scope=company`,
      `POST ${API}/integrations/sms/default/test?scope=company`,
    ]);
    expect(t.live).toBe(true);
  });

  test('PUT omite el secreto vacío (conservar) y manda null al borrarlo', async () => {
    const def = getCategoryDef('sms');
    const stored = config();
    const m = makeFetchMock().onAny(() => true, (req) => ({ body: { ...stored, echo: req.body } }));
    teardown = installGlobalFetchMock(m);

    // 1) Sin tocar el secreto: no viaja (el servidor conserva el guardado).
    const keep = initialFormState(def, stored);
    await integrationsHttp.upsert('sms', 'default', 'company', buildUpsertPayload(def, keep, stored));
    expect(m.calls[0].body).toEqual({
      provider: 'twilio',
      enabled: true,
      values: { accountSid: 'AC123', from: '+525500000000' },
    });
    expect(m.calls[0].body).not.toHaveProperty('values.authToken');

    // 2) Secreto nuevo: viaja tal cual (también referencias gsm:/env:).
    const replace = { ...keep, values: { ...keep.values, authToken: 'env:TWILIO_AUTH_TOKEN' } };
    await integrationsHttp.upsert('sms', 'default', 'company', buildUpsertPayload(def, replace, stored));
    expect((m.calls[1].body as { values: Record<string, unknown> }).values.authToken).toBe('env:TWILIO_AUTH_TOKEN');

    // 3) Borrar: null explícito.
    const clear = { ...keep, clearSecrets: ['authToken'] };
    await integrationsHttp.upsert('sms', 'default', 'company', buildUpsertPayload(def, clear, stored));
    expect((m.calls[2].body as { values: Record<string, unknown> }).values.authToken).toBeNull();
  });

  test('400 del servidor llega como G3ApiError con errores por campo', async () => {
    const m = makeFetchMock().on('PUT /api/integrations/email/default?scope=company', {
      status: 400,
      body: { statusCode: 400, error: 'Bad Request', message: 'Configuración inválida', errors: { fromEmail: 'Correo inválido' } },
    });
    teardown = installGlobalFetchMock(m);
    const err = await integrationsHttp
      .upsert('email', 'default', 'company', { provider: 'sendgrid', enabled: true, values: { fromEmail: 'x' } })
      .catch((e) => e);
    expect(err).toBeInstanceOf(G3ApiError);
    expect((err as G3ApiError).status).toBe(400);
  });
});
