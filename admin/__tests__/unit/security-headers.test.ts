// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildCsp, securityHeaders, originOf } = require('../../security-headers') as {
  buildCsp: (o?: { apiUrl?: string; dev?: boolean; meta?: boolean }) => string;
  securityHeaders: (o?: { apiUrl?: string; dev?: boolean }) => { key: string; value: string }[];
  originOf: (u?: string) => string | null;
};

describe('headers de seguridad', () => {
  test('CSP de producción: connect-src al API configurado, sin eval ni websockets', () => {
    const csp = buildCsp({ apiUrl: 'https://gw.g3.mx/api/', dev: false });
    expect(csp).toContain("connect-src 'self' https://gw.g3.mx;");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('ws:');
  });

  test('CSP de desarrollo permite Fast Refresh; la variante <meta> no lleva frame-ancestors', () => {
    const dev = buildCsp({ apiUrl: 'http://localhost:8080', dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('connect-src \'self\' http://localhost:8080 ws: wss:');
    expect(buildCsp({ dev: false, meta: true })).not.toContain('frame-ancestors');
  });

  test('URLs inválidas no entran a la CSP', () => {
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf('')).toBeNull();
    expect(buildCsp({ apiUrl: 'no es url', dev: false })).toContain("connect-src 'self';");
  });

  test('set completo de headers', () => {
    const h = Object.fromEntries(securityHeaders({ apiUrl: 'https://gw.g3.mx', dev: false }).map((x) => [x.key, x.value]));
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['Strict-Transport-Security']).toContain('max-age=');
    expect(securityHeaders({ dev: true }).some((x) => x.key === 'Strict-Transport-Security')).toBe(false);
  });
});
