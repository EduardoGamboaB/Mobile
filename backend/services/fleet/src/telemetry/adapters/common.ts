import type { TelemetryRejectionCode } from '@g3/contracts';
import type { AdapterError, AdapterResult } from './types';

/**
 * Descarta coordenadas inválidas: no numéricas, fuera de rango o el clásico
 * (0,0) que reportan muchos equipos sin fix ("Null Island").
 */
export function validateCoordinates(lat: number, lng: number): TelemetryRejectionCode | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'invalid_coordinates';
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return 'invalid_coordinates';
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return 'invalid_coordinates';
  return null;
}

/** Número o null (cadenas vacías / no numéricas → null). */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fecha UTC a partir de componentes; null si no es una fecha real (ej. mes 13). */
export function utcIso(y: number, mo: number, d: number, h: number, mi: number, s: number): string | null {
  if ([y, mo, d, h, mi, s].some((n) => !Number.isInteger(n))) return null;
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi ||
    date.getUTCSeconds() !== s
  ) {
    return null;
  }
  return date.toISOString();
}

/** ISO string o epoch (ms; o segundos si es < 1e11) → ISO UTC. */
export function anyTimeToIso(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v < 1e11 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  if (typeof v === 'string' && v.trim() !== '') {
    // Sólo formatos ISO-8601 explícitos; evitamos el parser laxo de Date.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null;
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

/**
 * Los protocolos ASCII (Suntech, Queclink) pueden llegar como:
 * - texto plano (una o varias líneas),
 * - un arreglo de strings,
 * - `{ messages: string[] }` o `{ raw: string }` (envoltorio JSON del gateway).
 */
export function extractAscii(body: unknown): string | null {
  if (typeof body === 'string') return body;
  if (Array.isArray(body) && body.every((m) => typeof m === 'string')) return body.join('\n');
  if (body && typeof body === 'object') {
    const b = body as { messages?: unknown; raw?: unknown };
    if (Array.isArray(b.messages) && b.messages.every((m) => typeof m === 'string')) return b.messages.join('\n');
    if (typeof b.raw === 'string') return b.raw;
  }
  return null;
}

export const emptyResult = (): AdapterResult => ({ readings: [], errors: [] });

export const err = (
  code: TelemetryRejectionCode,
  message: string,
  externalId: string | null = null,
  raw?: unknown,
): AdapterError => ({ code, message, externalId, raw });

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
