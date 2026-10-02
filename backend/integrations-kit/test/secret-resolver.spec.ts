import { METADATA_TOKEN_URL, parseSecretReference, SecretResolver } from '../src';
import { fakeFetch } from './fake-fetch';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

function gcpFetch(secret = 'valor-de-gsm') {
  return fakeFetch((call) => {
    if (call.url === METADATA_TOKEN_URL) return { body: { access_token: 'ya29.token', expires_in: 3599, token_type: 'Bearer' } };
    return { body: { name: 'x', payload: { data: b64(secret) } } };
  });
}

describe('SecretResolver', () => {
  test('env:NOMBRE lee del entorno y falla claro si falta', async () => {
    const r = new SecretResolver({ env: { TWILIO_TOKEN: 'abc' }, fetch: fakeFetch({}) });
    expect(await r.resolve('env:TWILIO_TOKEN')).toBe('abc');
    await expect(r.resolve('env:NO_EXISTE')).rejects.toThrow('NO_EXISTE no está definida');
  });

  test('literal se devuelve tal cual (ya descifrado)', async () => {
    const r = new SecretResolver({ env: {}, fetch: fakeFetch({}) });
    expect(await r.resolve('sk_test_123')).toBe('sk_test_123');
  });

  test('gsm: token del metadata server + Secret Manager :access, base64 decodificado', async () => {
    const f = gcpFetch('s3cr3t-ñ');
    const r = new SecretResolver({ env: {}, fetch: f });
    expect(await r.resolve('gsm:projects/g3-prod/secrets/twilio-token/versions/3')).toBe('s3cr3t-ñ');
    expect(f.calls[0].url).toBe('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token');
    expect(f.calls[0].init.headers['Metadata-Flavor']).toBe('Google');
    expect(f.calls[1].url).toBe('https://secretmanager.googleapis.com/v1/projects/g3-prod/secrets/twilio-token/versions/3:access');
    expect(f.calls[1].init.headers.authorization).toBe('Bearer ya29.token');
  });

  test('gsm: sin versión usa latest; cachea token y valor', async () => {
    let t = 0;
    const f = gcpFetch();
    const r = new SecretResolver({ env: {}, fetch: f, now: () => t });
    await r.resolve('gsm:projects/g3-prod/secrets/a');
    await r.resolve('gsm:projects/g3-prod/secrets/a');
    expect(f.calls.map((c) => c.url)).toEqual([METADATA_TOKEN_URL, 'https://secretmanager.googleapis.com/v1/projects/g3-prod/secrets/a/versions/latest:access']);
    t = 6 * 60_000; // vence la caché del valor (5 min), no la del token
    await r.resolve('gsm:projects/g3-prod/secrets/a');
    expect(f.calls).toHaveLength(3);
  });

  test('gsm: 403 de Secret Manager → error claro sin token', async () => {
    const f = fakeFetch((call) => (call.url === METADATA_TOKEN_URL ? { body: { access_token: 'ya29.tok', expires_in: 3600 } } : { status: 403, body: { error: { message: 'Permission denied' } } }));
    const r = new SecretResolver({ env: {}, fetch: f });
    const err = await r.resolve('gsm:projects/p1/secrets/s/versions/1').catch((e: Error) => e);
    expect((err as Error).message).toContain('sin permiso secretAccessor');
    expect((err as Error).message).not.toContain('ya29');
  });

  test('gsm: fuera de GCP (sin metadata server)', async () => {
    const r = new SecretResolver({ env: {}, fetch: async () => { throw new Error('ENOTFOUND'); } });
    await expect(r.resolve('gsm:projects/p1/secrets/s')).rejects.toThrow('metadata server');
  });

  test('referencia gsm: mal formada es error, no literal', async () => {
    const r = new SecretResolver({ env: {}, fetch: fakeFetch({}) });
    await expect(r.resolve('gsm:mal/formada')).rejects.toThrow('Referencia de secreto inválida');
  });

  test('resolveReference (SSO): acepta projects/… sin prefijo y rechaza literales', async () => {
    const r = new SecretResolver({ env: { OIDC_SECRET: 'x' }, fetch: gcpFetch('oidc') });
    expect(await r.resolveReference('projects/g3-prod/secrets/oidc-client')).toBe('oidc');
    expect(await r.resolveReference('env:OIDC_SECRET')).toBe('x');
    await expect(r.resolveReference('un-literal')).rejects.toThrow('Referencia de secreto inválida');
  });

  test('parseSecretReference', () => {
    expect(parseSecretReference('env:A_B')).toEqual({ kind: 'env', name: 'A_B' });
    expect(parseSecretReference('gsm:projects/p-1/secrets/s_1/versions/latest')).toEqual({ kind: 'gsm', project: 'p-1', secret: 's_1', version: 'latest' });
    expect(parseSecretReference('hola')).toEqual({ kind: 'literal' });
  });
});
