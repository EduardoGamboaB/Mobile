import { randomBytes } from 'crypto';
import { generateRecoveryCodes, RecoveryCodeHasher } from '../src/mfa/recovery-codes';
import { AesGcmSecretCipher } from '../src/mfa/secret-cipher';
import { MfaChallengeService } from '../src/mfa/mfa-challenge';
import { ManualClock } from '../src/clock';

describe('códigos de recuperación', () => {
  test('genera 10 códigos únicos con formato XXXXX-XXXXX', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
  });

  test('hash es determinista por pepper, no revela el código y normaliza formato', () => {
    const h = new RecoveryCodeHasher('pepper-de-prueba-32-caracteres!!');
    const [code] = generateRecoveryCodes(1);
    const hashed = h.hash(code);
    expect(hashed).not.toContain(code);
    expect(h.matches(code, hashed)).toBe(true);
    expect(h.matches(code.toLowerCase().replace('-', ' '), hashed)).toBe(true);
    expect(h.matches('AAAAA-AAAAA', hashed)).toBe(false);
  });

  test('pepper distinto produce hash distinto', () => {
    const [code] = generateRecoveryCodes(1);
    expect(new RecoveryCodeHasher('a'.repeat(32)).hash(code)).not.toBe(
      new RecoveryCodeHasher('b'.repeat(32)).hash(code),
    );
  });
});

describe('AesGcmSecretCipher (secreto TOTP cifrado en reposo)', () => {
  const key = randomBytes(32);

  test('round-trip y ciphertext no contiene el secreto', () => {
    const c = new AesGcmSecretCipher(key);
    const blob = c.encrypt('JBSWY3DPEHPK3PXP');
    expect(blob).not.toContain('JBSWY3DPEHPK3PXP');
    expect(blob.startsWith('v1.')).toBe(true);
    expect(c.decrypt(blob)).toBe('JBSWY3DPEHPK3PXP');
  });

  test('IV aleatorio: dos cifrados del mismo valor difieren', () => {
    const c = new AesGcmSecretCipher(key);
    expect(c.encrypt('X')).not.toBe(c.encrypt('X'));
  });

  test('detecta manipulación (auth tag GCM)', () => {
    const c = new AesGcmSecretCipher(key);
    const blob = c.encrypt('JBSWY3DPEHPK3PXP');
    const parts = blob.split('.');
    const ct = Buffer.from(parts[3], 'base64url');
    ct[0] ^= 0xff;
    parts[3] = ct.toString('base64url');
    expect(() => c.decrypt(parts.join('.'))).toThrow();
  });

  test('rechaza llaves que no son de 256 bits', () => {
    expect(() => new AesGcmSecretCipher(randomBytes(16))).toThrow(/32 bytes/);
  });
});

describe('MfaChallengeService (mfaToken de 5 min, propósito único)', () => {
  function build() {
    const clock = new ManualClock(Date.parse('2026-10-01T12:00:00Z'));
    const svc = new MfaChallengeService({ secret: 'm'.repeat(32), ttlSec: 300, maxAttempts: 5 }, clock);
    return { clock, svc };
  }

  test('emite y verifica token con el propósito correcto', () => {
    const { svc } = build();
    const { token, expiresInSec } = svc.issue('usr_1', 'verify');
    expect(expiresInSec).toBe(300);
    expect(svc.verify(token, 'verify').userId).toBe('usr_1');
  });

  test('rechaza token de otro propósito', () => {
    const { svc } = build();
    const { token } = svc.issue('usr_1', 'enroll');
    expect(() => svc.verify(token, 'verify')).toThrow(/inválido/i);
  });

  test('expira a los 5 minutos', () => {
    const { svc, clock } = build();
    const { token } = svc.issue('usr_1', 'verify');
    clock.advance(301_000);
    expect(() => svc.verify(token, 'verify')).toThrow(/inválido|expir/i);
  });

  test('rate-limit: tras 5 fallos el token queda bloqueado', () => {
    const { svc } = build();
    const { token } = svc.issue('usr_1', 'verify');
    const { jti } = svc.verify(token, 'verify');
    for (let i = 0; i < 4; i++) expect(svc.recordFailure(jti).locked).toBe(false);
    expect(svc.recordFailure(jti)).toEqual({ remaining: 0, locked: true });
    expect(() => svc.verify(token, 'verify')).toThrow(/intentos/i);
  });

  test('uso único: tras consume() no se puede reutilizar', () => {
    const { svc } = build();
    const { token } = svc.issue('usr_1', 'verify');
    svc.consume(svc.verify(token, 'verify').jti);
    expect(() => svc.verify(token, 'verify')).toThrow(/usado|inválido/i);
  });

  test('rechaza token firmado con otro secreto (p.ej. un access token)', () => {
    const { svc, clock } = build();
    const other = new MfaChallengeService({ secret: 'z'.repeat(32), ttlSec: 300, maxAttempts: 5 }, clock);
    const { token } = other.issue('usr_1', 'verify');
    expect(() => svc.verify(token, 'verify')).toThrow(/inválido/i);
  });
});
