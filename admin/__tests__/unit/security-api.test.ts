import { tokenStore } from '../../lib/api/client';
import { authApi } from '../../lib/api/modules';
import {
  auditApi,
  isMfaChallenge,
  isValidMfaCodeFormat,
  mfaLoginApi,
  MfaRequiredError,
  securityApi,
} from '../../lib/api/security';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const CHALLENGE = { mfaRequired: true, mfaToken: 'mfa.tok', expiresInSec: 300, mfaEnrollmentRequired: false };

describe('API de seguridad — login en dos pasos', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.clear();
    window.localStorage.clear();
  });
  afterEach(() => teardown?.());

  test('login con mfaRequired NO guarda tokens y devuelve el reto', async () => {
    teardown = installGlobalFetchMock(makeFetchMock().on('POST /api/auth/login', { body: CHALLENGE }));
    const r = await mfaLoginApi.login({ email: 'admin@acme.mx', password: 'x' });
    expect(isMfaChallenge(r)).toBe(true);
    expect(tokenStore.load()).toBeNull();
  });

  test('authApi.login (un paso) lanza MfaRequiredError con el reto', async () => {
    teardown = installGlobalFetchMock(makeFetchMock().on('POST /api/auth/login', { body: CHALLENGE }));
    await expect(authApi.login({ email: 'a@acme.mx', password: 'x' })).rejects.toBeInstanceOf(MfaRequiredError);
  });

  test('verify envía mfaToken+code sin Bearer y guarda la sesión', async () => {
    const m = makeFetchMock().on('POST /api/auth/mfa/verify', { body: fixtures.session('pro') });
    teardown = installGlobalFetchMock(m);
    tokenStore.setInMemory({ accessToken: 'viejo', refreshToken: 'viejo' });
    const s = await mfaLoginApi.verify({ mfaToken: 'mfa.tok', code: '123456' });
    expect(s.user.tier).toBe('pro');
    expect(m.calls[0].headers.authorization).toBeUndefined();
    expect(m.calls[0].body).toEqual({ mfaToken: 'mfa.tok', code: '123456' });
    expect(tokenStore.load()?.accessToken).toBe('jwt.pro.access');
  });

  test('challengeConfirm guarda la sesión y devuelve códigos de recuperación', async () => {
    teardown = installGlobalFetchMock(
      makeFetchMock().on('POST /api/auth/mfa/challenge/confirm', {
        body: { session: fixtures.session('pro'), recoveryCodes: ['AAAAA-BBBBB'] },
      }),
    );
    const r = await mfaLoginApi.challengeConfirm({ mfaToken: 't', code: '123456' });
    expect(r.recoveryCodes).toEqual(['AAAAA-BBBBB']);
    expect(tokenStore.load()?.accessToken).toBe('jwt.pro.access');
  });

  test('ssoDiscover codifica el correo en query', async () => {
    const m = makeFetchMock().onAny(() => true, { body: { ssoEnabled: true, provider: 'google' } });
    teardown = installGlobalFetchMock(m);
    await mfaLoginApi.ssoDiscover('ana+ops@acme.mx');
    expect(m.calls[0].url).toBe('https://api.g3.test/api/auth/sso/discover?email=ana%2Bops%40acme.mx');
  });
});

describe('API de seguridad — endpoints autenticados', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('mfaEnroll usa Bearer', async () => {
    const m = makeFetchMock().on('POST /api/auth/mfa/enroll', {
      body: { secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x', issuer: 'G3 Admin', account: 'a' },
    });
    teardown = installGlobalFetchMock(m);
    await securityApi.mfaEnroll();
    expect(m.calls[0].headers.authorization).toBe('Bearer tok');
  });

  test('updatePolicy hace PUT', async () => {
    const m = makeFetchMock().on('PUT /api/auth/security-policy', {
      body: { companyId: 'c', requireMfaForRoles: ['owner', 'admin', 'dispatcher'], updatedAt: 'x' },
    });
    teardown = installGlobalFetchMock(m);
    await securityApi.updatePolicy(['dispatcher']);
    expect(m.calls[0].body).toEqual({ requireMfaForRoles: ['dispatcher'] });
  });

  test('auditApi.list arma paginado + filtros', async () => {
    const m = makeFetchMock().onAny(() => true, { body: { items: [], page: 2, pageSize: 25, total: 0 } });
    teardown = installGlobalFetchMock(m);
    await auditApi.list({ page: 2, pageSize: 25, action: 'user.role_changed' });
    expect(m.calls[0].url).toBe(
      'https://api.g3.test/api/audit/events?page=2&pageSize=25&action=user.role_changed',
    );
  });
});

describe('isValidMfaCodeFormat', () => {
  test.each([
    ['123456', true],
    [' 123 456 ', true],
    ['ABCDE-FGH23', true],
    ['abcde fgh23', true],
    ['12345', false],
    ['1234567', false],
    ['hola', false],
    ['', false],
  ])('%p → %p', (code, ok) => {
    expect(isValidMfaCodeFormat(code)).toBe(ok);
  });
});
