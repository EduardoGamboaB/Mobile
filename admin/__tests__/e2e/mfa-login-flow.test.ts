/**
 * E2E — login con MFA desde G3 Admin (modo live contra un backend simulado).
 *
 * credenciales → { mfaRequired } → paso de código (TOTP o recuperación) →
 * sesión. También: enrolamiento forzado por política, bloqueo por intentos,
 * MFA voluntario desde Ajustes, SSO (state) y bitácora.
 */
import { useAppStore } from '../../lib/store';
import { useSecurityStore, resetSecurityStore } from '../../lib/security';
import { tokenStore } from '../../lib/api/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock, type FetchMock } from '../helpers/mockFetch';

const CHALLENGE = { mfaRequired: true, mfaToken: 'mfa.tok', expiresInSec: 300, mfaEnrollmentRequired: false };
const ENROLL_CHALLENGE = { ...CHALLENGE, mfaToken: 'mfa.enroll', mfaEnrollmentRequired: true };
const ENROLL = {
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  otpauthUri: 'otpauth://totp/G3%20Admin:admin%40acme.mx?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=G3%20Admin',
  issuer: 'G3 Admin',
  account: 'admin@acme.mx',
};
const CODES = Array.from({ length: 10 }, (_, i) => `AAAA${'ABCDEFGHIJ'[i]}-BBBBB`);

function withSubscription(m: FetchMock) {
  return m.onAny((r) => r.url.endsWith('/api/subscriptions/me'), { body: fixtures.subscription('pro') });
}

describe('E2E — login en dos pasos', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.clear();
    window.localStorage.clear();
    resetSecurityStore();
    useAppStore.setState({ authed: false, userEmail: null });
  });
  afterEach(() => teardown?.());

  test('sin MFA: credenciales → panel directo', async () => {
    teardown = installGlobalFetchMock(
      withSubscription(makeFetchMock().on('POST /api/auth/login', { body: fixtures.session('pro') })),
    );
    expect(await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw')).toBe('done');
    expect(useAppStore.getState().authed).toBe(true);
  });

  test('con MFA: pide código; código erróneo muestra error; correcto entra', async () => {
    const m = withSubscription(
      makeFetchMock()
        .on('POST /api/auth/login', { body: CHALLENGE })
        .on('POST /api/auth/mfa/verify', {
          status: 401,
          body: { statusCode: 401, error: 'Unauthorized', message: 'Código MFA incorrecto' },
        })
        .on('POST /api/auth/mfa/verify', { body: fixtures.session('pro') }),
    );
    teardown = installGlobalFetchMock(m);

    expect(await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw')).toBe('mfa');
    expect(useAppStore.getState().authed).toBe(false);
    expect(tokenStore.load()).toBeNull();
    expect(useSecurityStore.getState().pending).toMatchObject({ mfaToken: 'mfa.tok', email: 'admin@acme.mx' });

    expect(await useSecurityStore.getState().submitMfaCode('111111')).toBe(false);
    expect(useSecurityStore.getState().error).toMatch(/incorrecto/i);
    expect(useSecurityStore.getState().step).toBe('mfa');

    expect(await useSecurityStore.getState().submitMfaCode('222222')).toBe(true);
    expect(useAppStore.getState().authed).toBe(true);
    expect(useSecurityStore.getState().pending).toBeNull();
    expect(useSecurityStore.getState().step).toBe('done');
    const verifyCalls = m.calls.filter((c) => c.url.endsWith('/auth/mfa/verify'));
    expect(verifyCalls.map((c) => c.body)).toEqual([
      { mfaToken: 'mfa.tok', code: '111111' },
      { mfaToken: 'mfa.tok', code: '222222' },
    ]);
  });

  test('acepta código de recuperación', async () => {
    const m = withSubscription(
      makeFetchMock()
        .on('POST /api/auth/login', { body: CHALLENGE })
        .on('POST /api/auth/mfa/verify', { body: fixtures.session('pro') }),
    );
    teardown = installGlobalFetchMock(m);
    await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw');
    expect(await useSecurityStore.getState().submitMfaCode('abcde-fgh23')).toBe(true);
    expect(m.calls.find((c) => c.url.endsWith('/auth/mfa/verify'))?.body).toEqual({
      mfaToken: 'mfa.tok',
      code: 'ABCDE-FGH23',
    });
  });

  test('formato inválido se rechaza sin llamar al backend', async () => {
    const m = makeFetchMock().on('POST /api/auth/login', { body: CHALLENGE });
    teardown = installGlobalFetchMock(m);
    await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw');
    expect(await useSecurityStore.getState().submitMfaCode('12ab')).toBe(false);
    expect(useSecurityStore.getState().error).toMatch(/6 dígitos|recuperación/i);
    expect(m.calls.filter((c) => c.url.endsWith('/auth/mfa/verify'))).toHaveLength(0);
  });

  test('429 por intentos: vuelve a credenciales con mensaje', async () => {
    teardown = installGlobalFetchMock(
      makeFetchMock()
        .on('POST /api/auth/login', { body: CHALLENGE })
        .on('POST /api/auth/mfa/verify', {
          status: 429,
          body: { statusCode: 429, error: 'Too Many Requests', message: 'Demasiados intentos. Vuelve a iniciar sesión.' },
        }),
    );
    await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw');
    expect(await useSecurityStore.getState().submitMfaCode('333333')).toBe(false);
    expect(useSecurityStore.getState().step).toBe('credentials');
    expect(useSecurityStore.getState().pending).toBeNull();
    expect(useSecurityStore.getState().error).toMatch(/demasiados intentos/i);
  });

  test('cancelar el paso MFA limpia el reto', async () => {
    teardown = installGlobalFetchMock(makeFetchMock().on('POST /api/auth/login', { body: CHALLENGE }));
    await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw');
    useSecurityStore.getState().cancelLogin();
    expect(useSecurityStore.getState()).toMatchObject({ step: 'credentials', pending: null });
  });

  test('enrolamiento forzado por política: secreto → confirmar → códigos → panel', async () => {
    const m = withSubscription(
      makeFetchMock()
        .on('POST /api/auth/login', { body: ENROLL_CHALLENGE })
        .on('POST /api/auth/mfa/challenge/enroll', { body: ENROLL })
        .on('POST /api/auth/mfa/challenge/confirm', {
          body: { session: fixtures.session('pro'), recoveryCodes: CODES },
        }),
    );
    teardown = installGlobalFetchMock(m);

    expect(await useSecurityStore.getState().beginLogin('admin@acme.mx', 'pw')).toBe('enroll');
    expect(useSecurityStore.getState().enrollment?.secret).toBe(ENROLL.secret);
    expect(m.calls.find((c) => c.url.endsWith('/challenge/enroll'))?.body).toEqual({ mfaToken: 'mfa.enroll' });

    expect(await useSecurityStore.getState().confirmForcedEnrollment('444444')).toBe(true);
    expect(useSecurityStore.getState().step).toBe('recovery-codes');
    expect(useSecurityStore.getState().recoveryCodes).toEqual(CODES);
    expect(useAppStore.getState().authed).toBe(true);

    useSecurityStore.getState().acknowledgeRecoveryCodes();
    expect(useSecurityStore.getState()).toMatchObject({ step: 'done', recoveryCodes: null, enrollment: null });
  });
});

