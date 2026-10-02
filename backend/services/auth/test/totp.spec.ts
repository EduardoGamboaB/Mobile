import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotpSecret,
  hotp,
  totp,
  verifyTotp,
} from '../src/mfa/totp';

const RFC_SECRET_SHA1 = Buffer.from('12345678901234567890', 'ascii');

describe('base32 (RFC 4648)', () => {
  test.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encode/decode %p ↔ %p (sin padding)', (plain, encoded) => {
    expect(base32Encode(Buffer.from(plain, 'ascii'))).toBe(encoded);
    expect(base32Decode(encoded).toString('ascii')).toBe(plain);
  });

  test('decode tolera minúsculas, espacios y padding', () => {
    expect(base32Decode('mzxw 6ytb oi======').toString('ascii')).toBe('foobar');
  });

  test('decode rechaza caracteres fuera del alfabeto', () => {
    expect(() => base32Decode('MZXW1')).toThrow(/base32/i);
  });
});

describe('HOTP (RFC 4226, apéndice D)', () => {
  const expected = [
    '755224', '287082', '359152', '969429', '338314',
    '254676', '287922', '162583', '399871', '520489',
  ];
  test.each(expected.map((code, counter) => [counter, code]))('counter %p → %p', (counter, code) => {
    expect(hotp(RFC_SECRET_SHA1, counter as number)).toBe(code);
  });
});

describe('TOTP (RFC 6238, apéndice B — SHA1, 8 dígitos)', () => {
  test.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('T=%p → %p', (unixSec, code) => {
    expect(totp(RFC_SECRET_SHA1, unixSec * 1000, { digits: 8 })).toBe(code);
  });

  test('default: 6 dígitos, paso de 30 s', () => {
    // últimos 6 dígitos del vector de 8 en T=59
    expect(totp(RFC_SECRET_SHA1, 59_000)).toBe('287082');
  });
});

describe('verifyTotp — ventana ±1 paso', () => {
  const secret = RFC_SECRET_SHA1;
  const now = 1_700_000_000_000;

  test('acepta el código del paso actual y devuelve el step', () => {
    const r = verifyTotp(secret, totp(secret, now), now);
    expect(r).toEqual({ ok: true, step: Math.floor(now / 1000 / 30) });
  });

  test('acepta el paso anterior y el siguiente (desfase de reloj)', () => {
    expect(verifyTotp(secret, totp(secret, now - 30_000), now).ok).toBe(true);
    expect(verifyTotp(secret, totp(secret, now + 30_000), now).ok).toBe(true);
  });

  test('rechaza ±2 pasos', () => {
    expect(verifyTotp(secret, totp(secret, now - 60_000), now).ok).toBe(false);
    expect(verifyTotp(secret, totp(secret, now + 60_000), now).ok).toBe(false);
  });

  test('rechaza formato inválido sin lanzar', () => {
    expect(verifyTotp(secret, 'abc123', now).ok).toBe(false);
    expect(verifyTotp(secret, '', now).ok).toBe(false);
    expect(verifyTotp(secret, '1234567', now).ok).toBe(false);
  });

  test('anti-replay: rechaza pasos <= último usado', () => {
    const code = totp(secret, now);
    const step = Math.floor(now / 1000 / 30);
    expect(verifyTotp(secret, code, now, { afterStep: step }).ok).toBe(false);
    expect(verifyTotp(secret, code, now, { afterStep: step - 1 }).ok).toBe(true);
  });
});

describe('secreto y URI otpauth', () => {
  test('generateTotpSecret produce 160 bits en base32 (32 chars) y es aleatorio', () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
    expect(base32Decode(a).length).toBe(20);
  });

  test('buildOtpauthUri arma URI estándar para el QR', () => {
    const uri = buildOtpauthUri({ issuer: 'G3 Admin', account: 'ana@acme.mx', secret: 'JBSWY3DPEHPK3PXP' });
    expect(uri).toBe(
      'otpauth://totp/G3%20Admin:ana%40acme.mx?secret=JBSWY3DPEHPK3PXP&issuer=G3%20Admin&algorithm=SHA1&digits=6&period=30',
    );
  });
});
