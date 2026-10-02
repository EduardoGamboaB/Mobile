import { ConflictException } from '@nestjs/common';
import type { Pool } from 'pg';
import { iso, num } from '@g3/platform';
import type { SubscriptionDto } from '@g3/contracts';
import { WEBHOOK_STALE_MS, type SubscriptionRepo, type WebhookClaim, type WebhookEventRepo } from './subscription.repo';

interface SubscriptionRow {
  id: string;
  company_id: string;
  tier: SubscriptionDto['tier'];
  status: SubscriptionDto['status'];
  units: number;
  price_mxn: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}

const COLS = `id, company_id, tier, status, units, price_mxn, stripe_subscription_id, current_period_end, cancel_at_period_end`;

function toDto(r: SubscriptionRow): SubscriptionDto {
  return {
    id: r.id,
    companyId: r.company_id,
    tier: r.tier,
    status: r.status,
    units: r.units,
    priceMxn: num(r.price_mxn),
    stripeSubscriptionId: r.stripe_subscription_id,
    currentPeriodEnd: iso(r.current_period_end),
    cancelAtPeriodEnd: r.cancel_at_period_end,
  };
}

/** Una suscripción de Stripe solo puede pertenecer a una compañía → 409. */
export class StripeSubscriptionConflictError extends ConflictException {
  constructor() {
    super('Esa suscripción de Stripe ya está asociada a otra compañía');
  }
}

function params(s: SubscriptionDto) {
  return [
    s.id,
    s.companyId,
    s.tier,
    s.status,
    s.units,
    s.priceMxn,
    s.stripeSubscriptionId,
    s.currentPeriodEnd,
    s.cancelAtPeriodEnd,
  ];
}

export class PgSubscriptionRepo implements SubscriptionRepo {
  constructor(private readonly pool: Pool) {}

  async findByCompanyId(companyId: string) {
    const { rows } = await this.pool.query<SubscriptionRow>(`SELECT ${COLS} FROM subscriptions WHERE company_id = $1`, [
      companyId,
    ]);
    return rows[0] ? toDto(rows[0]) : null;
  }

  async save(sub: SubscriptionDto) {
    try {
      const { rows } = await this.pool.query<SubscriptionRow>(
        `INSERT INTO subscriptions (id, company_id, tier, status, units, price_mxn, stripe_subscription_id,
                                    current_period_end, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (company_id) DO UPDATE SET
           tier = EXCLUDED.tier,
           status = EXCLUDED.status,
           units = EXCLUDED.units,
           price_mxn = EXCLUDED.price_mxn,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           updated_at = now()
         RETURNING ${COLS}`,
        params(sub),
      );
      return toDto(rows[0]);
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new StripeSubscriptionConflictError();
      throw e;
    }
  }

  async insertIfAbsent(sub: SubscriptionDto) {
    const { rows } = await this.pool.query<SubscriptionRow>(
      `INSERT INTO subscriptions (id, company_id, tier, status, units, price_mxn, stripe_subscription_id,
                                  current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (company_id) DO NOTHING
       RETURNING ${COLS}`,
      params(sub),
    );
    if (rows[0]) return { subscription: toDto(rows[0]), created: true };
    return { subscription: (await this.findByCompanyId(sub.companyId))!, created: false };
  }
}

export class PgWebhookEventRepo implements WebhookEventRepo {
  constructor(private readonly pool: Pool) {}

  async claim(e: { eventId: string; type: string; companyId: string | null }): Promise<WebhookClaim> {
    // Un solo statement: inserta, o re-reclama si el intento previo quedó abandonado.
    const { rows } = await this.pool.query<{ claimed: boolean }>(
      `INSERT INTO stripe_webhook_events (event_id, type, company_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO UPDATE
         SET claimed_at = now(), attempts = stripe_webhook_events.attempts + 1
         WHERE stripe_webhook_events.status = 'processing'
           AND stripe_webhook_events.claimed_at < now() - make_interval(secs => $4::double precision / 1000)
       RETURNING true AS claimed`,
      [e.eventId, e.type, e.companyId, WEBHOOK_STALE_MS],
    );
    if (rows[0]) return 'claimed';
    const cur = await this.pool.query<{ status: string }>(`SELECT status FROM stripe_webhook_events WHERE event_id = $1`, [
      e.eventId,
    ]);
    return cur.rows[0]?.status === 'processed' ? 'processed' : 'in_progress';
  }

  async complete(eventId: string) {
    await this.pool.query(
      `UPDATE stripe_webhook_events SET status = 'processed', processed_at = now() WHERE event_id = $1`,
      [eventId],
    );
  }

  async release(eventId: string) {
    await this.pool.query(`DELETE FROM stripe_webhook_events WHERE event_id = $1 AND status = 'processing'`, [eventId]);
  }
}
