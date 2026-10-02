import { StaticIntegrationResolver, type FetchLike, type HttpRequestInit } from '@g3/integrations';
import { ProviderEmailSender, ProviderSmsSender } from '../src/passwordless/provider-senders';

function fakeFetch(status = 201) {
  const calls: { url: string; init: HttpRequestInit }[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok: status < 300, status, text: async () => '{}' };
  };
  return { f, calls };
}

const SID = 'AC' + 'c'.repeat(32);

describe('ProviderSmsSender / ProviderEmailSender (resolución por compañía)', () => {
  test('SMS con el Twilio de la compañía del chofer', async () => {
    const resolver = new StaticIntegrationResolver({
      'cmp_a|sms|default': { source: 'company', provider: 'twilio', settings: { accountSid: SID, from: '+15005550006' }, secrets: { authToken: 'tw-token' } },
    });
    const { f, calls } = fakeFetch();
    await new ProviderSmsSender(resolver, { fetch: f }).send('cmp_a', '+5215512345678', 'G3 Drive: 123456');
    expect(resolver.calls).toEqual([{ companyId: 'cmp_a', category: 'sms', slot: 'default' }]);
    expect(calls[0].url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`);
    expect(new URLSearchParams(calls[0].init.body).get('Body')).toBe('G3 Drive: 123456');
  });

  test('sin proveedor: modo registro, no hay red', async () => {
    const { f, calls } = fakeFetch();
    const logs: string[] = [];
    await new ProviderSmsSender(new StaticIntegrationResolver(), { fetch: f, log: (m) => logs.push(m) }).send('cmp_b', '+5215512345678', 'código 654321');
    expect(calls).toHaveLength(0);
    expect(logs[0]).toContain('registro');
    expect(logs.join()).not.toContain('654321');
  });

  test('fallo del proveedor no se propaga (no revela existencia) y no filtra secretos', async () => {
    const resolver = new StaticIntegrationResolver({
      '*|email|default': { source: 'platform', provider: 'sendgrid', settings: { fromEmail: 'no-reply@g3.mx' }, secrets: { apiKey: 'SG.secreto' } },
    });
    const { f, calls } = fakeFetch(401);
    const logs: string[] = [];
    await expect(
      new ProviderEmailSender(resolver, { fetch: f, log: (m) => logs.push(m) }).send('cmp_a', 'ana@x.mx', 'Restablece', 'cuerpo'),
    ).resolves.toBeUndefined();
    expect(calls[0].url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(logs[0]).toContain('HTTP 401');
    expect(logs.join()).not.toContain('SG.secreto');
  });

  test('el resolver caído tampoco rompe el flujo', async () => {
    const logs: string[] = [];
    const broken = { resolve: async () => { throw new Error('integrations no disponible'); } };
    await expect(new ProviderSmsSender(broken, { log: (m) => logs.push(m) }).send('cmp_a', '+5215512345678', 'x')).resolves.toBeUndefined();
    expect(logs[0]).toContain('integrations no disponible');
  });
});
