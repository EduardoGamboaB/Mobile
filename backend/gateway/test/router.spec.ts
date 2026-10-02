import { resolveUpstream, type ServiceUrls } from '../src/proxy/router';

const URLS: ServiceUrls = {
  auth: 'http://auth',
  billing: 'http://billing',
  drivers: 'http://drivers',
  fleet: 'http://fleet',
  trips: 'http://trips',
  alerts: 'http://alerts',
  ai: 'http://ai',
};

describe('router — rutas de seguridad', () => {
  test.each([
    '/api/auth/mfa/verify',
    '/api/auth/mfa/status',
    '/api/auth/sso/callback',
    '/api/auth/security-policy',
    '/api/users/usr_1/role',
    '/api/audit/events',
    '/api/audit/verify',
  ])('%s → auth-service', (path) => {
    expect(resolveUpstream(path, URLS)).toBe('http://auth');
  });

  test('/api/auditoria no matchea /api/audit', () => {
    expect(resolveUpstream('/api/auditoria', URLS)).toBeNull();
  });
});
