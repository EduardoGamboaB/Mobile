import { HttpException } from '@nestjs/common';
import { isMfaChallenge } from '@g3/contracts';
import { AuthController } from '../src/auth.controller';
import { AuditController, MfaController, SecurityPolicyController, UsersController } from '../src/security.controllers';
import { addUser, buildTestContainer, codeFor, enrollMfa, PASSWORD, registerOwner } from './helpers/container';

function req(headers: Record<string, string> = {}, ip = '10.1.1.1') {
  return { headers: { 'user-agent': 'Mozilla/5.0 (test)', ...headers }, ip };
}
function asUser(u: { id: string; companyId: string; role: string }, extra: Record<string, string> = {}) {
  return req({ 'x-user-id': u.id, 'x-company-id': u.companyId, 'x-user-role': u.role, ...extra });
}
async function status(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    if (e instanceof HttpException) return e.getStatus();
    throw e;
  }
}

describe('AuthController — login MFA por HTTP', () => {
  test('login → mfaRequired; verify → sesión; ip/userAgent llegan a la bitácora', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const { secret } = await enrollMfa(c, s.user.id);
    const ctl = new AuthController(c);

    const r = await ctl.login({ email: 'owner@acme.mx', password: PASSWORD }, req({ 'x-client-ip': '201.5.5.5' }));
    expect(isMfaChallenge(r)).toBe(true);
    if (!isMfaChallenge(r)) return;
    const session = await ctl.mfaVerify({ mfaToken: r.mfaToken, code: codeFor(c, secret) }, req({ 'x-client-ip': '201.5.5.5' }));
    expect(session.accessToken).toBeTruthy();

    const log = await c.audit.query(s.user.companyId, { action: 'auth.login.succeeded' });
    expect(log.items[0]).toMatchObject({ ip: '201.5.5.5', userAgent: 'Mozilla/5.0 (test)' });
  });

  test('credenciales malas → 401 (no 500)', async () => {
    const c = buildTestContainer();
    await registerOwner(c);
    expect(await status(new AuthController(c).login({ email: 'owner@acme.mx', password: 'nope-nope-nope' }, req()))).toBe(401);
  });

  test('mfa/verify con token basura → 401', async () => {
    const c = buildTestContainer();
    expect(await status(new AuthController(c).mfaVerify({ mfaToken: 'x', code: '123456' }, req()))).toBe(401);
  });
});

describe('MfaController — requiere identidad del gateway', () => {
  test('sin headers x-user-* → 401', async () => {
    const c = buildTestContainer();
    expect(await status(new MfaController(c).status(req()))).toBe(401);
  });

  test('enroll → confirm → status enabled', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const ctl = new MfaController(c);
    const r = asUser(s.user);
    const { secret } = await ctl.enroll(r);
    const { recoveryCodes } = await ctl.confirm({ code: codeFor(c, secret) }, r);
    expect(recoveryCodes).toHaveLength(10);
    expect((await ctl.status(r)).enabled).toBe(true);
  });

  test('headers con usuario de otra compañía no le sirven a un atacante', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const forged = asUser({ id: s.user.id, companyId: 'cmp_falsa', role: 'owner' });
    expect(await status(new MfaController(c).status(forged))).toBe(401);
  });
});

describe('AuditController — solo admin', () => {
  test('owner consulta paginado y filtrado; dispatcher → 403', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    await c.auth.login({ email: 'disp@acme.mx', password: PASSWORD });
    const ctl = new AuditController(c);

    const page = await ctl.list({ page: '1', pageSize: '10', action: 'auth.login.succeeded' }, asUser(s.user));
    expect(page.total).toBe(1);
    expect(await status(ctl.list({}, asUser(disp)))).toBe(403);
    expect(await status(ctl.verify(asUser(disp)))).toBe(403);
    expect((await ctl.verify(asUser(s.user))).ok).toBe(true);
  });

  test('acción de filtro inválida → 400', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    expect(await status(new AuditController(c).list({ action: 'drop table' }, asUser(s.user)))).toBe(400);
  });

  test('ingesta interna (expense_policy.updated) exige token de servicio', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const ctl = new AuditController(c, 'internal-token-de-prueba-32-chars!!');
    const body = {
      companyId: s.user.companyId,
      actor: { type: 'user' as const, userId: s.user.id, role: 'owner' as const },
      action: 'expense_policy.updated' as const,
      resource: { type: 'expense_policy', id: s.user.companyId },
      ip: '1.2.3.4',
      userAgent: 'trips-service',
      metadata: { before: { manualMaxAmount: 300 }, after: { manualMaxAmount: 500 } },
    };
    expect(await status(ctl.ingest(body, req()))).toBe(401);
    expect(await status(ctl.ingest(body, req({ 'x-internal-token': 'otro' })))).toBe(401);
    expect(
      await status(ctl.ingest({ ...body, action: 'auth.login.succeeded' as never }, req({ 'x-internal-token': 'internal-token-de-prueba-32-chars!!' }))),
    ).toBe(400);
    await ctl.ingest(body, req({ 'x-internal-token': 'internal-token-de-prueba-32-chars!!' }));
    expect((await c.audit.query(s.user.companyId, { action: 'expense_policy.updated' })).total).toBe(1);
  });

  test('sin token interno configurado la ingesta está deshabilitada', async () => {
    const c = buildTestContainer();
    expect(await status(new AuditController(c).ingest({} as never, req({ 'x-internal-token': '' })))).toBe(401);
  });
});

describe('SecurityPolicyController y UsersController', () => {
  test('owner exige MFA a dispatcher y cambia un rol', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    const pol = await new SecurityPolicyController(c).update({ requireMfaForRoles: ['dispatcher'] }, asUser(s.user));
    expect(pol.requireMfaForRoles).toContain('dispatcher');
    const u = await new UsersController(c).changeRole(disp.id, { role: 'admin' }, asUser(s.user));
    expect(u.role).toBe('admin');
    expect((u as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  test('dispatcher no puede cambiar la política (403)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    expect(await status(new SecurityPolicyController(c).update({ requireMfaForRoles: [] }, asUser(disp)))).toBe(403);
  });
});
