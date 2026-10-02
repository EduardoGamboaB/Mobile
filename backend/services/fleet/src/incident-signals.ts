import {
  TelemetryEventType,
  type OperationalSignalDto,
  type TelemetryPositionReceivedEvent,
} from '@g3/contracts';
import { serviceFetchFromEnv } from '@g3/platform';
import { NoopEventBus, type DomainEvent, type EventBus } from './event.bus';

/** Lo que necesitamos de `fetch` (lo cumplen `fetch` y `serviceFetch` de @g3/platform). */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Telemetría → centro de incidentes (servicio alerts).
 *
 * Por cada `telemetry.position_received` aceptado, manda la señal operativa
 * a `POST {ALERTS_URL}/api/incidents/signals` (header `x-internal-token`),
 * enriquecida con el viaje activo del vehículo (servicio trips, caché 60 s).
 *
 * Fire-and-forget: `publish()` no espera a alerts ni a trips, así que la
 * ingesta del webhook no se frena; cada llamada tiene timeout, las señales en
 * vuelo están acotadas y los errores solo van al log.
 *
 * TODO(prod): reemplazar por Pub/Sub (`g3-domain-events`) con suscripción
 * push autenticada por OIDC hacia `/incidents/signals` (reintentos y DLQ).
 */

export interface ActiveTrip {
  tripId: string;
  driverId: string | null;
}

export interface ActiveTripResolver {
  /** `null` = el vehículo no tiene viaje activo. Lanza si no se pudo consultar. */
  resolve(companyId: string, vehicleId: string): Promise<ActiveTrip | null>;
}

/** Sin TRIPS_URL: las señales salen sin viaje. */
export class NullActiveTripResolver implements ActiveTripResolver {
  async resolve(): Promise<ActiveTrip | null> {
    return null;
  }
}

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number, what: string): Promise<T> {
  const ctrl = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_r, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new Error(`${what}: timeout de ${ms} ms (aborted)`));
    }, ms);
  });
  return Promise.race([run(ctrl.signal), timeout]).finally(() => clearTimeout(timer));
}

/**
 * `GET {TRIPS_URL}/api/trips/internal/active-by-vehicle/:vehicleId?companyId=` con caché corta.
 *
 * La caché es EN MEMORIA POR INSTANCIA a propósito (no Redis): es de 60 s,
 * acotada a `maxEntries`, solo ahorra llamadas a trips en ráfagas de
 * posiciones del mismo vehículo, y perderla o que dos réplicas tengan valores
 * distintos por unos segundos no cambia nada importante (la señal sale con o
 * sin viaje y alerts lo tolera). Compartirla costaría un viaje de red por
 * punto, que es justo lo que evita.
 */
