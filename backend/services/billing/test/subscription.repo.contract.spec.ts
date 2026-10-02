import * as path from 'path';
import { randomUUID } from 'crypto';
import type { SubscriptionDto } from '@g3/contracts';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import type { SubscriptionRepo, WebhookEventRepo } from '../src/repos/subscription.repo';
import { InMemorySubscriptionRepo, InMemoryWebhookEventRepo } from '../src/repos/in-memory.subscription.repo';
import { PgSubscriptionRepo, PgWebhookEventRepo } from '../src/repos/pg.subscription.repo';
import { BillingService } from '../src/billing.service';
import { FakeStripeProvider } from '../src/billing/fake.stripe.provider';
import { RecordingEventBus } from '../src/event.bus';

const MIGRATIONS = path.join(__dirname, '../migrations');

function sub(companyId: string, over: Partial<SubscriptionDto> = {}): SubscriptionDto {
  return {
    id: randomUUID(),
    companyId,
    tier: 'free',
    status: 'active',
    units: 1,
    priceMxn: 0,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    ...over,
  };
}

function contract(name: string, make: () => { subs: SubscriptionRepo; webhooks: WebhookEventRepo }) {
  describe(`billing repos · ${name}`, () => {
    let subs: SubscriptionRepo;
    let webhooks: WebhookEventRepo;
    let cmpA: string;
    let cmpB: string;
    beforeEach(() => {
      ({ subs, webhooks } = make());
      cmpA = `cmp_${randomUUID()}`;
      cmpB = `cmp_${randomUUID()}`;
    });

    test('save + findByCompanyId: mismo DTO (dinero y fechas normalizados)', async () => {
      const s = sub(cmpA, {
        tier: 'pro',
        priceMxn: 899.5,
        stripeSubscriptionId: `sub_${randomUUID()}`,
        currentPeriodEnd: '2026-12-31T00:00:00.000Z',
      });
      expect(await subs.save(s)).toEqual(s);
      expect(await subs.findByCompanyId(cmpA)).toEqual(s);
    });

    test('aislamiento por compañía', async () => {
      await subs.save(sub(cmpA, { tier: 'pro' }));
      expect(await subs.findByCompanyId(cmpB)).toBeNull();
    });

    test('save es upsert por compañía y conserva el id original', async () => {
      const first = await subs.save(sub(cmpA));
      const second = await subs.save(sub(cmpA, { tier: 'business', cancelAtPeriodEnd: true }));
      expect(second.id).toBe(first.id);
      expect(await subs.findByCompanyId(cmpA)).toMatchObject({ id: first.id, tier: 'business', cancelAtPeriodEnd: true });
    });

    test('insertIfAbsent: una sola alta aunque lleguen 10 en paralelo', async () => {
      const rs = await Promise.all(Array.from({ length: 10 }, () => subs.insertIfAbsent(sub(cmpA))));
      expect(rs.filter((r) => r.created)).toHaveLength(1);
      expect(new Set(rs.map((r) => r.subscription.id)).size).toBe(1);
    });

    test('webhook: claim → complete → los reintentos ven "processed"', async () => {
      const id = `evt_${randomUUID()}`;
      expect(await webhooks.claim({ eventId: id, type: 'checkout.session.completed', companyId: cmpA })).toBe('claimed');
      expect(await webhooks.claim({ eventId: id, type: 'checkout.session.completed', companyId: cmpA })).toBe(
        'in_progress',
      );
      await webhooks.complete(id);
      expect(await webhooks.claim({ eventId: id, type: 'checkout.session.completed', companyId: cmpA })).toBe(
        'processed',
      );
    });

    test('webhook: release tras error permite reprocesar', async () => {
      const id = `evt_${randomUUID()}`;
      await webhooks.claim({ eventId: id, type: 'x', companyId: null });
      await webhooks.release(id);
      expect(await webhooks.claim({ eventId: id, type: 'x', companyId: null })).toBe('claimed');
    });

    test('webhook: el mismo evento en paralelo se reclama una sola vez', async () => {
      const id = `evt_${randomUUID()}`;
      const rs = await Promise.all(
        Array.from({ length: 10 }, () => webhooks.claim({ eventId: id, type: 'x', companyId: cmpA })),
      );
      expect(rs.filter((r) => r === 'claimed')).toHaveLength(1);
    });

    test('BillingService.applyStripeEvent es idempotente por event id', async () => {
      const bus = new RecordingEventBus();
      const svc = new BillingService(subs, new FakeStripeProvider(), bus, webhooks);
      await svc.startTrial(cmpA);
      const e = {
        eventId: `evt_${randomUUID()}`,
        eventType: 'customer.subscription.updated',
        companyId: cmpA,
        tier: 'pro' as const,
        stripeSubscriptionId: `sub_${randomUUID()}`,
        currentPeriodEnd: null,
      };
      const results = await Promise.all([svc.applyStripeEvent(e), svc.applyStripeEvent(e), svc.applyStripeEvent(e)]);
      expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
      expect((await svc.applyStripeEvent(e)).duplicate).toBe(true);
      expect(bus.events.filter((x) => x.type === 'subscription.upgraded')).toHaveLength(1);
      expect((await svc.getMine(cmpA)).tier).toBe('pro');
    });

    test('startTrial concurrente publica subscription.started una vez', async () => {
      const bus = new RecordingEventBus();
      const svc = new BillingService(subs, new FakeStripeProvider(), bus, webhooks);
      await Promise.all(Array.from({ length: 5 }, () => svc.startTrial(cmpA)));
      expect(bus.events.filter((x) => x.type === 'subscription.started')).toHaveLength(1);
    });
  });
}

contract('memoria', () => ({ subs: new InMemorySubscriptionRepo(), webhooks: new InMemoryWebhookEventRepo() }));

describeIfDb('Postgres', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'billing');
  });
  afterAll(async () => {
    await db?.drop();
  });

  contract('postgres', () => ({ subs: new PgSubscriptionRepo(db!.pool), webhooks: new PgWebhookEventRepo(db!.pool) }));

  test('la misma suscripción de Stripe en otra compañía → 409', async () => {
    const repo = new PgSubscriptionRepo(db!.pool);
    const stripeId = `sub_${randomUUID()}`;
    await repo.save(sub(`cmp_${randomUUID()}`, { stripeSubscriptionId: stripeId }));
    await expect(repo.save(sub(`cmp_${randomUUID()}`, { stripeSubscriptionId: stripeId }))).rejects.toMatchObject({
      status: 409,
    });
  });

  test('un reclamo abandonado (réplica caída) se puede re-reclamar', async () => {
    const repo = new PgWebhookEventRepo(db!.pool);
    const id = `evt_${randomUUID()}`;
    await repo.claim({ eventId: id, type: 'x', companyId: null });
    await db!.pool.query(`UPDATE stripe_webhook_events SET claimed_at = now() - interval '1 hour' WHERE event_id = $1`, [
      id,
    ]);
    expect(await repo.claim({ eventId: id, type: 'x', companyId: null })).toBe('claimed');
    const { rows } = await db!.pool.query(`SELECT attempts FROM stripe_webhook_events WHERE event_id = $1`, [id]);
    expect(rows[0].attempts).toBe(2);
  });

  test('CHECKs alineados al contrato (tier y status)', async () => {
    await expect(
      db!.pool.query(`INSERT INTO subscriptions (id, company_id, tier, status) VALUES ('x', 'c', 'gold', 'active')`),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      db!.pool.query(`INSERT INTO subscriptions (id, company_id, tier, status) VALUES ('y', 'c2', 'pro', 'paused')`),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