describe('E2E — Ajustes › Seguridad (MFA voluntario, política, bitácora)', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' });
    resetSecurityStore();
  });
  afterEach(() => teardown?.());

  const STATUS_OFF = { enabled: false, pending: false, enrolledAt: null, recoveryCodesRemaining: 0, requiredByPolicy: true };
  const POLICY = { companyId: 'cmp_test_1', requireMfaForRoles: ['owner', 'admin'], updatedAt: 'x' };

  test('activar MFA: enroll → confirm → status enabled + códigos visibles una vez', async () => {
    teardown = installGlobalFetchMock(
      makeFetchMock()
        .on('GET /api/auth/mfa/status', { body: STATUS_OFF })
        .on('GET /api/auth/security-policy', { body: POLICY })
        .on('GET /api/auth/sso/config', { body: null })
        .on('POST /api/auth/mfa/enroll', { body: ENROLL })
        .on('POST /api/auth/mfa/confirm', { body: { recoveryCodes: CODES } })
        .on('GET /api/auth/mfa/status', {
          body: { ...STATUS_OFF, enabled: true, enrolledAt: '2026-10-01', recoveryCodesRemaining: 10 },
        }),
    );
    await useSecurityStore.getState().loadSecurity();
    expect(useSecurityStore.getState().mfa?.enabled).toBe(false);
    await useSecurityStore.getState().startEnrollment();
    expect(useSecurityStore.getState().enrollment?.otpauthUri).toContain('otpauth://totp/');
    expect(await useSecurityStore.getState().confirmEnrollment('555555')).toBe(true);
    expect(useSecurityStore.getState().recoveryCodes).toHaveLength(10);
    expect(useSecurityStore.getState().mfa).toMatchObject({ enabled: true, recoveryCodesRemaining: 10 });
  });

  test('exigir MFA a dispatcher no permite quitar owner/admin', async () => {
    const m = makeFetchMock().on('PUT /api/auth/security-policy', (req) => ({
      body: { ...POLICY, requireMfaForRoles: (req.body as { requireMfaForRoles: string[] }).requireMfaForRoles },
    }));
    teardown = installGlobalFetchMock(m);
    await useSecurityStore.getState().setRequireMfaForRoles(['dispatcher']);
    expect(m.calls[0].body).toEqual({ requireMfaForRoles: ['owner', 'admin', 'dispatcher'] });
    expect(useSecurityStore.getState().policy?.requireMfaForRoles).toContain('dispatcher');
  });

  test('bitácora: carga paginada con filtro y verificación de integridad', async () => {
    const entry = {
      id: 'e1', seq: 1, companyId: 'cmp_test_1',
      actor: { type: 'user', userId: 'usr_test_1', role: 'admin' },
      action: 'auth.login.succeeded', resource: { type: 'user', id: 'usr_test_1' },
      ip: '201.1.1.1', userAgent: 'x', timestamp: '2026-10-01T12:00:00Z', metadata: { method: 'password+totp' },
      prevHash: '0'.repeat(64), hash: 'a'.repeat(64),
    };
    const m = makeFetchMock()
      .onAny((r) => r.url.includes('/api/audit/events'), { body: { items: [entry], page: 1, pageSize: 25, total: 1 } })
      .on('GET /api/audit/verify', { body: { ok: true, entries: 1, brokenAtSeq: null, reason: null } });
    teardown = installGlobalFetchMock(m);
    await useSecurityStore.getState().loadAudit({ action: 'auth.login.succeeded' });
    expect(m.calls[0].url).toContain('action=auth.login.succeeded');
    expect(useSecurityStore.getState().audit?.total).toBe(1);
    await useSecurityStore.getState().verifyAudit();
    expect(useSecurityStore.getState().integrity?.ok).toBe(true);
  });
});

