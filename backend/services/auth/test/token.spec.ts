import { JwtTokenIssuer } from '../src/token.issuer';
import type { JwtPayload } from '@g3/contracts';

describe('JwtTokenIssuer', () => {
  const issuer = new JwtTokenIssuer({
    accessSecret: 'a'.repeat(32),
    refreshSecret: 'b'.repeat(32),
    accessTtlSec: 3600,
    refreshTtlSec: 86400,
  });

  const payload: JwtPayload = {
    sub: 'usr_1',
    email: 'owner@acme.mx',
    role: 'owner',
    companyId: 'cmp_1',
    tier: 'free',
  };

  test('issue() devuelve access y refresh tokens distintos', () => {
    const t = issuer.issue(payload);
    expect(t.accessToken).toBeTruthy();
    expect(t.refreshToken).toBeTruthy();
    expect(t.accessToken).not.toBe(t.refreshToken);
  });

  test('verifyAccess decodifica el payload con las claims completas', () => {
    const { accessToken } = issuer.issue(payload);
    const decoded = issuer.verifyAccess(accessToken);
    expect(decoded.sub).toBe('usr_1');
    expect(decoded.companyId).toBe('cmp_1');
    expect(decoded.tier).toBe('free');
    expect(decoded.role).toBe('owner');
  });

  test('verifyRefresh rechaza un access token (secretos distintos)', () => {
    const { accessToken } = issuer.issue(payload);
    expect(() => issuer.verifyRefresh(accessToken)).toThrow();
  });

  test('verifyAccess rechaza un refresh token', () => {
    const { refreshToken } = issuer.issue(payload);
    expect(() => issuer.verifyAccess(refreshToken)).toThrow();
  });

  test('verifyAccess rechaza token con firma manipulada', () => {
    const { accessToken } = issuer.issue(payload);
    const tampered = accessToken.slice(0, -4) + 'xxxx';
    expect(() => issuer.verifyAccess(tampered)).toThrow();
  });
});
