/**
 * Tests de contrato de los repos de auth: los mismos casos corren contra
 * memoria (siempre) y contra Postgres (con TEST_DATABASE_URL).
 */
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AUDIT_ACTIONS, type SsoConfigDto } from '@g3/contracts';
import { createPool } from '@g3/platform';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import type { AuthRepos } from '../src/container';
import { InMemoryUserRepo, DuplicateUserError, type UserRecord } from '../src/repos/in-memory.user.repo';
import { InMemoryCompanyRepo } from '../src/repos/in-memory.company.repo';
import { InMemoryAuditRepo } from '../src/audit/audit.repo';
import { AuditService } from '../src/audit/audit.service';
import { InMemorySecurityPolicyRepo } from '../src/security/security-policy';
import { InMemoryMfaRepo } from '../src/mfa/mfa.repo';
import { InMemorySsoConfigRepo } from '../src/sso/sso.repos';
import { PgAuditRepo } from '../src/audit/pg.audit.repo';
import { PgCompanyRepo, PgUserRepo } from '../src/repos/pg.user.repo';
import { PgMfaRepo, PgSecurityPolicyRepo, PgSsoConfigRepo } from '../src/repos/pg.security.repos';
import { ManualClock } from '../src/clock';
import { buildTestContainer, codeFor, enrollMfa, expectSession, META, PASSWORD } from './helpers/container';

const MIGRATIONS = path.join(__dirname, '../migrations');
const uid = () => randomUUID().slice(0, 8);

function memoryRepos(): AuthRepos {
  return {
    users: new InMemoryUserRepo(),
    companies: new InMemoryCompanyRepo(),
    audit: new InMemoryAuditRepo(),
    policies: new InMemorySecurityPolicyRepo(),
    mfa: new InMemoryMfaRepo(),
    ssoConfigs: new InMemorySsoConfigRepo(),
  };
}

