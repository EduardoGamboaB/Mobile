import * as path from 'path';
import { randomUUID } from 'crypto';
import type { DriverDto } from '@g3/contracts';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { DriverConflictError, type DriverRepo } from '../src/driver.repo';
import { InMemoryDriverRepo } from '../src/in-memory.driver.repo';
import { PgDriverRepo } from '../src/pg.driver.repo';
import { DriversService } from '../src/drivers.service';
import { TierLimitExceededError } from '@g3/contracts';

const MIGRATIONS = path.join(__dirname, '../migrations');

function driver(companyId: string, over: Partial<DriverDto> = {}): DriverDto {
  return {
    id: randomUUID(),
    companyId,
    fullName: 'Juan Pérez',
    phone: `+52155${Math.floor(Math.random() * 1e8)
      .toString()
      .padStart(8, '0')}`,
    email: null,
    federalLicense: null,
    licenseExpiresAt: null,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** Las mismas pruebas contra memoria y Postgres: el repo es intercambiable. */
function contract(name: string, make: () => DriverRepo) {
  describe(`DriverRepo · ${name}`, () => {
    let repo: DriverRepo;
    let cmpA: string;
    let cmpB: string;
    beforeEach(() => {
      repo = make();
      cmpA = `cmp_${randomUUID()}`;
      cmpB = `cmp_${randomUUID()}`;
    });

    test('create + findById devuelven el mismo DTO', async () => {
      const d = driver(cmpA, { email: 'juan@acme.mx', federalLicense: 'B-1', licenseExpiresAt: '2027-12-31' });
      expect(await repo.create(d)).toEqual(d);
      expect(await repo.findById(cmpA, d.id)).toEqual(d);
    });

    test('aislamiento por compañía: otra compañía no lee, edita, borra ni cuenta', async () => {
      const d = await repo.create(driver(cmpA));
      await repo.create(driver(cmpB));
      expect(await repo.findById(cmpB, d.id)).toBeNull();
      expect(await repo.update(cmpB, d.id, { status: 'inactive' })).toBeNull();
      expect(await repo.remove(cmpB, d.id)).toBe(false);
      expect((await repo.list(cmpA)).map((x) => x.id)).toEqual([d.id]);
      expect(await repo.countByCompany(cmpA)).toBe(1);
      expect(await repo.linkUser(cmpB, d.id, 'usr_x')).toBe(false);
    });

    test('update parchea solo lo enviado y conserva id/companyId', async () => {
      const d = await repo.create(driver(cmpA, { federalLicense: 'B-9' }));
      const u = await repo.update(cmpA, d.id, { status: 'active', companyId: cmpB, id: 'otro' } as Partial<DriverDto>);
      expect(u).toEqual({ ...d, status: 'active' });
    });

    test('teléfono duplicado en la compañía → DriverConflictError (409), en otra compañía se permite', async () => {
      const d = await repo.create(driver(cmpA));
      await expect(repo.create(driver(cmpA, { phone: d.phone }))).rejects.toBeInstanceOf(DriverConflictError);
      await expect(repo.create(driver(cmpB, { phone: d.phone }))).resolves.toBeTruthy();
      const other = await repo.create(driver(cmpA));
      await expect(repo.update(cmpA, other.id, { phone: d.phone })).rejects.toMatchObject({ field: 'phone' });
    });

    test('licencia federal duplicada en la compañía → 409', async () => {
      await repo.create(driver(cmpA, { federalLicense: 'LF-1' }));
      await expect(repo.create(driver(cmpA, { federalLicense: 'LF-1' }))).rejects.toMatchObject({
        field: 'federalLicense',
      });
    });

    test('remove borra y countByCompany lo refleja', async () => {
      const d = await repo.create(driver(cmpA));
      expect(await repo.remove(cmpA, d.id)).toBe(true);
      expect(await repo.findById(cmpA, d.id)).toBeNull();
      expect(await repo.countByCompany(cmpA)).toBe(0);
    });

    test('linkUser vincula un usuario único por compañía', async () => {
      const a = await repo.create(driver(cmpA));
      const b = await repo.create(driver(cmpA));
      expect(await repo.linkUser(cmpA, a.id, 'usr_1')).toBe(true);
      expect((await repo.findByUserId(cmpA, 'usr_1'))?.id).toBe(a.id);
      await expect(repo.linkUser(cmpA, b.id, 'usr_1')).rejects.toMatchObject({ field: 'userId' });
    });

    test('createWithinLimit respeta el límite aun con altas en paralelo', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, () => repo.createWithinLimit(driver(cmpA), 3)));
      expect(results.filter((r) => r.ok)).toHaveLength(3);
      expect(await repo.countByCompany(cmpA)).toBe(3);
    });

    test('DriversService sobre el repo: límite del tier', async () => {
      const svc = new DriversService(repo);
      await svc.create({ companyId: cmpA, tier: 'free' }, { fullName: 'A', phone: '+5215500000001' });
      await expect(
        svc.create({ companyId: cmpA, tier: 'free' }, { fullName: 'B', phone: '+5215500000002' }),
      ).rejects.toBeInstanceOf(TierLimitExceededError);
    });
  });
}

contract('memoria', () => new InMemoryDriverRepo());

describeIfDb('Postgres', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'drivers');
  });
  afterAll(async () => {
    await db?.drop();
  });

  contract('postgres', () => new PgDriverRepo(db!.pool));

  test('fecha de vencimiento inválida → 400 (no 500)', async () => {
    const repo = new PgDriverRepo(db!.pool);
    await expect(repo.create(driver('cmp_x', { licenseExpiresAt: 'no-es-fecha' }))).rejects.toMatchObject({ status: 400 });
  });

  test('CHECK de status alineado al contrato', async () => {
    await expect(
      db!.pool.query(
        `INSERT INTO drivers (id, company_id, full_name, phone, status) VALUES ('x', 'c', 'n', '+1', 'on_trip')`,
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
