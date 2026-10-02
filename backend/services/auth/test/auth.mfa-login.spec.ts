import { isMfaChallenge, type MfaChallengeDto } from '@g3/contracts';
import {
  actorOf,
  addUser,
  buildTestContainer,
  codeFor,
  enrollMfa,
  expectSession,
  META,
  PASSWORD,
  registerOwner,
} from './helpers/container';

async function challengeFor(c: ReturnType<typeof buildTestContainer>, email: string): Promise<MfaChallengeDto> {
  const r = await c.auth.login({ email, password: PASSWORD }, META);
  if (!isMfaChallenge(r)) throw new Error('Se esperaba reto MFA');
  return r;
}

describe('Login en dos pasos — usuario con MFA activo', () => {
  test('/auth/login devuelve { mfaRequired, mfaToken } y NO emite JWT', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await enrollMfa(c, s.user.id);

    const r = await c.auth.login({ email: 'owner@acme.mx', password: PASSWORD }, META);

    expect(r).toEqual({
      mfaRequired: true,
      mfaToken: expect.any(String),
      expiresInSec: 300,
      mfaEnrollmentRequired: false,
    });
    expect((r as unknown as Record<string, unknown>).accessToken).toBeUndefined();
  });

  test('el mfaToken no sirve como access token', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');
    expect(() => c.tokens.verifyAccess(mfaToken)).toThrow();
  });

  test('/auth/mfa/verify con TOTP válido emite la sesión y audita login ok', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');

    const session = await c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META);

    expect(session.accessToken).toBeTruthy();
    expect(c.tokens.verifyAccess(session.accessToken).sub).toBe(s.user.id);
    const ok = await c.audit.query(s.user.companyId, { action: 'auth.login.succeeded' });
    expect(ok.items[0].metadata).toMatchObject({ method: 'password+totp' });
  });

  test('mfaToken es de uso único', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');
    await c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META);
    c.clock.advance(30_000);
    await expect(c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META)).rejects.toMatchObject({ status: 401 });
  });

  test('mfaToken expira a los 5 minutos', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');
    c.clock.advance(5 * 60_000 + 1000);
    await expect(c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META)).rejects.toMatchObject({ status: 401 });
  });

  test('rate-limit: 5 códigos erróneos bloquean el mfaToken y se audita', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');

    for (let i = 0; i < 5; i++) {
      await expect(c.auth.verifyMfa({ mfaToken, code: '000000' }, META)).rejects.toMatchObject({ status: 401 });
    }
    // incluso el código correcto ya no entra
    await expect(c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META)).rejects.toMatchObject({ status: 429 });

    expect((await c.audit.query(s.user.companyId, { action: 'auth.mfa.verify_failed' })).total).toBe(5);
    expect((await c.audit.query(s.user.companyId, { action: 'auth.mfa.locked' })).total).toBe(1);
  });

  test('código de recuperación entra una sola vez y queda auditado', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { recoveryCodes } = await enrollMfa(c, s.user.id);

    const first = await challengeFor(c, 'owner@acme.mx');
    const session = await c.auth.verifyMfa({ mfaToken: first.mfaToken, code: recoveryCodes[0] }, META);
    expect(session.accessToken).toBeTruthy();

    const second = await challengeFor(c, 'owner@acme.mx');
    await expect(
      c.auth.verifyMfa({ mfaToken: second.mfaToken, code: recoveryCodes[0] }, META),
    ).rejects.toMatchObject({ status: 401 });

    expect((await c.audit.query(s.user.companyId, { action: 'auth.mfa.recovery_code_used' })).total).toBe(1);
    const ok = await c.audit.query(s.user.companyId, { action: 'auth.login.succeeded' });
    expect(ok.items[0].metadata).toMatchObject({ method: 'password+recovery' });
  });

  test('un token de enrolamiento no sirve en /auth/mfa/verify', async () => {
    const c = buildTestContainer();
    await registerOwner(c);
    const ch = await challengeFor(c, 'owner@acme.mx');
    expect(ch.mfaEnrollmentRequired).toBe(true);
    await expect(c.auth.verifyMfa({ mfaToken: ch.mfaToken, code: '123456' }, META)).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('Política requireMfaForRoles', () => {
  test('owner sin MFA: login exige enrolamiento y lo completa con el mfaToken', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);

    const ch = await challengeFor(c, 'owner@acme.mx');
    expect(ch.mfaEnrollmentRequired).toBe(true);

    const enroll = await c.auth.challengeEnroll({ mfaToken: ch.mfaToken });
    expect(enroll.secret).toMatch(/^[A-Z2-7]{32}$/);

    const { session, recoveryCodes } = await c.auth.challengeConfirm(
      { mfaToken: ch.mfaToken, code: codeFor(c, enroll.secret) },
      META,
    );
    expect(session.user.id).toBe(s.user.id);
    expect(recoveryCodes).toHaveLength(10);
    expect((await c.mfa.status((await c.users.findById(s.user.id))!)).enabled).toBe(true);
    // el mismo token ya no sirve
    await expect(c.auth.challengeEnroll({ mfaToken: ch.mfaToken })).rejects.toMatchObject({ status: 401 });
  });

  test('challengeConfirm con código erróneo cuenta para el rate-limit', async () => {
    const c = buildTestContainer();
    await registerOwner(c);
    const ch = await challengeFor(c, 'owner@acme.mx');
    await c.auth.challengeEnroll({ mfaToken: ch.mfaToken });
    for (let i = 0; i < 5; i++) {
      await expect(c.auth.challengeConfirm({ mfaToken: ch.mfaToken, code: '000000' }, META)).rejects.toMatchObject({
        status: 401,
      });
    }
    await expect(c.auth.challengeEnroll({ mfaToken: ch.mfaToken })).rejects.toMatchObject({ status: 429 });
  });

  test('dispatcher sin MFA y sin política → sesión directa', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    const r = await c.auth.login({ email: 'disp@acme.mx', password: PASSWORD }, META);
    expect(expectSession(r).user.role).toBe('dispatcher');
  });

  test('si la compañía exige MFA a dispatcher, su login pide enrolamiento', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    const owner = (await c.users.findById(s.user.id))!;
    await c.policies.update(actorOf(owner), { requireMfaForRoles: ['dispatcher'] });

    const ch = await challengeFor(c, 'disp@acme.mx');
    expect(ch.mfaEnrollmentRequired).toBe(true);
  });

  test('usuario con MFA voluntario (no exigido) también pasa por el reto', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    await enrollMfa(c, disp.id);
    const ch = await challengeFor(c, 'disp@acme.mx');
    expect(ch.mfaEnrollmentRequired).toBe(false);
  });
});

