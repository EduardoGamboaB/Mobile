import type { IntegrationCategory, IntegrationScope } from '@g3/contracts';

/**
 * Invalidación cruzada de la caché de `IntegrationsClient`.
 *
 * Cada consumidor (alerts, auth, billing, invoicing) cachea la configuración
 * resuelta 60 s por instancia. Cuando integrations guarda o borra una
 * configuración publica un mensaje en Redis (pub/sub, canal
 * `g3:<G3_ENV>:integrations:invalidate`) y cada instancia suscrita borra solo
 * las entradas afectadas. Pub/sub no garantiza entrega (una instancia
 * desconectada pierde el aviso): el TTL de 60 s sigue siendo el respaldo, y
 * al reconectar se limpia toda la caché.
 *
 * El kit no depende de ioredis: los tipos son estructurales y un cliente
 * ioredis los cumple tal cual.
 */

export interface IntegrationChange {
  scope: IntegrationScope;
  /** null en alcance plataforma (afecta a todas las compañías). */
  companyId: string | null;
  category: IntegrationCategory;
  slot: string;
}

export interface InvalidatableCache {
  invalidate(companyId?: string | null, category?: IntegrationCategory, slot?: string): void;
}

/** Lo mínimo de un cliente Redis en modo suscriptor (ioredis lo cumple). */
export interface PubSubSubscriber {
  subscribe(channel: string): Promise<unknown>;
  on(event: string, listener: (...args: string[]) => void): unknown;
  /** ioredis: `ready` si ya conectó (su primer evento ready ya pasó). */
  readonly status?: string;
}

export interface PubSubPublisher {
  publish(channel: string, message: string): Promise<unknown>;
}

export function invalidationChannel(env: Record<string, string | undefined> = process.env): string {
  return `g3:${env.G3_ENV ?? 'dev'}:integrations:invalidate`;
}

/** Borra de la caché lo que el cambio puede afectar. */
export function applyInvalidation(cache: InvalidatableCache, change: IntegrationChange): void {
  if (change.scope === 'platform' || !change.companyId) {
    // La configuración de plataforma es el respaldo de todas las compañías.
    cache.invalidate(undefined, change.category, change.slot);
    return;
  }
  cache.invalidate(change.companyId, change.category, change.slot);
}

export function parseIntegrationChange(raw: string): IntegrationChange | null {
  try {
    const v = JSON.parse(raw) as Partial<IntegrationChange>;
    if ((v.scope !== 'company' && v.scope !== 'platform') || typeof v.category !== 'string' || typeof v.slot !== 'string') {
      return null;
    }
    return { scope: v.scope, companyId: typeof v.companyId === 'string' ? v.companyId : null, category: v.category, slot: v.slot };
  } catch {
    return null;
  }
}

/**
 * Suscribe la caché al canal de invalidación. `subscriber` debe ser una
 * conexión dedicada (en modo suscriptor Redis no acepta otros comandos).
 */
export async function subscribeToIntegrationChanges(
  subscriber: PubSubSubscriber,
  cache: InvalidatableCache,
  opts: { channel?: string; onError?: (message: string) => void } = {},
): Promise<void> {
  const channel = opts.channel ?? invalidationChannel();
  subscriber.on('message', (ch: string, message: string) => {
    if (ch !== channel) return;
    const change = parseIntegrationChange(message);
    if (change) applyInvalidation(cache, change);
    else opts.onError?.('[integrations-client] aviso de invalidación con formato inválido; se ignora');
  });
  // Tras una reconexión pudo perderse algún aviso: se descarta toda la caché.
  let first = subscriber.status !== 'ready';
  subscriber.on('ready', () => {
    if (first) {
      first = false;
      return;
    }
    cache.invalidate();
  });
  // Con `enableOfflineQueue: false` (createRedisFromEnv) no se puede mandar
  // SUBSCRIBE antes de conectar: se espera el primer `ready`.
  if (subscriber.status !== undefined && subscriber.status !== 'ready') {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Redis no respondió al suscribirse a invalidaciones')), 10_000);
      timer.unref?.();
      subscriber.on('ready', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await subscriber.subscribe(channel);
}

/** Publicador para el servicio integrations. Nunca lanza: el TTL es el respaldo. */
export function redisChangePublisher(
  publisher: PubSubPublisher,
  opts: { channel?: string; onError?: (message: string) => void } = {},
): (change: IntegrationChange) => Promise<void> {
  const channel = opts.channel ?? invalidationChannel();
  return async (change) => {
    try {
      await publisher.publish(channel, JSON.stringify(change));
    } catch (e) {
      opts.onError?.(`[integrations] no se pudo publicar la invalidación (${(e as Error).message}); las cachés expiran en ≤ 60 s`);
    }
  };
}
