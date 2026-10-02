import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { FetchOidcDiscovery, FetchTokenExchanger, JwksSignatureVerifier } from '../src/sso/oidc';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('JwksSignatureVerifier (RS256 con JWKS del IdP)', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };

  function build() {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(String(url));
      return jsonResponse({ keys: [jwk] });
    }) as unknown as typeof fetch;
    return { calls, verifier: new JwksSignatureVerifier(fetchImpl) };
  }

  const sign = (claims: object, kid = 'k1') =>
    jwt.sign(claims, privateKey, { algorithm: 'RS256', keyid: kid, noTimestamp: true });

  test('verifica la firma y cachea el JWKS', async () => {
    const { verifier, calls } = build();
    const ctx = { jwksUri: 'https://idp.test/jwks' };
    expect(await verifier.verify(sign({ sub: 'a' }), ctx)).toMatchObject({ sub: 'a' });
    expect(await verifier.verify(sign({ sub: 'b' }), ctx)).toMatchObject({ sub: 'b' });
    expect(calls).toEqual(['https://idp.test/jwks']);
  });

  test('rechaza token con payload alterado', async () => {
    const { verifier } = build();
    const [h, , s] = sign({ sub: 'a' }).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'admin' })).toString('base64url');
    await expect(verifier.verify(`${h}.${forgedPayload}.${s}`, { jwksUri: 'https://idp.test/jwks' })).rejects.toThrow();
  });

  test('rechaza kid desconocido', async () => {
    const { verifier } = build();
    await expect(verifier.verify(sign({ sub: 'a' }, 'k-otro'), { jwksUri: 'https://idp.test/jwks' })).rejects.toThrow(
      /kid/i,
    );
  });

  test('rechaza confusión de algoritmo (HS256 / none)', async () => {
    const { verifier } = build();
    const hs = jwt.sign({ sub: 'a' }, 'secreto', { algorithm: 'HS256', keyid: 'k1' });
    await expect(verifier.verify(hs, { jwksUri: 'https://idp.test/jwks' })).rejects.toThrow();
    const none = jwt.sign({ sub: 'a' }, '', { algorithm: 'none', keyid: 'k1' } as jwt.SignOptions);
    await expect(verifier.verify(none, { jwksUri: 'https://idp.test/jwks' })).rejects.toThrow();
  });
});

describe('FetchOidcDiscovery', () => {
  test('lee .well-known y exige que metadata.issuer coincida', async () => {
    const fetchImpl = (async (url: string) => {
      expect(url).toBe('https://idp.test/.well-known/openid-configuration');
      return jsonResponse({
        issuer: 'https://idp.test',
        authorization_endpoint: 'https://idp.test/auth',
        token_endpoint: 'https://idp.test/token',
        jwks_uri: 'https://idp.test/jwks',
      });
    }) as unknown as typeof fetch;
    const d = new FetchOidcDiscovery(fetchImpl);
    expect((await d.get('https://idp.test')).token_endpoint).toBe('https://idp.test/token');
  });

  test('issuer distinto en metadata → error (mix-up)', async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        issuer: 'https://evil.test',
        authorization_endpoint: 'https://evil.test/auth',
        token_endpoint: 'https://evil.test/token',
        jwks_uri: 'https://evil.test/jwks',
      })) as unknown as typeof fetch;
    await expect(new FetchOidcDiscovery(fetchImpl).get('https://idp.test')).rejects.toThrow(/issuer/i);
  });
});

describe('FetchTokenExchanger', () => {
  test('POST form-urlencoded con code_verifier y devuelve id_token', async () => {
    let seen: { url: string; body: string } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return jsonResponse({ id_token: 'idt', access_token: 'at', token_type: 'Bearer' });
    }) as unknown as typeof fetch;
    const r = await new FetchTokenExchanger(fetchImpl).exchange({
      tokenEndpoint: 'https://idp.test/token',
      code: 'c',
      codeVerifier: 'v',
      redirectUri: 'https://admin/cb',
      clientId: 'cid',
      clientSecret: 'cs',
    });
    expect(r.idToken).toBe('idt');
    const params = new URLSearchParams(seen!.body);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code_verifier')).toBe('v');
    expect(params.get('client_secret')).toBe('cs');
  });

  test('respuesta sin id_token o con error → lanza', async () => {
    const fetchImpl = (async () => jsonResponse({ error: 'invalid_grant' }, 400)) as unknown as typeof fetch;
    await expect(
      new FetchTokenExchanger(fetchImpl).exchange({
        tokenEndpoint: 'https://idp.test/token',
        code: 'c',
        codeVerifier: 'v',
        redirectUri: 'r',
        clientId: 'cid',
        clientSecret: 'cs',
      }),
    ).rejects.toThrow();
  });
});
