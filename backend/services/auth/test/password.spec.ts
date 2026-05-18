import { BcryptPasswordHasher } from '../src/password.hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(4); // rounds bajos para test rápido

  test('hash produce salida distinta al plaintext', async () => {
    const h = await hasher.hash('secret123');
    expect(h).not.toBe('secret123');
    expect(h.length).toBeGreaterThan(20);
  });

  test('verify acepta la misma contraseña', async () => {
    const h = await hasher.hash('secret123');
    expect(await hasher.verify('secret123', h)).toBe(true);
  });

  test('verify rechaza contraseña incorrecta', async () => {
    const h = await hasher.hash('secret123');
    expect(await hasher.verify('wrong', h)).toBe(false);
  });

  test('hash de la misma contraseña con salts distintos produce hashes distintos', async () => {
    const h1 = await hasher.hash('secret123');
    const h2 = await hasher.hash('secret123');
    expect(h1).not.toBe(h2);
  });
});
