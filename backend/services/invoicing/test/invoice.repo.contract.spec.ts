import * as path from 'path';
import { randomUUID } from 'crypto';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { InvoiceService } from '../src/invoice.service';
import { InMemoryInvoiceRepo, type InvoiceRepo } from '../src/invoice.repo';
import { PgInvoiceRepo } from '../src/pg.invoice.repo';
import { CartaPorteGenerator } from '../src/carta-porte/generator';
import { CFDIGenerator } from '../src/cfdi/generator';
import { MockPacProvider } from '../src/pac/mock.provider';
import type { PacProvider, StampRequest, StampResult } from '../src/pac/pac.provider';
import { invoicingRuntimeFromEnv } from '../src/runtime';
import { sampleIngresoCFDI } from './fixtures/sample-ingreso';

const MIGRATIONS = path.join(__dirname, '..', 'migrations');
const cmp = () => `cmp_${randomUUID().slice(0, 8)}`;
const generator = new CartaPorteGenerator(new CFDIGenerator());

/** PAC que falla (excepción) las primeras `n` veces y luego delega. */
class FlakyPac implements PacProvider {
  readonly name = 'flaky';
  readonly seen: StampRequest[] = [];
  constructor(private fails: number, private readonly inner = new MockPacProvider()) {}
  async stamp(req: StampRequest): Promise<StampResult> {
    this.seen.push(req);
    if (this.fails-- > 0) throw new Error('timeout del PAC');
    return this.inner.stamp(req);
  }
  cancel = (r: Parameters<PacProvider['cancel']>[0]) => this.inner.cancel(r);
  healthCheck = async () => true;
}

