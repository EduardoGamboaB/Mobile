/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) con `crypto` nativo de Node — sin
 * dependencias. HMAC-SHA1, 6 dígitos y paso de 30 s: lo que esperan Google
 * Authenticator, Microsoft Authenticator, 1Password, Authy, etc.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Secreto base32 inválido');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export interface TotpOptions {
  digits?: number;
  stepSec?: number;
}

/** HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^digits */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  // contador de 64 bits big-endian (los vectores del RFC 6238 superan 2^32 pasos)
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export function totpStep(nowMs: number, stepSec = 30): number {
  return Math.floor(nowMs / 1000 / stepSec);
}

export function totp(secret: Buffer, nowMs: number, opts: TotpOptions = {}): string {
  return hotp(secret, totpStep(nowMs, opts.stepSec ?? 30), opts.digits ?? 6);
}

export interface VerifyTotpOptions extends TotpOptions {
  /** Pasos aceptados antes/después del actual. Default 1 (±30 s). */
  window?: number;
  /** Anti-replay: sólo acepta pasos estrictamente mayores a éste. */
  afterStep?: number | null;
}

export type VerifyTotpResult = { ok: true; step: number } | { ok: false };

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyTotp(
  secret: Buffer,
  code: string,
  nowMs: number,
  opts: VerifyTotpOptions = {},
): VerifyTotpResult {
  const digits = opts.digits ?? 6;
  const window = opts.window ?? 1;
  const normalized = (code ?? '').replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return { ok: false };
  const current = totpStep(nowMs, opts.stepSec ?? 30);
  let matched: number | null = null;
  // Recorre toda la ventana sin cortocircuito (tiempo constante por ventana).
  for (let delta = -window; delta <= window; delta++) {
    const step = current + delta;
    if (step < 0) continue;
    if (safeEqual(hotp(secret, step, digits), normalized) && matched === null) matched = step;
  }
  if (matched === null) return { ok: false };
  if (opts.afterStep != null && matched <= opts.afterStep) return { ok: false };
  return { ok: true, step: matched };
}

/** 20 bytes = 160 bits (tamaño recomendado por RFC 4226 para SHA1). */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function buildOtpauthUri(p: { issuer: string; account: string; secret: string }): string {
  const issuer = encodeURIComponent(p.issuer);
  const account = encodeURIComponent(p.account);
  return (
    `otpauth://totp/${issuer}:${account}?secret=${p.secret}` +
    `&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
  );
}
