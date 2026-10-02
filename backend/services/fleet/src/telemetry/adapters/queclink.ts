import type { AdapterResult, NormalizedReading } from './types';
import { emptyResult, err, extractAscii, num, utcIso, validateCoordinates } from './common';

/**
 * Queclink @Track (GV300, GV55, GV500, GL300...) — ASCII separado por `,`,
 * terminado en `$`.
 *
 *   +RESP:GTFRI,<proto>,<IMEI>,<name>,<ext pwr>,<report id>,<number>,
 *     [<accuracy>,<speed>,<azimuth>,<alt>,<LON>,<LAT>,<gps utc YYYYMMDDHHMMSS>,
 *      <mcc>,<mnc>,<lac>,<cell>,<reserved>] x number,
 *     <mileage km>,...,<send time>,<count>$
 *
 * OJO: Queclink manda **longitud antes que latitud**.
 *
 * Los campos previos al bloque GPS cambian entre reportes (GTIGN trae
 * duración, GTFRI trae report id/number...) y entre modelos, así que no
 * usamos índices fijos: anclamos cada posición en su timestamp GPS de 14
 * dígitos precedido por lon/lat válidos y leemos hacia atrás
 * (accuracy=-6, speed=-5, azimuth=-4, alt=-3, lon=-2, lat=-1).
 *
 * - `+RESP:` (tiempo real) y `+BUFF:` (buffer) se tratan igual.
 * - accuracy `0` = sin fix GPS.
 * - mileage sólo se lee en GTFRI-like (time+6) de la última posición.
 * - `+ACK:` y reportes sin bloque GPS (GTHBD...) → `unsupported_message`.
 */
const HEADER = /^\+(RESP|BUFF|ACK):(GT[A-Z]{3})$/;
const GPS_TIME = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
const DECIMAL = /^[-+]?\d+(\.\d+)?$/;

export function parseQueclink(body: unknown): AdapterResult {
  const out = emptyResult();
  const text = extractAscii(body);
  if (text === null) {
    out.errors.push(err('malformed', 'Queclink: se esperaba texto ASCII o { messages: string[] }'));
    return out;
  }

  const messages = text
    .split(/\$|\r?\n|\r/)
    .map((m) => m.trim())
    .filter(Boolean);

  for (const msg of messages) {
    const raw = `${msg}$`;
    const f = msg.split(',');
    const h = HEADER.exec(f[0] ?? '');
    const imei = f[2]?.trim() || null;
    if (!h) {
      out.errors.push(err('malformed', `Queclink: header desconocido "${f[0]}"`, imei, raw));
      continue;
    }
    const [, kind, report] = h;
    if (kind === 'ACK') {
      out.errors.push(err('unsupported_message', `Queclink: ${report} es ACK/heartbeat`, imei, raw));
      continue;
    }
    if (!imei) {
      out.errors.push(err('malformed', 'Queclink: sin IMEI', null, raw));
      continue;
    }

    // Anclas: timestamp GPS precedido por lon/lat decimales.
    const anchors: number[] = [];
    for (let i = 8; i < f.length; i++) {
      if (GPS_TIME.test(f[i]) && DECIMAL.test(f[i - 1]) && DECIMAL.test(f[i - 2])) anchors.push(i);
    }
    if (anchors.length === 0) {
      out.errors.push(err('unsupported_message', `Queclink: ${report} sin bloque GPS`, imei, raw));
      continue;
    }

    const eventCode = report === 'GTFRI' ? null : report;
    const ignition = report === 'GTIGN' ? true : report === 'GTIGF' ? false : null;

    anchors.forEach((t, idx) => {
      const isLast = idx === anchors.length - 1;
      const g = GPS_TIME.exec(f[t])!;
      const recordedAt = utcIso(+g[1], +g[2], +g[3], +g[4], +g[5], +g[6]);
      if (!recordedAt) {
        out.errors.push(err('invalid_timestamp', `Queclink: hora GPS inválida ${f[t]}`, imei, raw));
        return;
      }
      if (f[t - 6] === '0') {
        out.errors.push(err('no_gps_fix', 'Queclink: accuracy 0 (sin fix)', imei, raw));
        return;
      }
      const lng = num(f[t - 2]) ?? Number.NaN;
      const lat = num(f[t - 1]) ?? Number.NaN;
      const coordErr = validateCoordinates(lat, lng);
      if (coordErr) {
        out.errors.push(err(coordErr, `Queclink: coordenadas inválidas ${f[t - 1]},${f[t - 2]}`, imei, raw));
        return;
      }
      const reading: NormalizedReading = {
        externalId: imei,
        recordedAt,
        lat,
        lng,
        speedKph: num(f[t - 5]),
        headingDeg: num(f[t - 4]),
        ignition,
        odometerKm: isLast && DECIMAL.test(f[t + 6] ?? '') ? num(f[t + 6]) : null,
        fuelLevelPct: null,
        eventCode,
        raw,
      };
      out.readings.push(reading);
    });
  }
  return out;
}
