import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { UpdateSsoConfigDto } from '@g3/contracts';
import { actorOf, addUser, buildTestContainer, IDP_TEST_KEY, META, registerOwner } from './helpers/container';

const GOOGLE: UpdateSsoConfigDto = {
  provider: 'google',
  enabled: true,
  issuer: 'https://accounts.google.com',
  clientId: 'g3-admin-client',
  clientSecretRef: 'projects/g3-prod/secrets/acme-google-oidc',
  allowedDomains: ['acme.mx'],
  jitProvisioning: false,
};

async function setup(over: Partial<UpdateSsoConfigDto> = {}) {
  const c = buildTestContainer();
  const s = await registerOwner(c, 'owner@acme.mx');
  const owner = (await c.users.findById(s.user.id))!;
  await c.sso.updateConfig(actorOf(owner), { ...GOOGLE, ...over });
  return { c, s, owner };
}

function idToken(c: ReturnType<typeof buildTestContainer>, claims: Record<string, unknown>) {
  const now = Math.floor(c.clock.now() / 1000);
  return jwt.sign(
    {
      iss: 'https://accounts.google.com',
      aud: 'g3-admin-client',
      sub: 'google-sub-123',
      email: 'owner@acme.mx',
      email_verified: true,
      hd: 'acme.mx',
      iat: now,
      exp: now + 3600,
      ...claims,
    },
    IDP_TEST_KEY,
    { algorithm: 'HS256' },
  );
}

async function startAndGetNonce(c: ReturnType<typeof buildTestContainer>, email = 'owner@acme.mx') {
  const r = await c.sso.start({ email });
  const url = new URL(r.authorizationUrl);
  return { ...r, url, nonce: url.searchParams.get('nonce')! };
}

describe('SSO — configuración por compañía', () => {
  test('solo owner/admin configuran SSO (403)', async () => {
    const { c, s } = await setup();
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    await expect(c.sso.updateConfig(actorOf(disp), GOOGLE)).rejects.toMatchObject({ status: 403 });
    await expect(c.sso.getConfig(actorOf(disp))).rejects.toMatchObject({ status: 403 });
  });

  test.each([
    ['issuer sin https', { issuer: 'http://accounts.google.com' }],
    ['clientId vacío', { clientId: '' }],
    ['secreto en claro en vez de referencia', { clientSecretRef: 'GOCSPX-abc123' }],
    ['sin dominios', { allowedDomains: [] }],
    ['dominio inválido', { allowedDomains: ['acme mx'] }],
    ['dominio público de correo', { allowedDomains: ['gmail.com'] }],
  ])('valida: %s → 400', async (_name, over) => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const owner = (await c.users.findById(s.user.id))!;
    await expect(c.sso.updateConfig(actorOf(owner), { ...GOOGLE, ...over })).rejects.toMatchObject({ status: 400 });
  });

  test('un dominio no puede pertenecer a dos compañías (409)', async () => {
    const { c } = await setup();
    const other = await registerOwner(c, 'boss@otra.mx');
    const otherOwner = (await c.users.findById(other.user.id))!;
    await expect(c.sso.updateConfig(actorOf(otherOwner), GOOGLE)).rejects.toMatchObject({ status: 409 });
  });

  test('audita sso_config.updated sin exponer la referencia del secreto', async () => {
    const { c, s } = await setup();
    const log = await c.audit.query(s.user.companyId, { action: 'sso_config.updated' });
    expect(log.total).toBe(1);
    expect(JSON.stringify(log.items[0])).not.toContain('acme-google-oidc');
    expect(log.items[0].metadata).toMatchObject({ after: { provider: 'google', allowedDomains: ['acme.mx'] } });
  });

  test('getConfig devuelve la config de la compañía del actor', async () => {
    const { c, owner } = await setup();
    expect(await c.sso.getConfig(actorOf(owner))).toMatchObject({ provider: 'google', enabled: true });
  });
});

