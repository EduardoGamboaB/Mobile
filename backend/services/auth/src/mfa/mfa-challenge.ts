/**
 * mfaToken: JWT corto (5 min) que solo prueba "pasó la contraseña, falta el
 * segundo factor". Se firma con un secreto PROPIO (≠ JWT_ACCESS_SECRET) y
 * con audiencia `g3:mfa`, así el gateway jamás lo acepta como access token.
 *
 * El estado por `jti` (vigente, intentos, consumido) vive en un
 * `EphemeralStore`: Redis/Memorystore en producción, compartido entre
 * réplicas de Cloud Run, con operaciones atómicas (INCR para intentos,
 * GETDEL para el uso único).
 */
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { MemoryEphemeralStore, type EphemeralStore } from '@g3/platform';
import type { Clock } from '../clock';
import { AuthError } from '../errors';

export type MfaChallengePurpose = 'verify' | 'enroll';

export interface MfaChallengeConfig {
  secret: string;
  ttlSec?: number;
  maxAttempts?: number;
}

const AUDIENCE = 'g3:mfa';

export class MfaChallengeService {
  readonly ttlSec: number;
  readonly maxAttempts: number;
  private readonly store: EphemeralStore;

  constructor(private readonly cfg: MfaChallengeConfig, private readonly clock: Clock, store?: EphemeralStore) {
    if (!cfg.secret || cfg.secret.length < 32) throw new Error('Secreto de mfaToken muy corto');
    this.ttlSec = cfg.ttlSec ?? 300;
    this.maxAttempts = cfg.maxAttempts ?? 5;
    this.store = store ?? new MemoryEphemeralStore(() => clock.now());
  }

  private keys(jti: string) {
    return { live: `mfa:challenge:${jti}`, attempts: `mfa:attempts:${jti}`, used: `mfa:used:${jti}` };
  }

  private get ttlMs() {
    return this.ttlSec * 1000;
  }

  async issue(userId: string, purpose: MfaChallengePurpose): Promise<{ token: string; expiresInSec: number }> {
    const nowSec = Math.floor(this.clock.now() / 1000);
    const jti = randomUUID();
    const token = jwt.sign(
      { sub: userId, purpose, jti, aud: AUDIENCE, iat: nowSec, exp: nowSec + this.ttlSec },
      this.cfg.secret,
      { algorithm: 'HS256' },
    );
    await this.store.set(this.keys(jti).live, userId, this.ttlMs);
    return { token, expiresInSec: this.ttlSec };
  }

  async verify(token: string, purpose: MfaChallengePurpose): Promise<{ userId: string; jti: string }> {
    let decoded: { sub?: string; purpose?: string; jti?: string };
    try {
      decoded = jwt.verify(token ?? '', this.cfg.secret, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
        clockTimestamp: Math.floor(this.clock.now() / 1000),
      }) as typeof decoded;
    } catch {
      throw new AuthError(401, 'Token MFA inválido o expirado');
    }
    if (!decoded.sub || !decoded.jti || decoded.purpose !== purpose) {
      throw new AuthError(401, 'Token MFA inválido');
    }
    const k = this.keys(decoded.jti);
    const live = await this.store.get(k.live);
    if (!live) {
      if (await this.store.get(k.used)) throw new AuthError(401, 'Token MFA ya usado');
      throw new AuthError(401, 'Token MFA inválido');
    }
    if (Number((await this.store.get(k.attempts)) ?? 0) >= this.maxAttempts) {
      throw new AuthError(429, 'Demasiados intentos. Vuelve a iniciar sesión.');
    }
    return { userId: decoded.sub, jti: decoded.jti };
  }

  /** Cuenta un fallo (INCR atómico: fallos simultáneos en réplicas distintas suman todos). */
  async recordFailure(jti: string): Promise<{ remaining: number; locked: boolean }> {
    const k = this.keys(jti);
    if (!(await this.store.get(k.live))) return { remaining: 0, locked: true };
    const attempts = await this.store.incr(k.attempts, this.ttlMs);
    const remaining = Math.max(0, this.maxAttempts - attempts);
    return { remaining, locked: remaining === 0 };
  }

  /**
   * Consume el reto (uso único, GETDEL). `false` si ya lo había consumido
   * otra petición: quien llama no debe emitir sesión.
   */
  async consume(jti: string): Promise<boolean> {
    const k = this.keys(jti);
    const taken = await this.store.take(k.live);
    if (!taken) return false;
    await this.store.set(k.used, '1', this.ttlMs);
    return true;
  }
}
