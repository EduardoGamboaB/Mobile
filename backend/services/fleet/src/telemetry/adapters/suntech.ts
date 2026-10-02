import type { AdapterResult } from './types';
import { emptyResult, err, extractAscii, num, utcIso, validateCoordinates } from './common';

/**
 * Suntech ST300 / ST4300 — protocolo ASCII separado por `;`.
 *
 *   HDR;DEV_ID;MODEL;SW_VER;DATE;TIME;CELL;LAT;LON;SPD;CRS;SATT;FIX;DIST;PWR_VOLT;IO;MODE;MSG_NUM;...
 *    0    1      2     3     4    5    6    7   8   9   10   11   12   13     14    15  16    17
 *
 * - HDR: `STT` (status/periódico), `ALT` (alerta), `EMG` (emergencia), `EVT`
 *   (evento), con o sin prefijo de modelo (`ST300STT`, `ST4300ALT`, ...).
 *   `ALV` (keep-alive) y demás no traen posición → `unsupported_message`.
 * - DATE `YYYYMMDD`, TIME `HH:MM:SS`, ambos UTC.
 * - LAT/LON en grados decimales con signo; SPD km/h; CRS grados.
 * - FIX `1` = posición válida. DIST = odómetro en metros.
 * - IO: cadena de bits; el primero es la ignición.
 *
 * El formato "Universal" con REP_MAP (ST300 fw ≥ 3) no está cubierto: el
 * campo 2 sería un hex de máscara y los índices cambian (ver docs).
 */
const POSITION_TYPES = new Set(['STT', 'ALT', 'EMG', 'EVT']);
const HEADER = /^(?:ST\d{3,4}[A-Z]?)?([A-Z]{3})$/;

export function parseSuntech(body: unknown): AdapterResult {
  const out = emptyResult();
  const text = extractAscii(body);
  if (text === null) {
    out.errors.push(err('malformed', 'Suntech: se esperaba texto ASCII o { messages: string[] }'));
    return out;
  }

  const lines = text
    .split(/\r?\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const f = line.split(';');
    const m = HEADER.exec(f[0] ?? '');
    const devId = f[1]?.trim() || null;
    if (!m) {
      out.errors.push(err('malformed', `Suntech: header desconocido "${f[0]}"`, devId, line));
      continue;
    }
    const type = m[1];
    if (!POSITION_TYPES.has(type)) {
      out.errors.push(err('unsupported_message', `Suntech: ${type} no trae posición`, devId, line));
      continue;
    }
    if (f.length < 13 || !devId) {
      out.errors.push(err('malformed', 'Suntech: mensaje incompleto', devId, line));
      continue;
    }

    const dm = /^(\d{4})(\d{2})(\d{2})$/.exec(f[4]);
    const tm = /^(\d{2}):(\d{2}):(\d{2})$/.exec(f[5]);
    const recordedAt =
      dm && tm ? utcIso(+dm[1], +dm[2], +dm[3], +tm[1], +tm[2], +tm[3]) : null;
    if (!recordedAt) {
      out.errors.push(err('invalid_timestamp', `Suntech: fecha/hora inválida ${f[4]} ${f[5]}`, devId, line));
      continue;
    }

    if (f[12] !== '1') {
      out.errors.push(err('no_gps_fix', 'Suntech: sin fix GPS', devId, line));
      continue;
    }
    const lat = num(f[7]) ?? Number.NaN;
    const lng = num(f[8]) ?? Number.NaN;
    const coordErr = validateCoordinates(lat, lng);
    if (coordErr) {
      out.errors.push(err(coordErr, `Suntech: coordenadas inválidas ${f[7]},${f[8]}`, devId, line));
      continue;
    }

    const distM = num(f[13]);
    const io = f[15] ?? '';
    out.readings.push({
      externalId: devId,
      recordedAt,
      lat,
      lng,
      speedKph: num(f[9]),
      headingDeg: num(f[10]),
      ignition: /^[01]/.test(io) ? io[0] === '1' : null,
      odometerKm: distM === null ? null : distM / 1000,
      fuelLevelPct: null,
      eventCode: type === 'STT' ? null : type,
      raw: line,
    });
  }
  return out;
}
