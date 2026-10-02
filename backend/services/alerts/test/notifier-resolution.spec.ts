import { IntegrationsClient, StaticIntegrationResolver, type FetchLike, type HttpRequestInit } from '@g3/integrations';
import type { IncidentDto } from '@g3/contracts';
import { ResolvedPushNotifier, ResolvedWhatsAppNotifier } from '../src/incidents/notifier';
import { buildNotifiers } from '../src/main';

const T0 = '2026-10-02T12:00:00.000Z';
const incident = (companyId: string): IncidentDto => ({
  id: 'inc_1', companyId, folio: 'INC-2026-00001', clientUuid: null, source: 'sos', type: 'sos', urgency: 'critical',
  status: 'open', title: 'SOS del operador', description: 'SOS activado por el operador', tripId: null, driverId: null,
  vehicleId: null, assigneeId: null, occurredAt: T0, locationText: null, lat: null, lng: null, evidenceIds: [],
  slaAckDueAt: T0, slaResolveDueAt: T0, acknowledgedAt: null, resolvedAt: null, closedAt: null, escalationLevel: 0,
  createdAt: T0, updatedAt: T0,
});

function fakeFetch(body: unknown = {}) {
  const calls: { url: string; init: HttpRequestInit }[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };
  return { f, calls };
}

const meta = (phoneNumberId: string, accessToken: string) => ({
  provider: 'meta_cloud', settings: { phoneNumberId, template: 'g3_incidente', language: 'es_MX' }, secrets: { accessToken },
});
const admin = (whatsapp: string | null, pushToken: string | null = null) => ({ userId: 'usr_1', role: 'admin', whatsapp, pushToken });

describe('notificadores resueltos por compañía', () => {
  test('WhatsApp: número de la compañía, si no el de la plataforma', async () => {
    const resolver = new StaticIntegrationResolver({
      'cmp_a|whatsapp|default': { source: 'company', ...meta('111', 'tok-a') },
      '*|whatsapp|default': { source: 'platform', ...meta('999', 'tok-g3') },
    });
    const { f, calls } = fakeFetch({ messages: [{ id: 'wamid' }] });
    const wa = new ResolvedWhatsAppNotifier(resolver, f);
    expect(await wa.send({ channel: 'whatsapp', to: admin('+5215500000001'), incident: incident('cmp_a'), reason: 'SOS' })).toEqual({
      channel: 'whatsapp', userId: 'usr_1', ok: true,
    });
    await wa.send({ channel: 'whatsapp', to: admin('+5215500000002'), incident: incident('cmp_b'), reason: 'SOS' });
    expect(calls.map((c) => c.url)).toEqual(['https://graph.facebook.com/v20.0/111/messages', 'https://graph.facebook.com/v20.0/999/messages']);
    expect(calls[0].init.headers.authorization).toBe('Bearer tok-a');
    expect(calls[1].init.headers.authorization).toBe('Bearer tok-g3');
    expect(JSON.parse(calls[0].init.body!).template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'INC-2026-00001', 'SOS del operador', 'CRÍTICA', 'SOS',
    ]);
    expect(resolver.calls.map((c) => c.companyId)).toEqual(['cmp_a', 'cmp_b']);
  });

  test('sin proveedor en ningún nivel: modo registro (ok, sin red)', async () => {
    const { f, calls } = fakeFetch();
    const wa = new ResolvedWhatsAppNotifier(new StaticIntegrationResolver(), f);
    expect((await wa.send({ channel: 'whatsapp', to: admin('+5215500000001'), incident: incident('cmp_a'), reason: 'x' })).ok).toBe(true);
    const push = new ResolvedPushNotifier(new StaticIntegrationResolver(), f);
    expect((await push.send({ channel: 'push', to: admin(null, 'ExponentPushToken[x]'), incident: incident('cmp_a'), reason: 'x' })).ok).toBe(true);
    expect(calls).toHaveLength(0);
  });

  test('push: plataforma vía Expo con prioridad alta', async () => {
    const resolver = new StaticIntegrationResolver({ '*|push|default': { source: 'platform', provider: 'expo', settings: {}, secrets: { accessToken: 'expo-tok' } } });
    const { f, calls } = fakeFetch({ data: { status: 'ok', id: 't1' } });
    const r = await new ResolvedPushNotifier(resolver, f).send({ channel: 'push', to: admin(null, 'ExponentPushToken[x]'), incident: incident('cmp_a'), reason: 'SOS' });
    expect(r.ok).toBe(true);
    expect(calls[0].url).toBe('https://exp.host/--/api/v2/push/send');
    expect(calls[0].init.headers.authorization).toBe('Bearer expo-tok');
    expect(JSON.parse(calls[0].init.body!)).toMatchObject({ to: 'ExponentPushToken[x]', priority: 'high', data: { incidentId: 'inc_1' } });
  });

  test('sin destino no resuelve ni envía', async () => {
    const resolver = new StaticIntegrationResolver();
    const r = await new ResolvedPushNotifier(resolver).send({ channel: 'push', to: admin(null, null), incident: incident('cmp_a'), reason: 'x' });
    expect(r).toEqual({ channel: 'push', userId: 'usr_1', ok: false, error: 'sin token push' });
    expect(resolver.calls).toHaveLength(0);
  });

  test('resolver caído → resultado fallido, no excepción', async () => {
    const broken = { resolve: async () => { throw new Error('integrations no disponible'); } };
    const r = await new ResolvedWhatsAppNotifier(broken).send({ channel: 'whatsapp', to: admin('+5215500000001'), incident: incident('cmp_a'), reason: 'x' });
    expect(r).toMatchObject({ ok: false, error: 'integrations no disponible' });
  });

  test('cliente real: el servicio dice none → WHATSAPP_* del entorno de alerts', async () => {
    const { f: integrationsFetch } = fakeFetch({ category: 'whatsapp', slot: 'default', source: 'none', provider: null, settings: {}, secrets: {} });
    const client = new IntegrationsClient({
      baseUrl: 'http://integrations:8088', internalToken: 'x'.repeat(32), fetch: integrationsFetch,
      env: { WHATSAPP_PHONE_NUMBER_ID: '555', WHATSAPP_ACCESS_TOKEN: 'env-tok' },
    });
    const { f, calls } = fakeFetch({});
    await new ResolvedWhatsAppNotifier(client, f).send({ channel: 'whatsapp', to: admin('+5215500000001'), incident: incident('cmp_a'), reason: 'x' });
    expect(calls[0].url).toBe('https://graph.facebook.com/v20.0/555/messages');
  });

  test('buildNotifiers arma push + WhatsApp resueltos', () => {
    const [push, wa] = buildNotifiers({});
    expect(push).toBeInstanceOf(ResolvedPushNotifier);
    expect(wa).toBeInstanceOf(ResolvedWhatsAppNotifier);
  });
});
