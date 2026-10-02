import type { AdapterResult } from './types';
import { anyTimeToIso, emptyResult, err, isRecord, num, validateCoordinates } from './common';

/**
 * Proveedor `generic`: un middleware externo (o el propio cliente) ya
 * normalizó los puntos. Body: `{ points: GenericTelemetryPointInput[] }`
 * (ver contracts/src/dtos/telemetry.ts).
 */
export function parseGeneric(body: unknown): AdapterResult {
  const out = emptyResult();
  if (!isRecord(body) || !Array.isArray(body.points)) {
    out.errors.push(err('malformed', 'generic: se esperaba { points: [...] }', null, body));
    return out;
  }

  for (const p of body.points as unknown[]) {
    if (!isRecord(p) || typeof p.externalId !== 'string' || p.externalId.trim() === '') {
      out.errors.push(err('malformed', 'generic: punto sin externalId', null, p));
      continue;
    }
    const externalId = p.externalId.trim();
    const recordedAt = anyTimeToIso(p.recordedAt);
    if (!recordedAt) {
      out.errors.push(err('invalid_timestamp', 'generic: recordedAt inválido', externalId, p));
      continue;
    }
    const lat = num(p.lat) ?? Number.NaN;
    const lng = num(p.lng) ?? Number.NaN;
    const coordErr = validateCoordinates(lat, lng);
    if (coordErr) {
      out.errors.push(err(coordErr, 'generic: coordenadas inválidas', externalId, p));
      continue;
    }
    out.readings.push({
      externalId,
      recordedAt,
      lat,
      lng,
      speedKph: num(p.speedKph),
      headingDeg: num(p.headingDeg),
      ignition: typeof p.ignition === 'boolean' ? p.ignition : null,
      odometerKm: num(p.odometerKm),
      fuelLevelPct: num(p.fuelLevelPct),
      eventCode: typeof p.eventCode === 'string' ? p.eventCode : null,
      raw: p,
    });
  }
  return out;
}
