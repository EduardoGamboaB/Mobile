/**
 * Telemetría GPS · tokens de ingesta y equipos desconocidos (servicio fleet).
 * Espejo de `backend/contracts/src/dtos/telemetry.ts`; ver
 * `backend/docs/TELEMETRY-INGESTION.md`.
 */
import { api } from '../api/client';
import { API_PREFIX, G3_API_URL, isLive } from '../api/config';
import { G3ApiError } from '../api/types';

export const TELEMETRY_PROVIDERS = ['suntech', 'teltonika', 'queclink', 'generic'] as const;
export type TelemetryProvider = (typeof TELEMETRY_PROVIDERS)[number];

export interface IngestTokenDto {
  id: string;
  companyId: string;
  /** Primeros caracteres del token para identificarlo en UI (nunca el secreto). */
  prefix: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Sólo se devuelve una vez, al crearlo. */
export interface IngestTokenCreatedDto extends IngestTokenDto {
  token: string;
}

export interface UnknownDeviceHitDto {
  provider: TelemetryProvider;
  externalId: string;
  hits: number;
  lastSeenAt: string;
}

export const INGEST_TOKEN_HEADER = 'x-g3-ingest-token';

/** Cómo manda cada proveedor (resumen de TELEMETRY-INGESTION.md §4). */
export const TELEMETRY_PROVIDER_INFO: Record<TelemetryProvider, { name: string; body: string; note: string }> = {
  suntech: {
    name: 'Suntech (ST300 / ST4300)',
    body: 'text/plain, una línea ASCII por mensaje (o JSON { "messages": [...] })',
    note: 'Reenvío HTTP desde el servidor Suntech o tu middleware. Reportes STT/ALT/EMG/EVT con FIX=1.',
  },
  teltonika: {
    name: 'Teltonika (FMB / FMC)',
    body: 'JSON { imei, records: [{ timestamp, gps, io }] } decodificado por un middleware (flespi u otro)',
    note: 'G3 no abre el socket Codec 8: el middleware decodifica y reenvía por HTTP.',
  },
  queclink: {
    name: 'Queclink (@Track: GV300, GV55…)',
    body: 'text/plain, mensajes +RESP/+BUFF terminados en $ (o JSON { "messages": [...] })',
    note: 'Reenvío HTTP desde el servidor @Track. Ojo: longitud antes que latitud.',
  },
  generic: {
    name: 'Genérico (JSON normalizado)',
    body: 'JSON { points: [{ externalId, recordedAt, lat, lng, speedKph… }] }',
    note: 'Para middlewares propios u otros proveedores; acepta cualquier equipo de tu compañía.',
  },
};

/** URL pública del webhook (vía gateway). */
export function ingestUrl(provider: TelemetryProvider, base: string = G3_API_URL): string {
  const origin = base || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://<gateway>');
  return `${origin.replace(/\/$/, '')}${API_PREFIX}/telemetry/ingest/${provider}`;
}

export interface TelemetryBackend {
  listTokens(): Promise<IngestTokenDto[]>;
  createToken(label?: string): Promise<IngestTokenCreatedDto>;
  revokeToken(id: string): Promise<IngestTokenDto>;
  unknownDevices(): Promise<UnknownDeviceHitDto[]>;
}

export const telemetryHttp: TelemetryBackend = {
  listTokens: () => api.get<IngestTokenDto[]>('/telemetry/ingest-tokens'),
  createToken: (label) => {
    const l = label?.trim();
    return api.post<IngestTokenCreatedDto>('/telemetry/ingest-tokens', l ? { label: l } : {});
  },
  revokeToken: (id) => api.delete<IngestTokenDto>(`/telemetry/ingest-tokens/${encodeURIComponent(id)}`),
  unknownDevices: () => api.get<UnknownDeviceHitDto[]>('/telemetry/unknown-devices'),
};

function randomToken(): string {
  const bytes = new Uint8Array(32);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  let s = '';
  for (const b of bytes) s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b % 64];
  return `g3it_${s}`;
}

/** Demo en memoria: mismo comportamiento (el secreto solo se ve al crear). */
export function createDemoTelemetry(now: () => Date = () => new Date()): TelemetryBackend {
  let seq = 0;
  const minutesAgo = (m: number) => new Date(now().getTime() - m * 60_000).toISOString();
  const tokens: IngestTokenDto[] = [
    {
      id: `itk_${seq++}`,
      companyId: 'demo',
      prefix: 'g3it_Qm9rT2',
      label: 'Servidor Suntech (matriz)',
      createdAt: minutesAgo(60 * 24 * 20),
      revokedAt: null,
    },
  ];
  const unknown: UnknownDeviceHitDto[] = [
    { provider: 'queclink', externalId: '860599001234567', hits: 14, lastSeenAt: minutesAgo(12) },
    { provider: 'suntech', externalId: '205027329', hits: 3, lastSeenAt: minutesAgo(180) },
  ];
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  return {
    async listTokens() {
      return copy(tokens);
    },
    async createToken(label) {
      const token = randomToken();
      const t: IngestTokenDto = {
        id: `itk_${seq++}`,
        companyId: 'demo',
        prefix: token.slice(0, 12),
        label: label?.trim() || null,
        createdAt: now().toISOString(),
        revokedAt: null,
      };
      tokens.unshift(t);
      return { ...copy(t), token };
    },
    async revokeToken(id) {
      const t = tokens.find((x) => x.id === id);
      if (!t) throw new G3ApiError(404, { statusCode: 404, error: 'Not Found', message: 'Token no encontrado' });
      t.revokedAt = t.revokedAt ?? now().toISOString();
      return copy(t);
    },
    async unknownDevices() {
      return copy(unknown);
    },
  };
}

export const telemetryBackend: TelemetryBackend = isLive ? telemetryHttp : createDemoTelemetry();
