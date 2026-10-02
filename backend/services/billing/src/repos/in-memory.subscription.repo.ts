import type { SubscriptionDto } from '@g3/contracts';
import { WEBHOOK_STALE_MS, type SubscriptionRepo, type WebhookClaim, type WebhookEventRepo } from './subscription.repo';

export type { SubscriptionRepo, WebhookEventRepo, WebhookClaim } from './subscription.repo';

export class InMemorySubscriptionRepo implements SubscriptionRepo {
  private readonly byCompany = new Map<string, SubscriptionDto>();

  async findByCompanyId(companyId: string) {
    const s = this.byCompany.get(companyId);
    return s ? { ...s } : null;
  }
  async save(sub: SubscriptionDto) {
    const prev = this.byCompany.get(sub.companyId);
    const next = { ...sub, id: prev?.id ?? sub.id };
    this.byCompany.set(sub.companyId, next);
    return { ...next };
  }
  async insertIfAbsent(sub: SubscriptionDto) {
    const prev = this.byCompany.get(sub.companyId);
    if (prev) return { subscription: { ...prev }, created: false };
    this.byCompany.set(sub.companyId, { ...sub });
    return { subscription: { ...sub }, created: true };
  }
}

export class InMemoryWebhookEventRepo implements WebhookEventRepo {
  private readonly events = new Map<string, { status: 'processing' | 'processed'; at: number }>();
  constructor(private readonly now: () => number = () => Date.now()) {}

  async claim(e: { eventId: string }): Promise<WebhookClaim> {
    const cur = this.events.get(e.eventId);
    if (cur?.status === 'processed') return 'processed';
    if (cur && this.now() - cur.at < WEBHOOK_STALE_MS) return 'in_progress';
    this.events.set(e.eventId, { status: 'processing', at: this.now() });
    return 'claimed';
  }
  async complete(eventId: string) {
    this.events.set(eventId, { status: 'processed', at: this.now() });
  }
  async release(eventId: string) {
    if (this.events.get(eventId)?.status === 'processing') this.events.delete(eventId);
  }
}
