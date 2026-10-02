import type { SubscriptionDto } from '@g3/contracts';

/** Una suscripción por compañía (`company_id` único). */
export interface SubscriptionRepo {
  findByCompanyId(companyId: string): Promise<SubscriptionDto | null>;
  /** Alta o reemplazo de la suscripción de la compañía (upsert por `companyId`; conserva el `id` existente). */
  save(sub: SubscriptionDto): Promise<SubscriptionDto>;
  /**
   * Alta solo si la compañía no tiene suscripción (idempotente bajo
   * concurrencia). Devuelve la vigente y si se creó en esta llamada.
   */
  insertIfAbsent(sub: SubscriptionDto): Promise<{ subscription: SubscriptionDto; created: boolean }>;
}

/** Resultado de reclamar un evento de webhook de Stripe para procesarlo. */
export type WebhookClaim =
  /** Primera vez (o un intento previo quedó abandonado): procesar. */
  | 'claimed'
  /** Ya se procesó: responder 200 sin repetir efectos. */
  | 'processed'
  /** Otra réplica lo está procesando ahora mismo: no repetir. */
  | 'in_progress';

/**
 * Idempotencia de webhooks de Stripe por `event.id`: Stripe reintenta y
 * puede entregar el mismo evento varias veces (incluso en paralelo).
 */
export interface WebhookEventRepo {
  claim(e: { eventId: string; type: string; companyId: string | null }): Promise<WebhookClaim>;
  /** Marca el evento como procesado (definitivo). */
  complete(eventId: string): Promise<void>;
  /** Libera el reclamo tras un error para que el reintento de Stripe lo procese. */
  release(eventId: string): Promise<void>;
}

/** Un reclamo `processing` más viejo que esto se considera abandonado (réplica caída). */
export const WEBHOOK_STALE_MS = 5 * 60_000;
