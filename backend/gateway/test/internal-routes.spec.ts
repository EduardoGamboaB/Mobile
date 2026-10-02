import { isInternalOnlyPath } from '../src/middleware/internal-routes';

describe('internal-routes: rutas servicio→servicio que el gateway no expone', () => {
  test.each([
    '/api/trips/internal/active-by-vehicle/trc_1',
    '/api/trips/internal',
    '/api/TRIPS/Internal/active-by-vehicle/x',
    '/api/trips/internal/',
  ])('%s se bloquea', (p) => {
    expect(isInternalOnlyPath(p)).toBe(true);
  });

  test.each(['/api/trips', '/api/trips/trp_1', '/api/trips/internalx', '/api/trips/trp_1/internal'])(
    '%s pasa',
    (p) => {
      expect(isInternalOnlyPath(p)).toBe(false);
    },
  );
});

describe('internal-routes: cambio de plan de billing', () => {
  test.each([
    '/api/subscriptions/apply-tier',
    '/api/subscriptions/start-trial',
    '/api/Subscriptions/Apply-Tier',
    '/api/subscriptions/x/../apply-tier',
    '/api/subscriptions/%61pply-tier',
  ])('%s se bloquea (escalada de plan)', (p) => {
    expect(isInternalOnlyPath(p)).toBe(true);
  });

  test.each(['/api/subscriptions/me', '/api/subscriptions/checkout', '/api/subscriptions/cancel'])('%s pasa', (p) => {
    expect(isInternalOnlyPath(p)).toBe(false);
  });
});