export class HttpActiveTripResolver implements ActiveTripResolver {
  private readonly cache = new Map<string, { value: ActiveTrip | null; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<ActiveTrip | null>>();
  private readonly base: string;
  private readonly token: string;
  private readonly fetchFn: FetchLike;
  private readonly ttlMs: number;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly maxEntries: number;

  constructor(opts: {
    tripsUrl: string;
    internalToken: string;
    fetch?: FetchLike;
    ttlMs?: number;
    timeoutMs?: number;
    now?: () => number;
    maxEntries?: number;
  }) {
    this.base = opts.tripsUrl.replace(/\/+$/, '');
    this.token = opts.internalToken;
    this.fetchFn = opts.fetch ?? fetch.bind(globalThis);
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.timeoutMs = opts.timeoutMs ?? 2_000;
    this.now = opts.now ?? Date.now;
    this.maxEntries = opts.maxEntries ?? 10_000;
  }

  async resolve(companyId: string, vehicleId: string): Promise<ActiveTrip | null> {
    const key = `${companyId}\u0000${vehicleId}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    const running = this.inFlight.get(key);
    if (running) return running;

    const p = this.fetchActive(companyId, vehicleId)
      .then((value) => {
        this.remember(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, p);
    return p;
  }

  private async fetchActive(companyId: string, vehicleId: string): Promise<ActiveTrip | null> {
    const url =
      `${this.base}/api/trips/internal/active-by-vehicle/${encodeURIComponent(vehicleId)}` +
      `?companyId=${encodeURIComponent(companyId)}`;
    return withTimeout(
      async (signal) => {
        const r = await this.fetchFn(url, { method: 'GET', headers: { 'x-internal-token': this.token }, signal });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`trips respondió ${r.status}`);
        const body = (await r.json()) as { id?: string; driverId?: string | null };
        return body.id ? { tripId: body.id, driverId: body.driverId ?? null } : null;
      },
      this.timeoutMs,
      'trips active-by-vehicle',
    );
  }

  private remember(key: string, value: ActiveTrip | null) {
    const now = this.now();
    if (this.cache.size >= this.maxEntries) {
      for (const [k, v] of this.cache) if (v.expiresAt <= now) this.cache.delete(k);
      if (this.cache.size >= this.maxEntries) this.cache.clear();
    }
    this.cache.set(key, { value, expiresAt: now + this.ttlMs });
  }
}

export interface IncidentSignalBusOptions {
  alertsUrl: string;
  internalToken: string;
  resolver: ActiveTripResolver;
  fetch?: FetchLike;
  /** Timeout de cada POST a alerts. */
  timeoutMs?: number;
  /** Máximo de señales en vuelo; las que excedan se descartan (y se loguea). */
  maxInFlight?: number;
  /** Bus de dominio al que se sigue publicando todo (Noop hoy, Pub/Sub en prod). */
  inner?: EventBus;
  log?: (msg: string) => void;
}

export class IncidentSignalBus implements EventBus {
  private readonly url: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxInFlight: number;
  private readonly inner: EventBus;
  private readonly log: (msg: string) => void;
  private readonly pending = new Set<Promise<void>>();
  private dropped = 0;

  constructor(private readonly opts: IncidentSignalBusOptions) {
    this.url = `${opts.alertsUrl.replace(/\/+$/, '')}/api/incidents/signals`;
    this.fetchFn = opts.fetch ?? fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 3_000;
    this.maxInFlight = opts.maxInFlight ?? 500;
    this.inner = opts.inner ?? new NoopEventBus();
    // eslint-disable-next-line no-console
    this.log = opts.log ?? ((m) => console.error(m));
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.inner.publish(event);
    if (event.type !== TelemetryEventType.PositionReceived) return;
    const data = event.data as unknown as TelemetryPositionReceivedEvent;
    if (!data.vehicleId) return;

    if (this.pending.size >= this.maxInFlight) {
      this.dropped++;
      // Un log por cada 100 descartes para no inundar.
      if (this.dropped % 100 === 1) {
        this.log(`[fleet-service] señales a alerts descartadas por saturación (total ${this.dropped})`);
      }
      return;
    }
    const p = this.forward(event.companyId, data).finally(() => this.pending.delete(p));
    this.pending.add(p);
  }

  /** Espera las señales en vuelo (tests y apagado ordenado). */
  async drain(): Promise<void> {
    while (this.pending.size > 0) await Promise.allSettled([...this.pending]);
  }

  private async forward(companyId: string, data: TelemetryPositionReceivedEvent): Promise<void> {
    const vehicleId = data.vehicleId!;
    let trip: ActiveTrip | null = null;
    try {
      trip = await this.opts.resolver.resolve(companyId, vehicleId);
    } catch (e) {
      this.log(`[fleet-service] no se pudo resolver el viaje activo de ${vehicleId}: ${(e as Error).message}`);
    }
    const signal: OperationalSignalDto = {
      kind: 'position',
      vehicleId,
      tripId: trip?.tripId ?? null,
      driverId: trip?.driverId ?? null,
      speedKph: data.speedKph,
      lat: data.lat,
      lng: data.lng,
      recordedAt: data.recordedAt,
    };
    try {
      await withTimeout(
        async (abort) => {
          const r = await this.fetchFn(this.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-token': this.opts.internalToken },
            body: JSON.stringify({ companyId, signal }),
            signal: abort,
          });
          if (!r.ok) throw new Error(`alerts respondió ${r.status}`);
        },
        this.timeoutMs,
        'alerts signals',
      );
    } catch (e) {
      this.log(`[fleet-service] señal de ${vehicleId} a alerts falló: ${(e as Error).message}`);
    }
  }
}

/**
 * Con `ALERTS_URL` + `INTERNAL_TOKEN` reenvía señales a alerts (y usa
 * `TRIPS_URL` para el viaje activo); sin ellos, `NoopEventBus`. Las llamadas
 * salen con `serviceFetch` de @g3/platform: `x-internal-token` y, con
 * `SERVICE_AUTH=gcp`, el ID token de Cloud Run.
 */
export function eventBusFromEnv(
  env: Record<string, string | undefined> = process.env,
  log?: (msg: string) => void,
): EventBus {
  const alertsUrl = env.ALERTS_URL;
  const token = env.INTERNAL_TOKEN;
  if (!alertsUrl || !token) return new NoopEventBus();
  const serviceFetch = serviceFetchFromEnv(env);
  const resolver = env.TRIPS_URL
    ? new HttpActiveTripResolver({ tripsUrl: env.TRIPS_URL, internalToken: token, fetch: serviceFetch })
    : new NullActiveTripResolver();
  return new IncidentSignalBus({ alertsUrl, internalToken: token, resolver, fetch: serviceFetch, log });
}
