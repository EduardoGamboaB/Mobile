import { parseSuntech } from '../src/telemetry/adapters/suntech';
import { parseTeltonika } from '../src/telemetry/adapters/teltonika';
import { parseQueclink } from '../src/telemetry/adapters/queclink';
import { parseGeneric } from '../src/telemetry/adapters/generic';
import { ADAPTERS, validateCoordinates } from '../src/telemetry/adapters';

// ---------------------------------------------------------------------------
// Payloads de ejemplo (realistas, CDMX / autopista México–Querétaro)
// ---------------------------------------------------------------------------

/** ST300 STT: HDR;DEV_ID;MODEL;SW;DATE;TIME;CELL;LAT;LON;SPD;CRS;SATT;FIX;DIST;PWR;IO;MODE;MSG_NUM;H_METER;BCK;MSG_TYPE */
const SUNTECH_STT =
  'ST300STT;205027329;04;1097B;20240518;14:32:10;3d8b1;+19.432608;-099.133209;072.50;184.20;9;1;12345678;13.81;100000;1;0042;0003600;4.1;1';
const SUNTECH_STT_SHORT_HDR =
  'STT;205027329;04;1097B;20240518;14:33:10;3d8b1;+19.442608;-099.143209;080.00;190.00;10;1;12346678;13.80;000000;1;0043';
const SUNTECH_ALT =
  'ST300ALT;205027329;04;1097B;20240518;14:35:00;3d8b1;+19.452608;-099.153209;000.00;000.00;8;1;12347000;13.70;100000;1;0044;0003700;4.1;1';
const SUNTECH_NO_FIX =
  'ST300STT;205027329;04;1097B;20240518;14:36:00;3d8b1;+19.452608;-099.153209;000.00;000.00;0;0;12347000;13.70;000000;1;0045';
const SUNTECH_ZERO =
  'ST300STT;205027329;04;1097B;20240518;14:37:00;3d8b1;+00.000000;+000.000000;000.00;000.00;9;1;12347000;13.70;000000;1;0046';
const SUNTECH_ALIVE = 'ST300ALV;205027329';

/** Queclink GV300 GTFRI (lon antes que lat). */
const QUECLINK_FRI =
  '+RESP:GTFRI,300400,860599001234567,GV300,,10,1,1,72.5,184,2240.3,-99.133209,19.432608,20240518143210,0334,0020,3C1F,0402ED4C,00,12345.6,,,,,,20240518143212,0A1B$';
const QUECLINK_FRI_2POS =
  '+RESP:GTFRI,300400,860599001234567,GV300,,10,2,' +
  '1,70.0,180,2240.0,-99.100000,19.400000,20240518143000,0334,0020,3C1F,0402ED4C,00,' +
  '1,75.0,185,2241.0,-99.110000,19.410000,20240518143030,0334,0020,3C1F,0402ED4C,00,' +
  '12350.2,,,,,,20240518143032,0A1C$';
const QUECLINK_NO_FIX =
  '+RESP:GTFRI,300400,860599001234567,GV300,,10,1,0,0.0,0,0.0,-99.133209,19.432608,20240518143210,0334,0020,3C1F,0402ED4C,00,12345.6,,,,,,20240518143212,0A1D$';
const QUECLINK_IGN =
  '+RESP:GTIGN,300400,860599001234567,GV300,120,1,0.0,0,2240.3,-99.133209,19.432608,20240518140000,0334,0020,3C1F,0402ED4C,00,,12345.6,20240518140001,0A1E$';
const QUECLINK_BUFF_SOS =
  '+BUFF:GTSOS,300400,860599001234567,GV300,,10,1,1,10.0,90,2240.3,-99.140000,19.440000,20240518144000,0334,0020,3C1F,0402ED4C,00,12346.0,,,,,,20240518150000,0A1F$';
const QUECLINK_HBD = '+ACK:GTHBD,300400,860599001234567,GV300,20240518143212,0A20$';

/** Teltonika vía middleware (flespi / TCP→HTTP). */
const TELTONIKA = {
  imei: '352093081234567',
  records: [
    {
      timestamp: '2024-05-18T14:32:10.000Z',
      priority: 0,
      gps: { lat: 19.432608, lng: -99.133209, altitude: 2240, angle: 184, satellites: 11, speed: 72 },
      io: { '239': 1, '16': 12345678, '89': 64 },
    },
    {
      timestamp: 1716043000000, // epoch ms
      gps: { lat: 19.44, lng: -99.14, angle: 190, satellites: 9, speed: 0 },
      eventId: 239,
      io: { '239': 0 },
    },
  ],
};