function contractSuite(name: string, d: jest.Describe, setup: () => Promise<{ repo: () => InvoiceRepo; close: () => Promise<void> }>) {
  d(`timbrado idempotente (${name})`, () => {
    let mk: () => InvoiceRepo;
    let close: () => Promise<void>;
    let repo: InvoiceRepo;
    beforeAll(async () => {
      const s = await setup();
      mk = s.repo;
      close = s.close;
    });
    beforeEach(() => {
      repo = mk();
    });
    afterAll(async () => close?.());

    test('repetir una factura timbrada devuelve el mismo UUID sin volver a llamar al PAC', async () => {
      const pac = new MockPacProvider();
      const svc = new InvoiceService(generator, pac, { repo });
      const c = cmp();
      const first = await svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI(), idempotencyKey: 'k1' });
      const again = await svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI(), idempotencyKey: 'k1' });
      expect(first).toMatchObject({ status: 'stamped', attempts: 1 });
      expect(again).toMatchObject({ status: 'stamped', uuidSat: first.uuidSat, invoiceId: first.invoiceId, replayed: true });
      expect(again.stampedXml).toContain('TimbreFiscalDigital');
      expect(pac.stamps).toHaveLength(1);
    });

    test('timbrados simultáneos de la misma factura: el PAC se llama una sola vez', async () => {
      const pac = new MockPacProvider({ responseDelayMs: 50 });
      const svc = new InvoiceService(generator, pac, { repo });
      const c = cmp();
      const id = `inv_${randomUUID()}`;
      const results = await Promise.all([1, 2, 3, 4].map(() => svc.stamp({ invoiceId: id, companyId: c, input: sampleIngresoCFDI() })));
      expect(pac.stamps).toHaveLength(1);
      expect(results.filter((r) => r.status === 'stamped')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'in_progress').length + results.filter((r) => r.replayed).length).toBe(3);
      const after = await svc.stamp({ invoiceId: id, companyId: c, input: sampleIngresoCFDI() });
      expect(after.uuidSat).toBe(results.find((r) => r.status === 'stamped')!.uuidSat);
    });

    test('tras un fallo se reintenta con EXACTAMENTE el mismo XML y se cuentan los intentos', async () => {
      const pac = new FlakyPac(1);
      const svc = new InvoiceService(generator, pac, { repo });
      const c = cmp();
      const req = { invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI() };
      await expect(svc.stamp(req)).rejects.toThrow(/timeout/);
      const ok = await svc.stamp(req);
      expect(ok).toMatchObject({ status: 'stamped', attempts: 2 });
      expect(pac.seen).toHaveLength(2);
      expect(pac.seen[1].xml).toBe(pac.seen[0].xml);
    });

    test('rechazo del SAT es definitivo; error nuestro (garantía) es reintentable', async () => {
      const c = cmp();
      const satReject = new InvoiceService(generator, new MockPacProvider({ failNext: true, errorCode: 'CFDI40102', isOurError: false }), { repo });
      const r1 = { invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI() };
      expect(await satReject.stamp(r1)).toMatchObject({ status: 'rejected', rejectionCode: 'CFDI40102', guaranteeApplicable: false });
      expect(await satReject.stamp(r1)).toMatchObject({ status: 'rejected', rejectionCode: 'CFDI40102', replayed: true });

      const pac = new MockPacProvider({ failNext: true, errorCode: 'CP500', isOurError: true });
      const ours = new InvoiceService(generator, pac, { repo });
      const r2 = { invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI() };
      expect(await ours.stamp(r2)).toMatchObject({ status: 'rejected', guaranteeApplicable: true });
      expect(await ours.stamp(r2)).toMatchObject({ status: 'stamped', attempts: 2 });
      expect(pac.stamps).toHaveLength(2);
    });

    test('la misma llave con otro contenido es conflicto; otra compañía es otra factura', async () => {
      const svc = new InvoiceService(generator, new MockPacProvider(), { repo });
      const c = cmp();
      await svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI(), idempotencyKey: 'k' });
      const changed = sampleIngresoCFDI();
      changed.merchandise[0].description = 'Otra mercancía';
      await expect(
        svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: changed, idempotencyKey: 'k' }),
      ).rejects.toMatchObject({ status: 409 });
      const other = await svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: cmp(), input: sampleIngresoCFDI(), idempotencyKey: 'k' });
      expect(other).toMatchObject({ status: 'stamped', attempts: 1 });
      expect(await repo.findByKey(cmp(), 'k')).toBeNull();
    });

    test('entrada inválida no deja factura; cancelación marca el estado', async () => {
      const svc = new InvoiceService(generator, new MockPacProvider(), { repo });
      const c = cmp();
      const bad = sampleIngresoCFDI();
      bad.merchandise = [];
      await expect(svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: bad, idempotencyKey: 'bad' })).rejects.toThrow(/mercancía/i);
      expect(await repo.findByKey(c, 'bad')).toBeNull();

      const s = await svc.stamp({ invoiceId: `inv_${randomUUID()}`, companyId: c, input: sampleIngresoCFDI(), idempotencyKey: 'ok' });
      await svc.cancel({ uuidSat: s.uuidSat!, reason: '02', rfcIssuer: 'GLO260101AB1', companyId: c });
      expect(await repo.findByKey(c, 'ok')).toMatchObject({ status: 'cancelled', cancellationReason: '02' });
      expect(await svc.stamp({ invoiceId: s.invoiceId, companyId: c, input: sampleIngresoCFDI(), idempotencyKey: 'ok' })).toMatchObject({
        status: 'cancelled', uuidSat: s.uuidSat, replayed: true,
      });
    });

    test('lease: un timbrado colgado lo retoma otra instancia al vencer', async () => {
      const c = cmp();
      const id = `inv_${randomUUID()}`;
      const { record } = await repo.reserve({ id, companyId: c, idempotencyKey: id, requestHash: 'h', xml: '<x/>', now: new Date().toISOString() });
      const t0 = new Date();
      expect(await repo.claimStamp(c, record.id, t0, 60_000)).toMatchObject({ status: 'stamping', stampAttempts: 1 });
      expect(await repo.claimStamp(c, record.id, new Date(t0.getTime() + 30_000), 60_000)).toBeNull();
      const retaken = await repo.claimStamp(c, record.id, new Date(t0.getTime() + 61_000), 60_000);
      expect(retaken?.stampAttempts).toBe(2);
      // El intento 1 (vencido) ya no puede marcar fallo encima del 2…
      const stale = await repo.completeStamp(c, record.id, 1, { kind: 'error', errorMessage: 'x', pacProvider: 'p' }, new Date());
      expect(stale?.status).toBe('stamping');
      // …pero un timbre exitoso siempre se guarda.
      const uuid = randomUUID().toUpperCase();
      const done = await repo.completeStamp(c, record.id, 1, {
        kind: 'stamped', uuidSat: uuid, satSeal: 's', satCertificateNumber: 'n', stampedXml: '<x/>',
        stampedAt: new Date().toISOString(), pacProvider: 'p', pacResponseTime: 10,
      }, new Date());
      expect(done).toMatchObject({ status: 'stamped', uuidSat: uuid, lockedUntil: null });
      expect(await repo.claimStamp(cmp(), record.id, new Date(t0.getTime() + 999_000), 60_000)).toBeNull();
    });
  });
}