function contract(name: string, make: () => AuthRepos) {
  describe(`auth repos · ${name}`, () => {
    let r: AuthRepos;
    let cmpA: string;
    let cmpB: string;

    async function company(id: string) {
      return r.companies.create({
        id,
        name: `Transportes ${id}`,
        rfc: null,
        contactEmail: `contacto-${id}@acme.mx`,
        contactPhone: null,
        createdAt: '2026-10-01T12:00:00.000Z',
      });
    }

    function user(companyId: string, over: Partial<UserRecord> = {}): UserRecord {
      return {
        id: randomUUID(),
        email: `u-${uid()}@acme.mx`,
        passwordHash: '$2a$04$hash',
        fullName: 'Usuario',
        role: 'dispatcher',
        companyId,
        tier: 'free',
        createdAt: '2026-10-01T12:00:00.000Z',
        phone: null,
        driverId: null,
        ...over,
      };
    }

    beforeEach(async () => {
      r = make();
      cmpA = `cmp_${uid()}`;
      cmpB = `cmp_${uid()}`;
      await company(cmpA);
      await company(cmpB);
    });

    // ─────────────────────────── usuarios y compañías ───────────────────────────

    test('company: create + findById', async () => {
      expect(await r.companies.findById(cmpA)).toMatchObject({ id: cmpA, name: `Transportes ${cmpA}`, rfc: null });
      expect(await r.companies.findById('no-existe')).toBeNull();
    });

    test('user: roundtrip completo y búsqueda de correo sin distinguir mayúsculas', async () => {
      const u = user(cmpA, { email: `Pedro.${uid()}@Acme.MX`, phone: `+52155${Date.now() % 1e8}`.padEnd(14, '0'), role: 'driver', driverId: 'drv_1' });
      expect(await r.users.create(u)).toEqual(u);
      expect(await r.users.findById(u.id)).toEqual(u);
      expect((await r.users.findByEmail(u.email.toLowerCase()))?.id).toBe(u.id);
      expect((await r.users.findByPhone(u.phone!))?.id).toBe(u.id);
    });

    test('aislamiento: findByCompanyId y updateTierForCompany solo tocan su compañía', async () => {
      const a = await r.users.create(user(cmpA));
      const b = await r.users.create(user(cmpB));
      expect((await r.users.findByCompanyId(cmpA)).map((x) => x.id)).toEqual([a.id]);
      await r.users.updateTierForCompany(cmpA, 'pro');
      expect((await r.users.findById(a.id))?.tier).toBe('pro');
      expect((await r.users.findById(b.id))?.tier).toBe('free');
    });

    test('correo duplicado (aun con otra capitalización y otra compañía) → 409 de dominio', async () => {
      const email = `dup-${uid()}@acme.mx`;
      await r.users.create(user(cmpA, { email }));
      const err = await r.users.create(user(cmpB, { email: email.toUpperCase() })).catch((e) => e);
      expect(err).toBeInstanceOf(DuplicateUserError);
      expect(err).toMatchObject({ status: 409, field: 'email', message: 'Ese correo ya existe en G3' });
    });

    test('teléfono duplicado → 409; driverId duplicado en la compañía → 409', async () => {
      const phone = `+5215${Math.floor(1e9 + Math.random() * 8e9)}`;
      await r.users.create(user(cmpA, { phone, role: 'driver', driverId: 'drv_x' }));
      await expect(r.users.create(user(cmpB, { phone }))).rejects.toMatchObject({ status: 409, field: 'phone' });
      await expect(r.users.create(user(cmpA, { role: 'driver', driverId: 'drv_x' }))).rejects.toMatchObject({
        status: 409,
        field: 'driverId',
      });
      // El mismo driverId en otra compañía sí se permite.
      await expect(r.users.create(user(cmpB, { role: 'driver', driverId: 'drv_x' }))).resolves.toBeTruthy();
    });

    test('updateRole / updatePassword', async () => {
      const u = await r.users.create(user(cmpA));
      expect((await r.users.updateRole(u.id, 'admin'))?.role).toBe('admin');
      expect(await r.users.updateRole('no-existe', 'admin')).toBeNull();
      await r.users.updatePassword(u.id, 'nuevo-hash');
      expect((await r.users.findById(u.id))?.passwordHash).toBe('nuevo-hash');
    });

    // ───────────────────────────────── auditoría ─────────────────────────────────

    test('auditoría: 20 anexos en paralelo → cadena continua e íntegra', async () => {
      const audit = new AuditService(r.audit, new ManualClock(Date.parse('2026-10-01T12:00:00Z')));
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          audit.record({
            companyId: cmpA,
            actor: { type: 'user', userId: `usr_${i}`, role: 'admin' },
            action: 'user.role_changed',
            resource: { type: 'user', id: `usr_${i}` },
            ip: '10.0.0.1',
            userAgent: 'jest',
            metadata: { i, nested: { b: 2, a: [1, 'x', null] } },
          }),
        ),
      );
      const v = await audit.verify(cmpA);
      expect(v).toEqual({ ok: true, entries: 20, brokenAtSeq: null, reason: null });
      expect((await r.audit.list(cmpA)).map((e) => e.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      expect(await r.audit.head(cmpA)).toMatchObject({ seq: 20 });
      // Otra compañía tiene su propia cadena.
      expect(await audit.verify(cmpB)).toMatchObject({ ok: true, entries: 0 });
    });

    test('auditoría: cadena global (sin compañía) y aislamiento de consultas', async () => {
      const audit = new AuditService(r.audit, new ManualClock(Date.parse('2026-10-01T12:00:00Z')));
      await audit.record({
        companyId: null,
        actor: { type: 'anonymous', userId: null, role: null },
        action: 'auth.login.failed',
        resource: { type: 'user', id: null },
        ip: null,
        userAgent: null,
        metadata: { emailHash: 'abc' },
      });
      await audit.record({
        companyId: cmpA,
        actor: { type: 'system', userId: null, role: null },
        action: 'user.provisioned_jit',
        resource: { type: 'user', id: 'u1' },
        ip: null,
        userAgent: null,
      });
      expect((await r.audit.list('__global__')).length).toBeGreaterThanOrEqual(1);
      expect((await audit.query(cmpB, {})).total).toBe(0);
      expect((await audit.query(cmpA, {})).items.map((e) => e.action)).toEqual(['user.provisioned_jit']);
    });

    test('auditoría: filtros y paginación (más nuevo primero)', async () => {
      const clock = new ManualClock(Date.parse('2026-10-01T12:00:00Z'));
      const audit = new AuditService(r.audit, clock);
      const actions = ['auth.login.succeeded', 'user.role_changed', 'auth.login.succeeded', 'sso_config.updated'] as const;
      for (const [i, action] of actions.entries()) {
        await audit.record({
          companyId: cmpA,
          actor: { type: 'user', userId: i % 2 ? 'usr_b' : 'usr_a', role: 'owner' },
          action,
          resource: { type: action.startsWith('sso') ? 'sso_config' : 'user', id: null },
          ip: null,
          userAgent: null,
        });
        clock.advance(60_000);
      }
      const all = await audit.query(cmpA, { pageSize: 2, page: 2 });
      expect(all).toMatchObject({ total: 4, page: 2, pageSize: 2 });
      expect(all.items.map((e) => e.seq)).toEqual([2, 1]);
      expect((await audit.query(cmpA, { action: 'auth.login.succeeded' })).items.map((e) => e.seq)).toEqual([3, 1]);
      expect((await audit.query(cmpA, { actorId: 'usr_b' })).total).toBe(2);
      expect((await audit.query(cmpA, { resourceType: 'sso_config' })).total).toBe(1);
      const from = new Date(Date.parse('2026-10-01T12:01:00Z')).toISOString();
      const to = new Date(Date.parse('2026-10-01T12:02:00Z')).toISOString();
      expect((await audit.query(cmpA, { from, to })).items.map((e) => e.seq)).toEqual([3, 2]);
      expect((await audit.query(cmpA, { from: 'no-es-fecha' })).total).toBe(4);
    });

    // ─────────────────────────────────── MFA ───────────────────────────────────

    test('mfa: roundtrip, anti-replay atómico y códigos de recuperación de un solo uso', async () => {
      const u = await r.users.create(user(cmpA));
      const hashes = Array.from({ length: 3 }, (_, i) => `${i}`.repeat(64));
      await r.mfa.save({
        userId: u.id,
        secretEnc: 'iv:tag:ct',
        status: 'pending',
        createdAt: '2026-10-01T12:00:00.000Z',
        enabledAt: null,
        lastUsedStep: null,
        recoveryCodes: [],
      });
      expect(await r.mfa.advanceStep(u.id, 10)).toBe(false); // pending: no aplica
      const enabled = {
        userId: u.id,
        secretEnc: 'iv:tag:ct',
        status: 'enabled' as const,
        createdAt: '2026-10-01T12:00:00.000Z',
        enabledAt: '2026-10-01T12:01:00.000Z',
        lastUsedStep: 5,
        recoveryCodes: hashes.map((hash) => ({ hash, usedAt: null })),
      };
      await r.mfa.save(enabled);
      expect(await r.mfa.find(u.id)).toEqual(enabled);

      const steps = await Promise.all([r.mfa.advanceStep(u.id, 6), r.mfa.advanceStep(u.id, 6), r.mfa.advanceStep(u.id, 6)]);
      expect(steps.filter(Boolean)).toHaveLength(1);
      expect(await r.mfa.advanceStep(u.id, 6)).toBe(false);
      expect(await r.mfa.advanceStep(u.id, 4)).toBe(false);

      const used = await Promise.all(
        Array.from({ length: 4 }, () => r.mfa.markRecoveryCodeUsed(u.id, hashes[1], '2026-10-01T12:05:00.000Z')),
      );
      expect(used.filter(Boolean)).toHaveLength(1);
      const after = await r.mfa.find(u.id);
      expect(after?.lastUsedStep).toBe(6);
      expect(after?.recoveryCodes.map((c) => c.usedAt)).toEqual([null, '2026-10-01T12:05:00.000Z', null]);

      await r.mfa.delete(u.id);
      expect(await r.mfa.find(u.id)).toBeNull();
    });

    // ──────────────────────────── política y SSO ────────────────────────────

    test('política de seguridad por compañía', async () => {
      await r.policies.save({ companyId: cmpA, requireMfaForRoles: ['owner', 'admin', 'dispatcher'], updatedAt: '2026-10-01T12:00:00.000Z' });
      expect(await r.policies.find(cmpA)).toEqual({
        companyId: cmpA,
        requireMfaForRoles: ['owner', 'admin', 'dispatcher'],
        updatedAt: '2026-10-01T12:00:00.000Z',
      });
      expect(await r.policies.find(cmpB)).toBeNull();
    });

    test('SSO: roundtrip, búsqueda por dominio y dominio de otra compañía → 409', async () => {
      const dom = `acme-${uid()}.mx`;
      const cfg: SsoConfigDto = {
        companyId: cmpA,
        provider: 'google',
        enabled: true,
        issuer: 'https://accounts.google.com',
        clientId: 'client-1',
        clientSecretRef: 'env:OIDC_SECRET',
        allowedDomains: [dom, `b-${dom}`],
        jitProvisioning: true,
        updatedAt: '2026-10-01T12:00:00.000Z',
      };
      await r.ssoConfigs.save(cfg);
      expect(await r.ssoConfigs.findByCompany(cmpA)).toEqual(cfg);
      expect((await r.ssoConfigs.findByDomain(dom.toUpperCase()))?.companyId).toBe(cmpA);
      await expect(r.ssoConfigs.save({ ...cfg, companyId: cmpB, allowedDomains: [dom] })).rejects.toMatchObject({
        status: 409,
      });
      // La misma compañía puede reemplazar sus dominios.
      await r.ssoConfigs.save({ ...cfg, allowedDomains: [`c-${dom}`] });
      expect(await r.ssoConfigs.findByDomain(dom)).toBeNull();
    });

    // ─────────────────────── flujo completo sobre los repos ───────────────────────

    test('registro → MFA → login con TOTP; el replay del código falla', async () => {
      const c = buildTestContainer({ repos: r });
      const email = `owner-${uid()}@acme.mx`;
      const owner = await c.auth.registerCompany({ companyName: 'Acme', contactEmail: email, ownerName: 'Pedro', password: PASSWORD });
      const { secret } = await enrollMfa(c, owner.user.id);
      const ch = await c.auth.login({ email, password: PASSWORD }, META);
      if (!('mfaToken' in ch)) throw new Error('se esperaba reto MFA');
      const code = codeFor(c, secret);
      expectSession(await c.auth.verifyMfa({ mfaToken: ch.mfaToken, code }, META));
      const ch2 = await c.auth.login({ email, password: PASSWORD }, META);
      if (!('mfaToken' in ch2)) throw new Error('se esperaba reto MFA');
      await expect(c.auth.verifyMfa({ mfaToken: ch2.mfaToken, code }, META)).rejects.toMatchObject({ status: 401 });
      expect(await c.audit.verify(owner.user.companyId)).toMatchObject({ ok: true });
      await expect(
        c.auth.registerCompany({ companyName: 'Otra', contactEmail: email.toUpperCase(), ownerName: 'X', password: PASSWORD }),
      ).rejects.toThrow(/correo ya existe/);
    });
  });
}

