/**
 * Códigos de recuperación MFA: 10 por usuario, uso único, 50 bits de
 * entropía cada uno (10 caracteres base32). Se guardan como
 * HMAC-SHA256(pepper, código) — el pepper vive en Secret Manager, así que
 * un dump de la DB por sí solo no permite verificarlos offline.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base32Encode } from './totp';

export const RECOVERY_CODE_COUNT = 10;

export function generateRecoveryCodes(n = RECOVERY_CODE_COUNT): string[] {
  const out = new Set<string>();
  while (out.size < n) {
    const raw = base32Encode(randomBytes(7)).slice(0, 10);
    out.add(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return [...out];
}

export function normalizeRecoveryCode(code: string): string {
  return (code ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '');
}

export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === 10;
}

export class RecoveryCodeHasher {
  constructor(private readonly pepper: string) {
    if (!pepper || pepper.length < 16) throw new Error('Pepper de códigos de recuperación muy corto');
  }

  hash(code: string): string {
    return createHmac('sha256', this.pepper).update(normalizeRecoveryCode(code)).digest('hex');
  }

  matches(code: string, hash: string): boolean {
    const a = Buffer.from(this.hash(code), 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
