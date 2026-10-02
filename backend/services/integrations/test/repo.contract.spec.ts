import * as path from 'path';
import { randomUUID } from 'crypto';
import type { IntegrationChange } from '@g3/integrations';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { InMemoryIntegrationRepo, type IntegrationRecord, type IntegrationRepo } from '../src/integrations.repo';
import { PgIntegrationRepo } from '../src/pg.integrations.repo';
import { build, owner, otherOwner, platformAdmin, twilio, TWILIO_SID, TWILIO_TOKEN } from './helpers';

const MIGRATIONS = path.join(__dirname, '..', 'migrations');
const cmp = () => `cmp_${randomUUID().slice(0, 8)}`;

const rec = (over: Partial<IntegrationRecord> = {}): IntegrationRecord => ({
  id: `int_${randomUUID()}`,
  scope: 'company',
  companyId: 'cmp_a',
  category: 'sms',
  slot: 'default',
  provider: 'twilio',
  enabled: true,
  settings: { accountSid: TWILIO_SID, from: '+15005550006', sandbox: false },
  secrets: { authToken: { storage: 'encrypted', ciphertext: 'v1.aaa.bbb.ccc', hint: 'abcd' } },
  status: 'unverified',
  lastTest: null,
  createdAt: '2026-10-02T12:00:00.000Z',
  updatedAt: '2026-10-02T12:00:00.000Z',
  updatedBy: 'usr_owner',
  ...over,
});

function contractSuite(name: string, d: jest.Describe, setup: () => Promise<{ repo: () => IntegrationRepo; close: () => Promise<void> }>) {
  d(`contrato de IntegrationRepo (${name})`, () => {
    let mk: () => IntegrationRepo;
    let close: () => Promise<void>;
    let repo: IntegrationRepo;
    beforeAll(async () => {
      const s = await setup();
      mk = s.repo;
      close = s.close;
    });
    beforeEach(() => {
      repo = mk();
    });
    afterAll(async () => close?.());

    test('ida y vuelta completa (settings, secretos tal cual, lastTest)', async () => {
      const c = cmp();
      const r = rec({
        companyId: c,
        lastTest: { ok: true, live: true, message: 'ok', latencyMs: 12, testedAt: '2026-10-02T12:01:00.000Z' },
        secrets: {
          authToken: { storage: 'encrypted', ciphertext: 'v1.x.y.z', hint: null },
          apiKey: { storage: 'secret_manager', ref: 'gsm:projects/p/secrets/s/versions/1' },
          other: { storage: 'env', ref: 'env:TW_TOKEN' },
        },
      });
      expect(await repo.save(r)).toEqual(r);
      expect(await repo.find('company', c, 'sms', 'default')).toEqual(r);
    });

    test('unicidad por (alcance, compañía|null, categoría, ranura): el segundo save reemplaza y conserva id', async () => {
      const c = cmp();
      const first = await repo.save(rec({ companyId: c }));
      const second = await repo.save(rec({ companyId: c, provider: 'vonage', updatedAt: '2026-10-03T00:00:00.000Z' }));
      expect(second).toMatchObject({ id: first.id, createdAt: first.createdAt, provider: 'vonage', updatedAt: '2026-10-03T00:00:00.000Z' });
      // Otra ranura y otra categoría son configuraciones distintas.
      await repo.save(rec({ companyId: c, slot: 'backup' }));
      expect((await repo.find('company', c, 'sms', 'default'))?.provider).toBe('vonage');
      expect((await repo.find('company', c, 'sms', 'backup'))?.provider).toBe('twilio');
    });

    test('altas simultáneas del mismo destino dejan una sola configuración', async () => {
      const c = cmp();
      await Promise.all(Array.from({ length: 6 }, (_, n) => repo.save(rec({ companyId: c, provider: `p${n}` }))));
      const found = await repo.find('company', c, 'sms', 'default');
      expect(found?.provider).toMatch(/^p\d$/);
    });

    test('plataforma (company_id null) y compañías aisladas entre sí', async () => {
      const a = cmp();
      const b = cmp();
      const category = 'whatsapp' as const;
      const slot = `s${randomUUID().slice(0, 6).replace(/-/g, '')}`;
      await repo.save(rec({ scope: 'platform', companyId: null, category, slot, provider: 'meta_cloud' }));
      await repo.save(rec({ companyId: a, category, slot, provider: 'meta_a' }));
      expect((await repo.find('platform', null, category, slot))?.provider).toBe('meta_cloud');
      // El alcance plataforma ignora la compañía del llamador.
      expect((await repo.find('platform', a, category, slot))?.companyId).toBeNull();
      expect((await repo.find('company', a, category, slot))?.provider).toBe('meta_a');
      expect(await repo.find('company', b, category, slot)).toBeNull();
      expect(await repo.remove('company', b, category, slot)).toBe(false);
      expect(await repo.remove('company', a, category, slot)).toBe(true);
      expect(await repo.find('company', a, category, slot)).toBeNull();
      expect(await repo.find('platform', null, category, slot)).not.toBeNull();
    });

    test('el servicio funciona igual sobre el repo (secretos cifrados, aislamiento, aviso de cambio)', async () => {
      const changes: IntegrationChange[] = [];
      const { svc } = build({ repo, publishChange: async (c) => void changes.push(c) });
      await svc.upsert(owner, 'sms', 'default', 'company', twilio());
      const resolved = await svc.resolve('cmp_a', 'sms', 'default');
      expect(resolved).toMatchObject({ source: 'company', provider: 'twilio', secrets: { authToken: TWILIO_TOKEN } });
      expect((await svc.resolve(otherOwner.companyId, 'sms', 'default')).source).not.toBe('company');
      await svc.upsert(platformAdmin, 'push', 'default', 'platform', { provider: 'expo', enabled: true, values: {} });
      await svc.remove(owner, 'sms', 'default', 'company');
      expect(changes).toEqual([
        { scope: 'company', companyId: 'cmp_a', category: 'sms', slot: 'default' },
        { scope: 'platform', companyId: null, category: 'push', slot: 'default' },
        { scope: 'company', companyId: 'cmp_a', category: 'sms', slot: 'default' },
      ]);
    });
  });
}

