import { actorOf, addUser, buildTestContainer, registerOwner } from './helpers/container';

describe('SecurityPolicyService', () => {
  test('default: owner y admin requieren MFA', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const p = await c.policies.get(s.user.companyId);
    expect(p.requireMfaForRoles.sort()).toEqual(['admin', 'owner']);
    expect(await c.policies.requiresMfa(s.user.companyId, 'owner')).toBe(true);
    expect(await c.policies.requiresMfa(s.user.companyId, 'dispatcher')).toBe(false);
  });

  test('update agrega roles pero nunca quita owner/admin, y audita antes/después', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const owner = (await c.users.findById(s.user.id))!;
    const p = await c.policies.update(actorOf(owner), { requireMfaForRoles: ['dispatcher'] });
    expect(p.requireMfaForRoles.sort()).toEqual(['admin', 'dispatcher', 'owner']);

    const log = await c.audit.query(s.user.companyId, { action: 'security_policy.updated' });
    expect(log.items[0].metadata).toMatchObject({
      before: { requireMfaForRoles: ['owner', 'admin'] },
      after: { requireMfaForRoles: ['owner', 'admin', 'dispatcher'] },
    });
  });

  test('rechaza roles inválidos (400)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const owner = (await c.users.findById(s.user.id))!;
    await expect(
      c.policies.update(actorOf(owner), { requireMfaForRoles: ['superuser' as never] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('solo owner/admin pueden cambiarla (403)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    await expect(c.policies.update(actorOf(disp), { requireMfaForRoles: [] })).rejects.toMatchObject({ status: 403 });
  });
});

describe('AuthService.changeUserRole', () => {
  test('owner promueve a un dispatcher a admin y queda auditado', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const owner = (await c.users.findById(s.user.id))!;
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');

    const updated = await c.auth.changeUserRole(actorOf(owner), disp.id, 'admin');

    expect(updated.role).toBe('admin');
    expect((await c.users.findById(disp.id))!.role).toBe('admin');
    const log = await c.audit.query(s.user.companyId, { action: 'user.role_changed' });
    expect(log.items[0]).toMatchObject({
      actor: { userId: owner.id, role: 'owner' },
      resource: { type: 'user', id: disp.id },
      metadata: { from: 'dispatcher', to: 'admin' },
    });
  });

  test('dispatcher no puede cambiar roles (403)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const disp = await addUser(c, s.user.companyId, 'disp@acme.mx', 'dispatcher');
    const viewer = await addUser(c, s.user.companyId, 'v@acme.mx', 'viewer');
    await expect(c.auth.changeUserRole(actorOf(disp), viewer.id, 'admin')).rejects.toMatchObject({ status: 403 });
  });

  test('admin no puede crear owners ni tocar a un owner (403)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const admin = await addUser(c, s.user.companyId, 'adm@acme.mx', 'admin');
    const viewer = await addUser(c, s.user.companyId, 'v@acme.mx', 'viewer');
    await expect(c.auth.changeUserRole(actorOf(admin), viewer.id, 'owner')).rejects.toMatchObject({ status: 403 });
    await expect(c.auth.changeUserRole(actorOf(admin), s.user.id, 'viewer')).rejects.toMatchObject({ status: 403 });
  });

  test('usuario de otra compañía → 404 (no confirma existencia)', async () => {
    const c = buildTestContainer();
    const a = await registerOwner(c, 'a@a.mx');
    const b = await registerOwner(c, 'b@b.mx');
    const ownerA = (await c.users.findById(a.user.id))!;
    await expect(c.auth.changeUserRole(actorOf(ownerA), b.user.id, 'viewer')).rejects.toMatchObject({ status: 404 });
  });

  test('no se puede degradar al último owner (409)', async () => {
    const c = buildTestContainer();
    const s = await registerOwner(c);
    const owner = (await c.users.findById(s.user.id))!;
    await expect(c.auth.changeUserRole(actorOf(owner), owner.id, 'admin')).rejects.toMatchObject({ status: 409 });
  });
});
