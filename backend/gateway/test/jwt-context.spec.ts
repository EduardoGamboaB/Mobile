import * as jwt from 'jsonwebtoken';
import { extractContext } from '../src/middleware/jwt-context';

const SECRET = 'a'.repeat(32);

function token(payload: Record<string, unknown>) {
  return jwt.sign(payload, SECRET, { expiresIn: 3600 });
}

describe('jwt-context middleware: extrae {userId, companyId, tier} del JWT', () => {
  test('decodifica un Bearer válido', () => {
    const t = token({
      sub: 'usr_1', email: 'a@b.c', role: 'owner', companyId: 'cmp_1', tier: 'pro',
    });
    const ctx = extractContext(`Bearer ${t}`, SECRET);
    expect(ctx).toMatchObject({
      userId: 'usr_1',
      companyId: 'cmp_1',
      tier: 'pro',
      role: 'owner',
    });
  });

  test('propaga driverId para usuarios chofer (alcance de G3 Drive)', () => {
    const t = token({
      sub: 'usr_9', email: 'd@b.c', role: 'driver', companyId: 'cmp_1', tier: 'starter', driverId: 'drv_9',
    });
    expect(extractContext(`Bearer ${t}`, SECRET).driverId).toBe('drv_9');
    const admin = token({ sub: 'usr_1', email: 'a@b.c', role: 'owner', companyId: 'cmp_1', tier: 'pro' });
    expect(extractContext(`Bearer ${admin}`, SECRET).driverId).toBeUndefined();
  });

  test('rechaza header faltante', () => {
    expect(() => extractContext(undefined, SECRET)).toThrow(/missing/i);
  });

  test('rechaza formato sin Bearer', () => {
    expect(() => extractContext('no-bearer-prefix', SECRET)).toThrow(/bearer/i);
  });

  test('rechaza firma manipulada', () => {
    const t = token({ sub: 'x', companyId: 'c', tier: 'free', role: 'driver', email: 'x@x.x' });
    const tampered = t.slice(0, -4) + 'XXXX';
    expect(() => extractContext(`Bearer ${tampered}`, SECRET)).toThrow();
  });

  test('rechaza JWT sin claims requeridas', () => {
    const t = token({ sub: 'x' }); // sin companyId/tier
    expect(() => extractContext(`Bearer ${t}`, SECRET)).toThrow(/claims/i);
  });
});