describe('E2E — SSO desde el login', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.clear();
    resetSecurityStore();
    useAppStore.setState({ authed: false });
  });
  afterEach(() => teardown?.());

  test('discover → start guarda state → callback con el mismo state entra', async () => {
    const m = withSubscription(
      makeFetchMock()
        .onAny((r) => r.url.includes('/auth/sso/discover'), { body: { ssoEnabled: true, provider: 'google' } })
        .on('POST /api/auth/sso/start', { body: { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?x=1', state: 'st-123' } })
        .on('POST /api/auth/sso/callback', { body: fixtures.session('pro') }),
    );
    teardown = installGlobalFetchMock(m);
    expect(await useSecurityStore.getState().discoverSso('ana@acme.mx')).toEqual({ ssoEnabled: true, provider: 'google' });
    expect(await useSecurityStore.getState().startSso('ana@acme.mx')).toMatch(/^https:\/\/accounts\.google\.com/);
    expect(await useSecurityStore.getState().completeSso({ code: 'c', state: 'st-123' })).toBe(true);
    expect(useAppStore.getState().authed).toBe(true);
  });

  test('callback con state distinto al guardado se rechaza sin llamar al backend (anti login-CSRF)', async () => {
    const m = makeFetchMock().on('POST /api/auth/sso/start', {
      body: { authorizationUrl: 'https://accounts.google.com/x', state: 'st-legit' },
    });
    teardown = installGlobalFetchMock(m);
    await useSecurityStore.getState().startSso('ana@acme.mx');
    expect(await useSecurityStore.getState().completeSso({ code: 'c', state: 'st-atacante' })).toBe(false);
    expect(useSecurityStore.getState().error).toMatch(/sso/i);
    expect(m.calls.filter((c) => c.url.endsWith('/sso/callback'))).toHaveLength(0);
  });
});

describe('E2E — modo demo (sin backend)', () => {
  test('activar MFA demo, login pide código, 000000 falla y un código válido entra; queda en bitácora', async () => {
    const prev = process.env.NEXT_PUBLIC_DEMO;
    process.env.NEXT_PUBLIC_DEMO = '1';
    try {
      await jest.isolateModulesAsync(async () => {
        const { useSecurityStore: sec, resetSecurityStore: reset } = await import('../../lib/security');
        const { useAppStore: app } = await import('../../lib/store');
        window.localStorage.clear();
        reset();
        await sec.getState().loadSecurity();
        await sec.getState().startEnrollment();
        expect(sec.getState().enrollment?.secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(await sec.getState().confirmEnrollment('123456')).toBe(true);
        const codes = sec.getState().recoveryCodes!;
        expect(codes).toHaveLength(10);

        app.getState().signOut();
        expect(await sec.getState().beginLogin('despacho@g3logistics.mx', 'demo1234')).toBe('mfa');
        expect(await sec.getState().submitMfaCode('000000')).toBe(false);
        expect(await sec.getState().submitMfaCode(codes[0])).toBe(true);
        expect(app.getState().authed).toBe(true);

        await sec.getState().loadAudit({});
        const actions = sec.getState().audit!.items.map((e) => e.action);
        expect(actions).toEqual(
          expect.arrayContaining(['auth.mfa.enrolled', 'auth.mfa.recovery_code_used', 'auth.login.succeeded']),
        );
      });
    } finally {
      process.env.NEXT_PUBLIC_DEMO = prev;
    }
  });
});
