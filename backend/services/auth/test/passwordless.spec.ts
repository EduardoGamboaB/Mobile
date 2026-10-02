import * as jwt from 'jsonwebtoken';
import { buildTestContainer, registerOwner, META, PASSWORD } from './helpers/container';
import { normalizePhone, type RecordingEmailSender, type RecordingSmsSender } from '../src/passwordless/passwordless.service';
import type { ActorContext } from '../src/security/actor';

async function setup() {
  const c = buildTestContainer();
  const owner = await registerOwner(c);
  const actor: ActorContext = { userId: owner.user.id, companyId: owner.user.companyId, role: 'owner', ...META };
  const sms = c.sms as RecordingSmsSender;
  const email = c.email as RecordingEmailSender;
  const lastCode = () => sms.sent.at(-1)!.body.match(/\b(\d{6})\b/)![1];
  return { c, owner, actor, sms, email, lastCode };
}

describe('Acceso de choferes a G3 Drive (OTP por SMS)', () => {
  test('alta → código por SMS → sesión con claim driverId', async () => {
    const { c, actor, sms, lastCode } = await setup();
    await c.passwordless.grantDriverAccess(actor, { driverId: 'drv_1', phone: '+52 1 55 1234 5678', fullName: 'Juan Pérez' });
    await c.passwordless.requestOtp('+5215512345678', META);
    expect(sms.sent[0].to).toBe('+5215512345678');
    // El proveedor de SMS se resuelve por la compañía del chofer.
    expect(sms.sent[0].companyId).toBe(actor.companyId);

    const session = await c.passwordless.verifyOtp('+5215512345678', lastCode(), META);
    expect(session.user).toMatchObject({ role: 'driver', driverId: 'drv_1', companyId: actor.companyId });
    const claims = jwt.decode(session.accessToken) as Record<string, unknown>;
    expect(claims.driverId).toBe('drv_1');

    // El refresh conserva la claim.
    const refreshed = await c.auth.refresh({ refreshToken: session.refreshToken });
    expect((jwt.decode(refreshed.accessToken) as Record<string, unknown>).driverId).toBe('drv_1');
  });

  test('el código es de un solo uso', async () => {
    const { c, actor, lastCode } = await setup();
    await c.passwordless.grantDriverAccess(actor, { driverId: 'drv_1', phone: '+5215512345678', fullName: 'Juan' });
    await c.passwordless.requestOtp('+5215512345678');
    const code = lastCode();
    await c.passwordless.verifyOtp('+5215512345678', code);
    await expect(c.passwordless.verifyOtp('+5215512345678', code)).rejects.toMatchObject({ status: 401 });
  });

  test('teléfono desconocido: misma respuesta y no se envía SMS (sin enumeración)', async () => {
    const { c, sms } = await setup();
    expect(await c.passwordless.requestOtp('+5215599999999')).toEqual({ accepted: true });
    expect(sms.sent).toHaveLength(0);
  });

  test('vence a los 5 min y se bloquea tras 5 intentos', async () => {
    const { c, actor, lastCode } = await setup();
    await c.passwordless.grantDriverAccess(actor, { driverId: 'drv_1', phone: '+5215512345678', fullName: 'Juan' });
    await c.passwordless.requestOtp('+5215512345678');
    c.clock.advance(5 * 60_000 + 1);
    await expect(c.passwordless.verifyOtp('+5215512345678', lastCode())).rejects.toMatchObject({ status: 401 });

    await c.passwordless.requestOtp('+5215512345678');
    const good = lastCode();
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await expect(c.passwordless.verifyOtp('+5215512345678', bad)).rejects.toMatchObject({ status: 401 });
    }
    await expect(c.passwordless.verifyOtp('+5215512345678', good)).rejects.toMatchObject({ status: 401 });
    const fails = (await c.audit.query(actor.companyId, { action: 'auth.otp.failed' })).items;
    expect(fails.length).toBe(5);
  });

  test('límite de 3 códigos cada 15 min por teléfono', async () => {
    const { c } = await setup();
    for (let i = 0; i < 3; i++) await c.passwordless.requestOtp('+5215511111111');
    await expect(c.passwordless.requestOtp('+5215511111111')).rejects.toMatchObject({ status: 429 });
    c.clock.advance(15 * 60_000 + 1);
    await expect(c.passwordless.requestOtp('+5215511111111')).resolves.toEqual({ accepted: true });
  });

  test('solo owner/admin dan acceso; teléfono duplicado → 409; formato E.164', async () => {
    const { c, actor } = await setup();
    await expect(
      c.passwordless.grantDriverAccess({ ...actor, role: 'dispatcher' }, { driverId: 'd', phone: '+5215512345678', fullName: 'x' }),
    ).rejects.toMatchObject({ status: 403 });
    await c.passwordless.grantDriverAccess(actor, { driverId: 'd1', phone: '+5215512345678', fullName: 'x' });
    await expect(
      c.passwordless.grantDriverAccess(actor, { driverId: 'd2', phone: '+5215512345678', fullName: 'y' }),
    ).rejects.toMatchObject({ status: 409 });
    expect(() => normalizePhone('5512345678')).toThrow(/internacional/);
  });
});

describe('Recuperación de contraseña', () => {
  test('enlace de un solo uso: cambia la contraseña y el login usa la nueva', async () => {
    const { c, owner, email } = await setup();
    await c.passwordless.requestPasswordReset(owner.user.email, META);
    expect(email.sent[0].companyId).toBe(owner.user.companyId);
    const token = email.sent[0].body.match(/token=([A-Za-z0-9_-]+)/)![1];
    await expect(c.passwordless.resetPassword(token, 'corta')).rejects.toMatchObject({ status: 400 });
    // El intento fallido por contraseña corta no consume el token.
    await c.passwordless.resetPassword(token, 'una-nueva-contraseña-larga');
    await expect(c.passwordless.resetPassword(token, 'otra-contraseña-larga!!')).rejects.toMatchObject({ status: 400 });

    await expect(c.auth.login({ email: owner.user.email, password: PASSWORD })).rejects.toMatchObject({ status: 401 });
    const ok = await c.auth.login({ email: owner.user.email, password: 'una-nueva-contraseña-larga' });
    expect(ok).toBeTruthy();
    const actions = (await c.audit.query(owner.user.companyId, {})).items.map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['auth.password_reset.requested', 'auth.password_reset.completed']));
  });

  test('correo desconocido: misma respuesta, sin correo enviado', async () => {
    const { c, email } = await setup();
    expect(await c.passwordless.requestPasswordReset('nadie@x.mx')).toEqual({ accepted: true });
    expect(email.sent).toHaveLength(0);
  });

  test('el enlace vence a los 30 min', async () => {
    const { c, owner, email } = await setup();
    await c.passwordless.requestPasswordReset(owner.user.email);
    const token = email.sent[0].body.match(/token=([A-Za-z0-9_-]+)/)![1];
    c.clock.advance(30 * 60_000 + 1);
    await expect(c.passwordless.resetPassword(token, 'una-nueva-contraseña-larga')).rejects.toMatchObject({ status: 400 });
  });
});
