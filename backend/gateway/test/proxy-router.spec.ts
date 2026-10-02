import { resolveUpstream, type ServiceUrls } from '../src/proxy/router';

const URLS: ServiceUrls = {
  auth: 'http://auth:8081',
  billing: 'http://billing:8082',
  drivers: 'http://drivers:8083',
  fleet: 'http://fleet:8084',
  trips: 'http://trips:8085',
  alerts: 'http://alerts:8086',
  ai: 'http://ai:8087',
};

describe('proxy router: rutea /api/<resource>/* al microservicio correcto', () => {
  test.each<[string, string]>([
    ['/api/auth/login', URLS.auth],
    ['/api/auth/register-company', URLS.auth],
    ['/api/auth/refresh', URLS.auth],
    ['/api/subscriptions/me', URLS.billing],
    ['/api/subscriptions/catalog', URLS.billing],
    ['/api/subscriptions/checkout', URLS.billing],
    ['/api/companies/me', URLS.auth],
    ['/api/drivers', URLS.drivers],
    ['/api/drivers/drv_123', URLS.drivers],
    ['/api/tractors', URLS.fleet],
    ['/api/tractors/live/positions', URLS.fleet],
    ['/api/trailers/trl_123', URLS.fleet],
    ['/api/trips', URLS.trips],
    ['/api/trips/trp_x/release-payment', URLS.trips],
    ['/api/trips/mine', URLS.trips],
    ['/api/expense-policy', URLS.trips],
    ['/api/alerts', URLS.alerts],
    ['/api/ai/classify-logbook', URLS.ai],
    ['/api/ai/extract-evidence', URLS.ai],
    ['/api/devices', URLS.fleet],
    ['/api/devices/dev_1/link', URLS.fleet],
    ['/api/vehicles/trc_1/track', URLS.fleet],
    ['/api/telemetry/ingest/queclink', URLS.fleet],
    ['/api/telemetry/ingest-tokens', URLS.fleet],
  ])('%s → %s', (path, expected) => {
    expect(resolveUpstream(path, URLS)).toBe(expected);
  });

  test('rutas no mapeadas devuelven null', () => {
    expect(resolveUpstream('/api/unknown/x', URLS)).toBeNull();
  });

  test('rutas fuera de /api devuelven null', () => {
    expect(resolveUpstream('/health', URLS)).toBeNull();
  });
});
