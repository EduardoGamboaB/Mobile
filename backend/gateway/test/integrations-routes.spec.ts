import { resolveUpstream, type ServiceUrls } from '../src/proxy/router';
import { isInternalOnlyPath as isBlockedPath } from '../src/middleware/internal-routes';

const URLS: ServiceUrls = {
  auth: 'http://auth',
  billing: 'http://billing',
  drivers: 'http://drivers',
  fleet: 'http://fleet',
  trips: 'http://trips',
  alerts: 'http://alerts',
  ai: 'http://ai',
  integrations: 'http://integrations',
};

describe('gateway — módulo de integraciones', () => {
  test.each([
    '/api/integrations',
    '/api/integrations/catalog',
    '/api/integrations/sms/default',
    '/api/integrations/pac/backup/test',
  ])('%s → integrations-service', (path) => {
    expect(resolveUpstream(path, URLS)).toBe('http://integrations');
    expect(isBlockedPath(path)).toBe(false);
  });

  test('/api/integrationsx no matchea', () => {
    expect(resolveUpstream('/api/integrationsx', URLS)).toBeNull();
  });

  test.each([
    '/api/integrations/internal/resolve',
    '/api/integrations/internal',
    '/api/integrations/INTERNAL/resolve',
    '/api/integrations//internal/resolve',
    '//api/integrations/internal/resolve',
    '/api/integrations/%69nternal/resolve',
    '/api/integrations%2Finternal%2Fresolve',
    '/api/integrations/sms/../internal/resolve',
    '/api/integrations/./internal/resolve',
    '/api/integrations/sms/%2e%2e/internal/resolve',
    '/api/integrations\\internal\\resolve',
    '/api/trips/x/../internal/active-by-vehicle/trc_1',
  ])('bloquea la ruta interna: %s', (path) => {
    expect(isBlockedPath(path)).toBe(true);
  });

  test('no bloquea otras rutas', () => {
    expect(isBlockedPath('/api/incidents/escalations/run')).toBe(false);
    expect(isBlockedPath('/api/integrations/internalx')).toBe(false);
    expect(isBlockedPath('/api/trips')).toBe(false);
  });
});