contractSuite('memoria', describe, async () => ({ repo: () => new InMemoryIntegrationRepo(), close: async () => undefined }));

contractSuite('postgres', describeIfDb, async () => {
  const db = (await createTestDb(MIGRATIONS, 'integrations'))!;
  return { repo: () => new PgIntegrationRepo(db.pool), close: () => db.drop() };
});

describeIfDb('integrations en Postgres: secretos y restricciones', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'integrations');
  });
  afterAll(async () => db?.drop());

  test('los secretos quedan cifrados en la tabla (consulta cruda)', async () => {
    const repo = new PgIntegrationRepo(db!.pool);
    const { svc } = build({ repo });
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const { rows } = await db!.pool.query<{ secrets: Record<string, { storage: string; ciphertext: string; hint: string }>; row: string }>(
      `SELECT secrets, t::text AS row FROM integration_configs t WHERE company_id = 'cmp_a' AND category = 'sms'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].row).not.toContain(TWILIO_TOKEN);
    expect(rows[0].secrets.authToken.storage).toBe('encrypted');
    expect(rows[0].secrets.authToken.ciphertext).toMatch(/^v1\./);
    expect(rows[0].secrets.authToken.hint).toBe(TWILIO_TOKEN.slice(-4));
    // …y el servicio los descifra con su llave.
    expect((await svc.resolve('cmp_a', 'sms')).secrets.authToken).toBe(TWILIO_TOKEN);
  });

  test('CHECK: no admite secretos en claro ni alcance inconsistente; UNIQUE con company_id null', async () => {
    const repo = new PgIntegrationRepo(db!.pool);
    const plain = rec({ companyId: cmp(), secrets: { authToken: { storage: 'plain', value: TWILIO_TOKEN } as never } });
    await expect(repo.save(plain)).rejects.toThrow(/integration_configs_secrets_ck/);
    const notCipher = rec({ companyId: cmp(), secrets: { authToken: { storage: 'encrypted', ciphertext: TWILIO_TOKEN, hint: null } } });
    await expect(repo.save(notCipher)).rejects.toThrow(/integration_configs_secrets_ck/);
    const badRef = rec({ companyId: cmp(), secrets: { authToken: { storage: 'env', ref: TWILIO_TOKEN } } });
    await expect(repo.save(badRef)).rejects.toThrow(/integration_configs_secrets_ck/);

    const insert = (scope: string, companyId: string | null) =>
      db!.pool.query(
        `INSERT INTO integration_configs (id, scope, company_id, category, slot, provider, created_at, updated_at)
         VALUES ($1, $2, $3, 'email', 'default', 'sendgrid', now(), now())`,
        [randomUUID(), scope, companyId],
      );
    await expect(insert('platform', 'cmp_x')).rejects.toThrow(/integration_configs_scope_company_ck/);
    await expect(insert('company', null)).rejects.toThrow(/integration_configs_scope_company_ck/);
    await insert('platform', null);
    await expect(insert('platform', null)).rejects.toThrow(/integration_configs_target_uq/);
    await insert('company', 'cmp_x');
    await expect(insert('company', 'cmp_x')).rejects.toThrow(/integration_configs_target_uq/);
  });
});
