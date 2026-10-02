import { TELEMETRY_PROVIDERS, TelemetryEventType, isTelemetryProvider } from '../src';

describe('telemetry contracts', () => {
  test('proveedores soportados', () => {
    expect(TELEMETRY_PROVIDERS).toEqual(['suntech', 'teltonika', 'queclink', 'generic']);
  });

  test.each<[unknown, boolean]>([
    ['suntech', true],
    ['generic', true],
    ['garmin', false],
    ['', false],
    [undefined, false],
    [1, false],
  ])('isTelemetryProvider(%p) → %p', (v, expected) => {
    expect(isTelemetryProvider(v)).toBe(expected);
  });

  test('tipo de evento de posición', () => {
    expect(TelemetryEventType.PositionReceived).toBe('telemetry.position_received');
  });
});
