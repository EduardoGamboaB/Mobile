import { buildTestContainer, codeFor, enrollMfa, META, registerOwner, addUser } from './helpers/container';

describe('MfaService — enrolamiento', () => {
  test('beginEnrollment genera secreto base32 + URI otpauth y deja estado pendiente', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;

    const r = await c.mfa.beginEnrollment(user);

    expect(r.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(r.otpauthUri).toContain(`secret=${r.secret}`);
    expect(r.otpauthUri).toContain('owner%40acme.mx');
    expect(r.issuer).toBe('G3 Admin');
    expect(await c.mfa.status(user)).toMatchObject({ enabled: false, pending: true, requiredByPolicy: true });
  });

  test('el secreto se guarda cifrado (no en claro) en el repo', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;
    const { secret } = await c.mfa.beginEnrollment(user);
    const rec = await c.mfaRepo.find(user.id);
    expect(JSON.stringify(rec)).not.toContain(secret);
  });

  test('confirmar con código incorrecto falla y no activa', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;
    await c.mfa.beginEnrollment(user);
    await expect(c.mfa.confirmEnrollment(user, '000000', META)).rejects.toThrow(/código/i);
    expect((await c.mfa.status(user)).enabled).toBe(false);
  });

  test('confirmar con el primer código activa MFA, devuelve 10 códigos y audita', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;
    const { secret } = await c.mfa.beginEnrollment(user);

    const { recoveryCodes } = await c.mfa.confirmEnrollment(user, codeFor(c, secret), META);

    expect(recoveryCodes).toHaveLength(10);
    expect(await c.mfa.status(user)).toMatchObject({ enabled: true, pending: false, recoveryCodesRemaining: 10 });
    const rec = await c.mfaRepo.find(user.id);
    expect(JSON.stringify(rec)).not.toContain(recoveryCodes[0]);
    const log = await c.audit.query(user.companyId, { action: 'auth.mfa.enrolled' });
    expect(log.total).toBe(1);
    expect(log.items[0]).toMatchObject({ actor: { userId: user.id }, ip: META.ip, userAgent: META.userAgent });
  });

  test('no se puede re-enrolar si ya está activo (409)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    await enrollMfa(c, s.user.id);
    const user = (await c.users.findById(s.user.id))!;
    await expect(c.mfa.beginEnrollment(user)).rejects.toMatchObject({ status: 409 });
  });

  test('confirmar sin enrolamiento pendiente falla', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;
    await expect(c.mfa.confirmEnrollment(user, '123456', META)).rejects.toThrow(/pendiente/i);
  });
});

describe('MfaService — desactivar y regenerar', () => {
  test('desactivar exige un código válido y audita', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    const { secret } = await enrollMfa(c, disp.id);

    await expect(c.mfa.disable(disp, '000000', META)).rejects.toThrow(/código/i);
    expect((await c.mfa.status(disp)).enabled).toBe(true);

    await c.mfa.disable(disp, codeFor(c, secret), META);
    expect((await c.mfa.status(disp)).enabled).toBe(false);
    expect((await c.audit.query(s.user.companyId, { action: 'auth.mfa.disabled' })).total).toBe(1);
  });

  test('desactivar con código de recuperación también vale (perdió el teléfono)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { recoveryCodes } = await enrollMfa(c, s.user.id);
    const user = (await c.users.findById(s.user.id))!;
    await c.mfa.disable(user, recoveryCodes[3], META);
    expect((await c.mfa.status(user)).enabled).toBe(false);
  });

  test('regenerar códigos invalida los anteriores', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret, recoveryCodes: old } = await enrollMfa(c, s.user.id);
    const user = (await c.users.findById(s.user.id))!;

    const { recoveryCodes: fresh } = await c.mfa.regenerateRecoveryCodes(user, codeFor(c, secret), META);

    expect(fresh).toHaveLength(10);
    expect(await c.mfa.verifyCode(user, old[0], META)).toEqual({ ok: false });
    expect(await c.mfa.verifyCode(user, fresh[0], META)).toEqual({ ok: true, method: 'recovery' });
    expect((await c.audit.query(user.companyId, { action: 'auth.mfa.recovery_codes_regenerated' })).total).toBe(1);
  });
});

describe('MfaService.verifyCode', () => {
  test('TOTP con anti-replay: el mismo código no sirve dos veces', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const user = (await c.users.findById(s.user.id))!;
    const code = codeFor(c, secret);
    expect(await c.mfa.verifyCode(user, code, META)).toEqual({ ok: true, method: 'totp' });
    expect(await c.mfa.verifyCode(user, code, META)).toEqual({ ok: false });
  });

  test('código de recuperación es de uso único y se audita', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { recoveryCodes } = await enrollMfa(c, s.user.id);
    const user = (await c.users.findById(s.user.id))!;

    expect(await c.mfa.verifyCode(user, recoveryCodes[0], META)).toEqual({ ok: true, method: 'recovery' });
    expect(await c.mfa.verifyCode(user, recoveryCodes[0], META)).toEqual({ ok: false });
    expect((await c.mfa.status(user)).recoveryCodesRemaining).toBe(9);
    const log = await c.audit.query(user.companyId, { action: 'auth.mfa.recovery_code_used' });
    expect(log.total).toBe(1);
    expect(log.items[0].metadata).toMatchObject({ remaining: 9 });
  });

  test('usuario sin MFA activo → ok:false', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const user = (await c.users.findById(s.user.id))!;
    expect(await c.mfa.verifyCode(user, '123456', META)).toEqual({ ok: false });
  });
});