describe('validateCoordinates', () => {
  test.each<[number, number, string | null]>([
    [19.43, -99.13, null],
    [0, 0, 'invalid_coordinates'],
    [91, 10, 'invalid_coordinates'],
    [10, -181, 'invalid_coordinates'],
    [Number.NaN, 10, 'invalid_coordinates'],
  ])('(%p, %p) → %p', (lat, lng, expected) => {
    expect(validateCoordinates(lat, lng)).toBe(expected);
  });
});

describe('Suntech (ST300/ST4300 ASCII)', () => {
  test('STT con header ST300STT → punto normalizado', () => {
    const r = parseSuntech(SUNTECH_STT);
    expect(r.errors).toEqual([]);
    expect(r.readings).toHaveLength(1);
    expect(r.readings[0]).toMatchObject({
      externalId: '205027329',
      recordedAt: '2024-05-18T14:32:10.000Z',
      lat: 19.432608,
      lng: -99.133209,
      speedKph: 72.5,
      headingDeg: 184.2,
      ignition: true,
      odometerKm: 12345.678,
      eventCode: null,
      raw: SUNTECH_STT,
    });
  });

  test('acepta header corto STT y varias líneas en un mismo body', () => {
    const r = parseSuntech(`${SUNTECH_STT}\r\n${SUNTECH_STT_SHORT_HDR}\n`);
    expect(r.readings).toHaveLength(2);
    expect(r.readings[1].ignition).toBe(false);
    expect(r.readings[1].recordedAt).toBe('2024-05-18T14:33:10.000Z');
  });

  test('acepta { messages: [...] } (envoltorio JSON del gateway)', () => {
    const r = parseSuntech({ messages: [SUNTECH_STT, SUNTECH_ALT] });
    expect(r.readings).toHaveLength(2);
    expect(r.readings[1].eventCode).toBe('ALT');
  });

  test('sin fix GPS → error no_gps_fix', () => {
    const r = parseSuntech(SUNTECH_NO_FIX);
    expect(r.readings).toHaveLength(0);
    expect(r.errors[0]).toMatchObject({ code: 'no_gps_fix', externalId: '205027329' });
  });

  test('coordenadas 0,0 → invalid_coordinates', () => {
    const r = parseSuntech(SUNTECH_ZERO);
    expect(r.errors[0].code).toBe('invalid_coordinates');
  });

  test('keep-alive ALV → unsupported_message (no es posición)', () => {
    expect(parseSuntech(SUNTECH_ALIVE).errors[0].code).toBe('unsupported_message');
  });

  test('línea truncada → malformed', () => {
    expect(parseSuntech('ST300STT;205027329;04;1097B;20240518').errors[0].code).toBe('malformed');
  });

  test('fecha inválida → invalid_timestamp', () => {
    const bad = SUNTECH_STT.replace('20240518;14:32:10', '20241318;14:32:10');
    expect(parseSuntech(bad).errors[0].code).toBe('invalid_timestamp');
  });

  test('body que no es texto ni lista → malformed', () => {
    expect(parseSuntech({ foo: 1 }).errors[0].code).toBe('malformed');
  });
});

describe('Queclink (@Track ASCII, lon antes que lat)', () => {
  test('GTFRI → lat/lng en el orden correcto', () => {
    const r = parseQueclink(QUECLINK_FRI);
    expect(r.errors).toEqual([]);
    expect(r.readings).toHaveLength(1);
    expect(r.readings[0]).toMatchObject({
      externalId: '860599001234567',
      recordedAt: '2024-05-18T14:32:10.000Z',
      lat: 19.432608,
      lng: -99.133209,
      speedKph: 72.5,
      headingDeg: 184,
      odometerKm: 12345.6,
      eventCode: null,
    });
  });

  test('GTFRI con 2 posiciones → 2 puntos; odómetro sólo en la última', () => {
    const r = parseQueclink(QUECLINK_FRI_2POS);
    expect(r.readings.map((p) => p.recordedAt)).toEqual([
      '2024-05-18T14:30:00.000Z',
      '2024-05-18T14:30:30.000Z',
    ]);
    expect(r.readings[0].odometerKm).toBeNull();
    expect(r.readings[1].odometerKm).toBe(12350.2);
    expect(r.readings[1].lat).toBe(19.41);
  });

  test('accuracy 0 → no_gps_fix', () => {
    expect(parseQueclink(QUECLINK_NO_FIX).errors[0].code).toBe('no_gps_fix');
  });

  test('GTIGN → ignition=true y eventCode', () => {
    const r = parseQueclink(QUECLINK_IGN);
    expect(r.readings[0]).toMatchObject({ ignition: true, eventCode: 'GTIGN', lat: 19.432608 });
  });

  test('+BUFF:GTSOS (mensaje en buffer) se acepta con eventCode', () => {
    const r = parseQueclink(QUECLINK_BUFF_SOS);
    expect(r.readings[0]).toMatchObject({ eventCode: 'GTSOS', recordedAt: '2024-05-18T14:40:00.000Z' });
  });

  test('heartbeat +ACK:GTHBD → unsupported_message', () => {
    expect(parseQueclink(QUECLINK_HBD).errors[0].code).toBe('unsupported_message');
  });

  test('varios mensajes concatenados por $', () => {
    const r = parseQueclink(QUECLINK_FRI + QUECLINK_BUFF_SOS);
    expect(r.readings).toHaveLength(2);
  });

  test('basura → malformed', () => {
    expect(parseQueclink('hola mundo').errors[0].code).toBe('malformed');
  });
});