describe('Auditoría de login', () => {
  test('contraseña incorrecta → auth.login.failed con compañía, ip y userAgent', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await expect(c.auth.login({ email: 'owner@acme.mx', password: 'mala-contraseña-123' }, META)).rejects.toThrow(
      /credenciales/i,
    );
    const log = await c.audit.query(s.user.companyId, { action: 'auth.login.failed' });
    expect(log.total).toBe(1);
    expect(log.items[0]).toMatchObject({
      ip: META.ip,
      userAgent: META.userAgent,
      actor: { userId: s.user.id },
      metadata: { reason: 'bad_credentials' },
    });
  });

  test('correo inexistente → evento en cadena global sin el correo en claro', async () => {
    const c = buildTestContainer();
    await expect(c.auth.login({ email: 'nadie@nowhere.mx', password: 'whatever-1234567' }, META)).rejects.toThrow(
      /credenciales/i,
    );
    const raw = JSON.stringify(await c.auditRepo.list('__global__'));
    expect(raw).toContain('auth.login.failed');
    expect(raw).not.toContain('nadie@nowhere.mx');
    expect(raw).toContain('emailHash');
  });

  test('login sin MFA exitoso → auth.login.succeeded method=password', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    await c.auth.login({ email: 'disp@acme.mx', password: PASSWORD }, META);
    const log = await c.audit.query(s.user.companyId, { action: 'auth.login.succeeded' });
    expect(log.items[0].metadata).toMatchObject({ method: 'password' });
  });

  test('la cadena de la compañía sigue íntegra tras todo el flujo', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const { mfaToken } = await challengeFor(c, 'owner@acme.mx');
    await c.auth.verifyMfa({ mfaToken, code: '000000' }, META).catch(() => undefined);
    await c.auth.verifyMfa({ mfaToken, code: codeFor(c, secret) }, META);
    expect(await c.audit.verify(s.user.companyId)).toMatchObject({ ok: true });
  });
});