contractSuite('memoria', describe, async () => ({ repo: () => new InMemoryInvoiceRepo(), close: async () => undefined }));
contractSuite('postgres', describeIfDb, async () => {
  const db = (await createTestDb(MIGRATIONS, 'invoicing'))!;
  return { repo: () => new PgInvoiceRepo(db.pool), close: () => db.drop() };
});

describeIfDb('invoicing en Postgres: restricciones', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'invoicing');
  });
  afterAll(async () => db?.drop());

  test('UUID del SAT único, llave única por compañía, estado válido y bitácora de intentos', async () => {
    const repo = new PgInvoiceRepo(db!.pool);
    const svc = new InvoiceService(generator, new MockPacProvider(), { repo });
    const s = await svc.stamp({ invoiceId: 'inv_a', companyId: 'cmp_a', input: sampleIngresoCFDI() });
    const insert = (id: string, key: string, company = 'cmp_a', status = 'pending', uuid: string | null = null) =>
      db!.pool.query(
        `INSERT INTO invoices (id, company_id, idempotency_key, request_hash, status, xml, uuid_sat, created_at, updated_at)
         VALUES ($1, $2, $3, 'h', $4, '<x/>', $5, now(), now())`,
        [id, company, key, status, uuid],
      );
    await expect(insert('inv_b', 'inv_a')).rejects.toThrow(/invoices_idempotency_uq/);
    await insert('inv_c', 'inv_a', 'cmp_b');
    await expect(insert('inv_d', 'd', 'cmp_b', 'failed', s.uuidSat!)).rejects.toThrow(/invoices_uuid_sat_uq/);
    await expect(insert('inv_e', 'e', 'cmp_b', 'stamped')).rejects.toThrow(/invoices_stamped_ck/);
    await expect(insert('inv_f', 'f', 'cmp_b', 'timbrada')).rejects.toThrow(/check/i);
    const { rows } = await db!.pool.query(`SELECT attempt, pac_provider, outcome FROM invoice_stamp_attempts WHERE invoice_id = 'inv_a'`);
    expect(rows).toEqual([{ attempt: 1, pac_provider: 'mock', outcome: 'stamped' }]);
  });

  test('runtime: con DATABASE_URL usa Postgres y aplica migraciones al arrancar', async () => {
    const schema = `invoicing_rt_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
    const rt = await invoicingRuntimeFromEnv({
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      DB_SCHEMA: schema,
      DB_MIGRATE_ON_BOOT: '1',
    });
    try {
      expect(rt.repo).toBeInstanceOf(PgInvoiceRepo);
      const svc = await rt.invoiceServiceFor('cmp_rt');
      expect((await svc.stamp({ invoiceId: 'inv_rt', companyId: 'cmp_rt', input: sampleIngresoCFDI() })).status).toBe('stamped');
    } finally {
      await rt.close();
      const { Pool } = await import('pg');
      const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 1 });
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
});

describe('invoicing runtime sin base', () => {
  test('desarrollo: repo en memoria; producción exige base', async () => {
    const rt = await invoicingRuntimeFromEnv({});
    expect(rt.repo).toBeInstanceOf(InMemoryInvoiceRepo);
    await expect(invoicingRuntimeFromEnv({ NODE_ENV: 'production', INTERNAL_TOKEN: 'x', INTEGRATIONS_URL: 'http://i' })).rejects.toThrow(/DATABASE_URL/);
  });
});
