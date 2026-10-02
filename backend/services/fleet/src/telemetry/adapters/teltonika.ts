import type { AdapterResult } from './types';
import { anyTimeToIso, emptyResult, err, isRecord, num, validateCoordinates } from './common';

/**
 * Teltonika (FMB/FMC/FMM...).
 *
 * SUPUESTO: los equipos Teltonika hablan Codec 8 / 8E **binario sobre TCP**.
 * G3 no abre ese socket (Cloud Run es HTTP); el binario se decodifica en un
 * middleware (flespi, un listener TCP propio o el forward HTTP de Teltonika)
 * que nos reenvía JSON con esta forma:
 *
 *   {
 *     "imei": "352093081234567",
 *     "records": [{
 *       "timestamp": "2024-05-18T14:32:10Z" | 1716042730000,
 *       "gps": { "lat": 19.43, "lng": -99.13, "speed": 72, "angle": 184, "satellites": 11 },
 *       "eventId": 239,                // opcional: AVL ID que disparó el registro
 *       "io": { "239": 1, "16": 12345678, "89": 64 }
 *     }]
 *   }
 *
 * AVL IDs que normalizamos:
 * - 239 → ignición (0/1)
 * - 16  → odómetro total en metros
 * - 89  → nivel de combustible % (CAN); fallback 48 (LVCAN)
 *
 * `satellites: 0` = sin fix (el equipo repite la última posición) → descartado.
 * También aceptamos un arreglo de envíos.
 */
export function parseTeltonika(body: unknown): AdapterResult {
  const out = emptyResult();
  const batches = Array.isArray(body) ? body : [body];

  for (const b of batches) {
    if (!isRecord(b) || (typeof b.imei !== 'string' && typeof b.imei !== 'number') || !Array.isArray(b.records)) {
      out.errors.push(err('malformed', 'Teltonika: se esperaba { imei, records: [...] }', null, b));
      continue;
    }
    const imei = String(b.imei).trim();

    for (const rec of b.records as unknown[]) {
      if (!isRecord(rec) || !isRecord(rec.gps)) {
        out.errors.push(err('malformed', 'Teltonika: registro sin gps', imei, rec));
        continue;
      }
      const recordedAt = anyTimeToIso(rec.timestamp);
      if (!recordedAt) {
        out.errors.push(err('invalid_timestamp', 'Teltonika: timestamp inválido', imei, rec));
        continue;
      }
      const gps = rec.gps;
      if (gps.satellites !== undefined && num(gps.satellites) === 0) {
        out.errors.push(err('no_gps_fix', 'Teltonika: 0 satélites', imei, rec));
        continue;
      }
      const lat = num(gps.lat) ?? Number.NaN;
      const lng = num(gps.lng ?? gps.lon) ?? Number.NaN;
      const coordErr = validateCoordinates(lat, lng);
      if (coordErr) {
        out.errors.push(err(coordErr, `Teltonika: coordenadas inválidas ${String(gps.lat)},${String(gps.lng)}`, imei, rec));
        continue;
      }

      const io = isRecord(rec.io) ? rec.io : {};
      const ign = num(io['239']);
      const odoM = num(io['16']);
      const fuel = num(io['89']) ?? num(io['48']);
      const eventId = num(rec.eventId);

      out.readings.push({
        externalId: imei,
        recordedAt,
        lat,
        lng,
        speedKph: num(gps.speed),
        headingDeg: num(gps.angle),
        ignition: ign === null ? null : ign === 1,
        odometerKm: odoM === null ? null : odoM / 1000,
        fuelLevelPct: fuel,
        eventCode: eventId ? `io:${eventId}` : null,
        raw: rec,
      });
    }
  }
  return out;
}