contract('memoria', memoryRepos);

describeIfDb('Postgres', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let repos: () => AuthRepos;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'auth');
    const pool = db!.pool;
    repos = () => ({
      users: new PgUserRepo(pool),
      companies: new PgCompanyRepo(pool),
      audit: new PgAuditRepo(pool),
      policies: new PgSecurityPolicyRepo(pool),
      mfa: new PgMfaRepo(pool),
      ssoConfigs: new PgSsoConfigRepo(pool),
    });
  });
  afterAll(async () => {
    await db?.drop();
  });

  contract('postgres', () => repos());

  async function seedCompany() {
    const id = `cmp_${uid()}`;
    await new PgCompanyRepo(db!.pool).create({
      id,
      name: 'Acme',
      rfc: null,
      contactEmail: 'c@acme.mx',
      contactPhone: null,
      createdAt: '2026-10-01T12:00:00.000Z',
    });
    return id;
  }

  test('auditoría: dos "réplicas" (pools distintos) anexando en paralelo mantienen la cadena', async () => {
    const companyId = await seedCompany();
    const other = createPool({ connectionString: process.env.TEST_DATABASE_URL, schema: db!.schema, max: 4 });
    try {
      const clock = new ManualClock(Date.parse('2026-10-01T12:00:00Z'));
      const a = new AuditService(new PgAuditRepo(db!.pool), clock);
      const b = new AuditService(new PgAuditRepo(other), clock);
      await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          (i % 2 ? a : b).record({
            companyId,
            actor: { type: 'system', userId: null, role: null },
            action: 'integration.updated',
            resource: { type: 'integration', id: String(i) },
            ip: null,
            userAgent: null,
          }),
        ),
      );
      expect(await a.verify(companyId)).toEqual({ ok: true, entries: 30, brokenAtSeq: null, reason: null });
    } finally {
      await other.end();
    }
  });

  test('audit_log es append-only: el trigger rechaza UPDATE, DELETE y TRUNCATE', async () => {
    const companyId = await seedCompany();
    const audit = new AuditService(new PgAuditRepo(db!.pool), new ManualClock(Date.now()));
    const e = await audit.record({
      companyId,
      actor: { type: 'system', userId: null, role: null },
      action: 'security_policy.updated',
      resource: { type: 'security_policy', id: companyId },
      ip: null,
      userAgent: null,
    });
    await expect(db!.pool.query(`UPDATE audit_log SET metadata = '{"x":1}' WHERE id = $1`, [e.id])).rejects.toMatchObject({
      code: '42501',
    });
    await expect(db!.pool.query(`DELETE FROM audit_log WHERE id = $1`, [e.id])).rejects.toMatchObject({ code: '42501' });
    await expect(db!.pool.query(`TRUNCATE audit_log CASCADE`)).rejects.toMatchObject({ code: '42501' });
    // La cabeza no se borra ni retrocede.
    await expect(db!.pool.query(`DELETE FROM audit_chain_heads WHERE chain_key = $1`, [companyId])).rejects.toMatchObject({
      code: '42501',
    });
    await expect(db!.pool.query(`UPDATE audit_chain_heads SET seq = 0 WHERE chain_key = $1`, [companyId])).rejects.toMatchObject({
      code: '42501',
    });
    expect(await audit.verify(companyId)).toMatchObject({ ok: true, entries: 1 });
  });

  test('el CHECK de action acepta exactamente AUDIT_ACTIONS de @g3/contracts', async () => {
    const companyId = await seedCompany();
    const audit = new AuditService(new PgAuditRepo(db!.pool), new ManualClock(Date.now()));
    for (const action of AUDIT_ACTIONS) {
      await audit.record({
        companyId,
        actor: { type: 'system', userId: null, role: null },
        action,
        resource: { type: 'x', id: null },
        ip: null,
        userAgent: null,
      });
    }
    await expect(
      audit.record({
        companyId,
        actor: { type: 'system', userId: null, role: null },
        action: 'auth.inventada' as never,
        resource: { type: 'x', id: null },
        ip: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ code: '23514' });
    expect(await audit.verify(companyId)).toMatchObject({ ok: true, entries: AUDIT_ACTIONS.length });
  });

  test('metadata con NUL y llaves en otro orden: el hash sigue verificando tras pasar por jsonb', async () => {
    const companyId = await seedCompany();
    const audit = new AuditService(new PgAuditRepo(db!.pool), new ManualClock(Date.now()));
    await audit.record({
      companyId,
      actor: { type: 'system', userId: null, role: null },
      action: 'integration.tested',
      resource: { type: 'integration', id: null },
      ip: null,
      userAgent: 'agente\u0000raro',
      metadata: { z: 1, a: { y: 'x\u0000y', b: [3, 2, 1] }, n: 1.5, t: true },
    });
    expect(await audit.verify(companyId)).toMatchObject({ ok: true });
  });

  test('usuario de una compañía inexistente → 400 (FK), no 500', async () => {
    await expect(
      new PgUserRepo(db!.pool).create({
        id: randomUUID(),
        email: `x-${uid()}@acme.mx`,
        passwordHash: 'h',
        fullName: 'x',
        role: 'viewer',
        companyId: 'no-existe',
        tier: 'free',
        createdAt: '2026-10-01T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