describe('SSO — discover y start (authorization code + PKCE)', () => {
  test('discover por dominio del correo', async () => {
    const { c } = await setup();
    expect(await c.sso.discover('ana@ACME.mx')).toEqual({ ssoEnabled: true, provider: 'google' });
    expect(await c.sso.discover('ana@otra.mx')).toEqual({ ssoEnabled: false, provider: null });
    expect(await c.sso.discover('no-es-correo')).toEqual({ ssoEnabled: false, provider: null });
  });

  test('config deshabilitada no aparece en discover ni permite start', async () => {
    const { c } = await setup({ enabled: false });
    expect((await c.sso.discover('ana@acme.mx')).ssoEnabled).toBe(false);
    await expect(c.sso.start({ email: 'ana@acme.mx' })).rejects.toMatchObject({ status: 404 });
  });

  test('start arma URL de autorización con PKCE S256, state, nonce y redirect fijo', async () => {
    const { c } = await setup();
    const { url, state, nonce } = await startAndGetNonce(c);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const p = url.searchParams;
    expect(p.get('response_type')).toBe('code');
    expect(p.get('client_id')).toBe('g3-admin-client');
    expect(p.get('redirect_uri')).toBe('https://admin.g3.test/login/sso/callback');
    expect(p.get('scope')).toBe('openid email profile');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(p.get('state')).toBe(state);
    expect(state.length).toBeGreaterThanOrEqual(32);
    expect(nonce.length).toBeGreaterThanOrEqual(32);
    expect(p.get('hd')).toBe('acme.mx');
    expect(p.get('login_hint')).toBe('owner@acme.mx');
    expect(url.toString()).not.toMatch(/code_verifier|secret/);
  });
});

