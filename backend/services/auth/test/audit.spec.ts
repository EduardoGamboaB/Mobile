import { AuditService, GENESIS_HASH } from '../src/audit/audit.service';
import { InMemoryAuditRepo } from '../src/audit/audit.repo';
import { ManualClock } from '../src/clock';
import type { AuditAction } from '@g3/contracts';

function build() {
  const clock = new ManualClock(Date.parse('2026-10-01T12:00:00Z'));
  const repo = new InMemoryAuditRepo();
  const audit = new AuditService(repo, clock);
  return { clock, repo, audit };
}

const actor = { type: 'user' as const, userId: 'usr_admin', role: 'admin' as const };

async function seed(audit: AuditService, clock: ManualClock, companyId: string, actions: AuditAction[]) {
  for (const action of actions) {
    clock.advance(1000);
    await audit.record({
      companyId,
      actor,
      action,
      resource: { type: 'user', id: 'usr_1' },
      ip: '10.0.0.1',
      userAgent: 'jest',
      metadata: { n: 1 },
    });
  }
}

describe('AuditService — append-only con hash encadenado', () => {
  test('la primera entrada encadena con el génesis y las siguientes con la anterior', async () => {
    const { audit, clock } = build();
    await seed(audit, clock, 'cmp_A', ['auth.login.succeeded', 'auth.mfa.enrolled', 'user.role_changed']);
    const { items } = await audit.query('cmp_A', { pageSize: 10 });
    const asc = [...items].reverse();
    expect(asc.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(asc[0].prevHash).toBe(GENESIS_HASH);
    expect(asc[1].prevHash).toBe(asc[0].hash);
    expect(asc[2].prevHash).toBe(asc[1].hash);
    expect(asc[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('registra actor, compañía, acción, recurso, ip, userAgent, timestamp y metadata', async () => {
    const { audit } = build();
    const e = await audit.record({
      companyId: 'cmp_A',
      actor,
      action: 'security_policy.updated',
      resource: { type: 'security_policy', id: 'cmp_A' },
      ip: '201.1.2.3',
      userAgent: 'Mozilla/5.0',
      metadata: { requireMfaForRoles: ['owner', 'admin', 'dispatcher'] },
    });
    expect(e).toMatchObject({
      companyId: 'cmp_A',
      actor,
      action: 'security_policy.updated',
      resource: { type: 'security_policy', id: 'cmp_A' },
      ip: '201.1.2.3',
      userAgent: 'Mozilla/5.0',
      timestamp: '2026-10-01T12:00:00.000Z',
    });
  });

  test('redacta llaves sensibles en metadata (password, secret, token, code)', async () => {
    const { audit } = build();
    const e = await audit.record({
      companyId: 'cmp_A',
      actor,
      action: 'sso_config.updated',
      resource: { type: 'sso_config', id: 'cmp_A' },
      ip: null,
      userAgent: null,
      metadata: { clientSecret: 'shh', password: 'x', mfaToken: 't', code: '123456', issuer: 'https://accounts.google.com' },
    });
    expect(e.metadata).toEqual({
      clientSecret: '[REDACTED]',
      password: '[REDACTED]',
      mfaToken: '[REDACTED]',
      code: '[REDACTED]',
      issuer: 'https://accounts.google.com',
    });
  });

  test('cadenas independientes por compañía (aislamiento multi-tenant)', async () => {
    const { audit, clock } = build();
    await seed(audit, clock, 'cmp_A', ['auth.login.succeeded', 'auth.login.succeeded']);
    await seed(audit, clock, 'cmp_B', ['auth.login.failed']);
    const a = await audit.query('cmp_A', {});
    const b = await audit.query('cmp_B', {});
    expect(a.total).toBe(2);
    expect(b.total).toBe(1);
    expect(b.items[0].seq).toBe(1);
    expect(b.items.every((e) => e.companyId === 'cmp_B')).toBe(true);
  });

  test('appends concurrentes no rompen la cadena', async () => {
    const { audit } = build();
    await Promise.all(
      Array.from({ length: 20 }, () =>
        audit.record({
          companyId: 'cmp_A',
          actor,
          action: 'auth.login.succeeded',
          resource: { type: 'user', id: 'u' },
          ip: null,
          userAgent: null,
          metadata: {},
        }),
      ),
    );
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: true, entries: 20 });
  });

  test('el repo no expone update ni delete (append-only)', () => {
    const { repo } = build();
    expect((repo as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((repo as unknown as Record<string, unknown>).delete).toBeUndefined();
  });

  test('lecturas devuelven copias: mutar el resultado no altera la bitácora', async () => {
    const { audit, clock } = build();
    await seed(audit, clock, 'cmp_A', ['auth.login.succeeded']);
    const { items } = await audit.query('cmp_A', {});
    items[0].metadata.n = 999;
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: true });
  });
});

describe('AuditService.verify — detección de manipulación', () => {
  async function seeded() {
    const ctx = build();
    await seed(ctx.audit, ctx.clock, 'cmp_A', [
      'auth.login.succeeded',
      'auth.mfa.enrolled',
      'user.role_changed',
      'sso_config.updated',
    ]);
    // acceso "por debajo" del repo, como lo haría alguien con acceso a la DB
    const raw = (ctx.repo as unknown as { chains: Map<string, Array<Record<string, unknown>>> }).chains.get('cmp_A')!;
    return { ...ctx, raw };
  }

  test('cadena íntegra → ok', async () => {
    const { audit } = await seeded();
    expect(await audit.verify('cmp_A')).toEqual({ ok: true, entries: 4, brokenAtSeq: null, reason: null });
  });

  test('editar metadata de una entrada la invalida', async () => {
    const { audit, raw } = await seeded();
    raw[1].metadata = { n: 2 };
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: false, brokenAtSeq: 2 });
  });

  test('recalcular el hash de la entrada editada rompe la siguiente', async () => {
    const { audit, raw } = await seeded();
    raw[1].action = 'auth.login.failed';
    raw[1].hash = AuditService.computeHash(raw[1] as never);
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });

  test('borrar una entrada intermedia se detecta', async () => {
    const { audit, raw } = await seeded();
    raw.splice(1, 1);
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });

  test('reordenar entradas se detecta', async () => {
    const { audit, raw } = await seeded();
    [raw[1], raw[2]] = [raw[2], raw[1]];
    expect((await audit.verify('cmp_A')).ok).toBe(false);
  });

  test('truncar el final se detecta contra el ancla (head) del repo', async () => {
    const { audit, raw } = await seeded();
    raw.pop();
    expect(await audit.verify('cmp_A')).toMatchObject({ ok: false, reason: expect.stringMatching(/trunc/i) });
  });
});

describe('AuditService.query — paginado y filtros', () => {
  test('pagina del más reciente al más antiguo', async () => {
    const { audit, clock } = build();
    await seed(audit, clock, 'cmp_A', Array.from({ length: 7 }, () => 'auth.login.succeeded' as const));
    const p1 = await audit.query('cmp_A', { page: 1, pageSize: 3 });
    const p3 = await audit.query('cmp_A', { page: 3, pageSize: 3 });
    expect(p1).toMatchObject({ page: 1, pageSize: 3, total: 7 });
    expect(p1.items.map((e) => e.seq)).toEqual([7, 6, 5]);
    expect(p3.items.map((e) => e.seq)).toEqual([1]);
  });

  test('pageSize se acota a 200 y page mínimo 1', async () => {
    const { audit } = build();
    const r = await audit.query('cmp_A', { page: -4, pageSize: 10_000 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(200);
  });

  test('filtra por acción, actor, tipo de recurso y rango de fechas', async () => {
    const { audit, clock } = build();
    await seed(audit, clock, 'cmp_A', ['auth.login.succeeded', 'auth.login.failed', 'user.role_changed']);
    await audit.record({
      companyId: 'cmp_A',
      actor: { type: 'user', userId: 'usr_other', role: 'owner' },
      action: 'expense_policy.updated',
      resource: { type: 'expense_policy', id: 'cmp_A' },
      ip: null,
      userAgent: null,
      metadata: {},
    });
    expect((await audit.query('cmp_A', { action: 'auth.login.failed' })).total).toBe(1);
    expect((await audit.query('cmp_A', { actorId: 'usr_other' })).total).toBe(1);
    expect((await audit.query('cmp_A', { resourceType: 'expense_policy' })).total).toBe(1);
    const all = await audit.query('cmp_A', {});
    const second = all.items.find((e) => e.seq === 2)!;
    const r = await audit.query('cmp_A', { from: second.timestamp, to: second.timestamp });
    expect(r.items.map((e) => e.seq)).toEqual([2]);
  });
});