describe('Teltonika (JSON reenviado por middleware)', () => {
  test('records → puntos con IO 239 (ignición), 16 (odómetro m), 89 (combustible %)', () => {
    const r = parseTeltonika(TELTONIKA);
    expect(r.errors).toEqual([]);
    expect(r.readings).toHaveLength(2);
    expect(r.readings[0]).toMatchObject({
      externalId: '352093081234567',
      recordedAt: '2024-05-18T14:32:10.000Z',
      lat: 19.432608,
      lng: -99.133209,
      speedKph: 72,
      headingDeg: 184,
      ignition: true,
      odometerKm: 12345.678,
      fuelLevelPct: 64,
      eventCode: null,
    });
    expect(r.readings[1]).toMatchObject({
      recordedAt: new Date(1716043000000).toISOString(),
      ignition: false,
      eventCode: 'io:239',
      odometerKm: null,
    });
  });

  test('satellites 0 → no_gps_fix', () => {
    const r = parseTeltonika({
      imei: '352093081234567',
      records: [{ timestamp: 1716043000000, gps: { lat: 19.4, lng: -99.1, satellites: 0, speed: 0, angle: 0 } }],
    });
    expect(r.errors[0].code).toBe('no_gps_fix');
  });

  test('lat/lng fuera de rango → invalid_coordinates', () => {
    const r = parseTeltonika({
      imei: '352093081234567',
      records: [{ timestamp: 1716043000000, gps: { lat: 190, lng: -99.1, speed: 0, angle: 0 } }],
    });
    expect(r.errors[0].code).toBe('invalid_coordinates');
  });

  test('sin imei → malformed', () => {
    expect(parseTeltonika({ records: [] }).errors[0].code).toBe('malformed');
  });

  test('acepta un arreglo de envíos', () => {
    const r = parseTeltonika([TELTONIKA, { ...TELTONIKA, imei: '352093089999999' }]);
    expect(r.readings).toHaveLength(4);
    expect(new Set(r.readings.map((p) => p.externalId)).size).toBe(2);
  });
});

describe('generic (JSON ya normalizado)', () => {
  test('points → readings', () => {
    const r = parseGeneric({
      points: [
        {
          externalId: 'X-1',
          recordedAt: '2024-05-18T14:32:10-06:00',
          lat: 19.4,
          lng: -99.1,
          speedKph: 50,
          headingDeg: 90,
          ignition: true,
          fuelLevelPct: 40,
        },
      ],
    });
    expect(r.errors).toEqual([]);
    expect(r.readings[0]).toMatchObject({
      externalId: 'X-1',
      recordedAt: '2024-05-18T20:32:10.000Z',
      speedKph: 50,
      odometerKm: null,
      fuelLevelPct: 40,
    });
  });

  test('punto sin externalId → malformed; coords inválidas → invalid_coordinates', () => {
    const r = parseGeneric({
      points: [
        { recordedAt: '2024-05-18T14:32:10Z', lat: 19.4, lng: -99.1 },
        { externalId: 'X-1', recordedAt: '2024-05-18T14:32:10Z', lat: 0, lng: 0 },
        { externalId: 'X-1', recordedAt: 'ayer', lat: 19.4, lng: -99.1 },
      ],
    });
    expect(r.readings).toHaveLength(0);
    expect(r.errors.map((e) => e.code)).toEqual(['malformed', 'invalid_coordinates', 'invalid_timestamp']);
  });

  test('body sin points → malformed', () => {
    expect(parseGeneric('nope').errors[0].code).toBe('malformed');
  });
});

test('ADAPTERS cubre los 4 proveedores', () => {
  expect(Object.keys(ADAPTERS).sort()).toEqual(['generic', 'queclink', 'suntech', 'teltonika']);
});