describe('SSO — callback', () => {
  test('flujo feliz: canjea code con verifier PKCE, valida id_token y emite sesión', async () => {
    const { c, s } = await setup();
    const { url, state, nonce } = await startAndGetNonce(c);
    c.exchanger.respondWith(idToken(c, { nonce }));

    const session = await c.sso.callback({ state, code: 'auth-code-xyz' }, META);

    expect(session.user.id).toBe(s.user.id);
    expect(c.tokens.verifyAccess(session.accessToken).companyId).toBe(s.user.companyId);
    const call = c.exchanger.calls[0];
    expect(call).toMatchObject({
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      code: 'auth-code-xyz',
      redirectUri: 'https://admin.g3.test/login/sso/callback',
      clientId: 'g3-admin-client',
      clientSecret: 'secret-for:projects/g3-prod/secrets/acme-google-oidc',
    });
    const challenge = createHash('sha256').update(call.codeVerifier).digest('base64url');
    expect(challenge).toBe(url.searchParams.get('code_challenge'));
    const log = await c.audit.query(s.user.companyId, { action: 'auth.login.succeeded' });
    expect(log.items[0].metadata).toMatchObject({ method: 'sso', provider: 'google' });
  });

  test('state es de un solo uso', async () => {
    const { c } = await setup();
    const { state, nonce } = await startAndGetNonce(c);
    c.exchanger.respondWith(idToken(c, { nonce }));
    await c.sso.callback({ state, code: 'c1' }, META);
    c.exchanger.respondWith(idToken(c, { nonce }));
    await expect(c.sso.callback({ state, code: 'c1' }, META)).rejects.toMatchObject({ status: 401 });
  });

  test('state desconocido → 401 sin llamar al IdP', async () => {
    const { c } = await setup();
    await expect(c.sso.callback({ state: 'inventado', code: 'c' }, META)).rejects.toMatchObject({ status: 401 });
    expect(c.exchanger.calls).toHaveLength(0);
  });

  test('state expira a los 10 minutos', async () => {
    const { c } = await setup();
    const { state, nonce } = await startAndGetNonce(c);
    c.clock.advance(10 * 60_000 + 1000);
    c.exchanger.respondWith(idToken(c, { nonce }));
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 401 });
  });

  test.each<[string, Record<string, unknown>]>([
    ['nonce distinto', { nonce: 'otro-nonce' }],
    ['iss distinto', { iss: 'https://evil.example.com' }],
    ['aud distinto', { aud: 'otro-cliente' }],
    ['aud múltiple sin azp correcto', { aud: ['g3-admin-client', 'otro'], azp: 'otro' }],
    ['expirado', { exp: Math.floor(Date.parse('2026-10-01T12:00:00Z') / 1000) - 120 }],
    ['iat en el futuro', { iat: Math.floor(Date.parse('2026-10-01T12:00:00Z') / 1000) + 3600 }],
    ['email no verificado', { email_verified: false }],
    ['dominio no permitido', { email: 'ana@gmail.com', hd: undefined }],
    ['hd de Google ausente', { hd: undefined }],
    ['hd de Google distinto', { hd: 'otra.mx' }],
    ['sin email', { email: undefined }],
  ])('rechaza id_token con %s (401) y audita el fallo', async (_name, claims) => {
    const { c, s } = await setup();
    const { state, nonce } = await startAndGetNonce(c);
    c.exchanger.respondWith(idToken(c, { nonce, ...claims }));
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 401 });
    const log = await c.audit.query(s.user.companyId, { action: 'auth.login.failed' });
    expect(log.items[0].metadata).toMatchObject({ method: 'sso' });
  });

  test('firma inválida del id_token → 401', async () => {
    const { c } = await setup();
    const { state, nonce } = await startAndGetNonce(c);
    const forged = jwt.sign({ nonce, iss: 'https://accounts.google.com' }, 'otra-llave-que-no-es-la-del-idp-xx', {
      algorithm: 'HS256',
    });
    c.exchanger.respondWith(forged);
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 401 });
  });

  test('usuario inexistente y sin JIT → 403', async () => {
    const { c } = await setup();
    const { state, nonce } = await startAndGetNonce(c, 'nueva@acme.mx');
    c.exchanger.respondWith(idToken(c, { nonce, email: 'nueva@acme.mx' }));
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 403 });
  });

  test('JIT: crea al usuario con el rol más bajo (viewer) y lo audita', async () => {
    const { c, s } = await setup({ jitProvisioning: true });
    const { state, nonce } = await startAndGetNonce(c, 'nueva@acme.mx');
    c.exchanger.respondWith(idToken(c, { nonce, email: 'nueva@acme.mx', name: 'Ana Nueva' }));

    const session = await c.sso.callback({ state, code: 'c' }, META);

    expect(session.user).toMatchObject({ email: 'nueva@acme.mx', role: 'viewer', companyId: s.user.companyId });
    expect((await c.audit.query(s.user.companyId, { action: 'user.provisioned_jit' })).total).toBe(1);
  });

  test('JIT no secuestra un correo que ya existe en OTRA compañía (403)', async () => {
    const { c } = await setup({ jitProvisioning: true });
    const other = await registerOwner(c, 'colado@otra.mx');
    // alguien registra en otra compañía un correo del dominio acme.mx
    await addUser(c, other.user.companyId, 'ana@acme.mx', 'admin');
    const { state, nonce } = await startAndGetNonce(c, 'ana@acme.mx');
    c.exchanger.respondWith(idToken(c, { nonce, email: 'ana@acme.mx' }));
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 403 });
  });

  test('Microsoft Entra: acepta xms_edov como correo verificado', async () => {
    const issuer = 'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0';
    const { c, s } = await setup({ provider: 'microsoft', issuer });
    const { url, state, nonce } = await startAndGetNonce(c);
    expect(url.origin + url.pathname).toBe(
      'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/oauth2/v2.0/authorize',
    );
    expect(url.searchParams.get('hd')).toBeNull();
    c.exchanger.respondWith(
      idToken(c, { iss: issuer, nonce, email_verified: undefined, xms_edov: true, hd: undefined }),
    );
    const session = await c.sso.callback({ state, code: 'c' }, META);
    expect(session.user.id).toBe(s.user.id);
  });

  test('Microsoft Entra: sin email_verified ni xms_edov → 401', async () => {
    const issuer = 'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0';
    const { c } = await setup({ provider: 'microsoft', issuer });
    const { state, nonce } = await startAndGetNonce(c);
    c.exchanger.respondWith(idToken(c, { iss: issuer, nonce, email_verified: undefined, hd: undefined }));
    await expect(c.sso.callback({ state, code: 'c' }, META)).rejects.toMatchObject({ status: 401 });
  });
});
