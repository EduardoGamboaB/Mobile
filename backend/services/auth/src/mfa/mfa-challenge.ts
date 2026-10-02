/**
 * mfaToken: JWT corto (5 min) que solo prueba "pasó la contraseña, falta el
 * segundo factor". Se firma con un secreto PROPIO (≠ JWT_ACCESS_SECRET) y
 * con audiencia `g3:mfa`, así el gateway jamás lo acepta como access token.
 *
 * El estado (intentos, consumido) vive en memoria por `jti`. En producción
 * debe ir a Redis/Memorystore para compartirse entre réplicas de Cloud Run.
 */
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { Clock } from '../clock';
import { AuthError } from '../errors';

export type MfaChallengePurpose = 'verify' | 'enroll';

export interface MfaChallengeConfig {
  secret: string;
  ttlSec?: number;
  maxAttempts?: number;
}

interface ChallengeState {
  attempts: number;
  consumed: boolean;
  expMs: number;
}

const AUDIENCE = 'g3:mfa';

export class MfaChallengeService {
  private readonly state = new Map<string, ChallengeState>();
  readonly ttlSec: number;
  readonly maxAttempts: number;

  constructor(private readonly cfg: MfaChallengeConfig, private readonly clock: Clock) {
    if (!cfg.secret || cfg.secret.length < 32) throw new Error('Secreto de mfaToken muy corto');
    this.ttlSec = cfg.ttlSec ?? 300;
    this.maxAttempts = cfg.maxAttempts ?? 5;
  }

  issue(userId: string, purpose: MfaChallengePurpose): { token: string; expiresInSec: number } {
    this.gc();
    const nowSec = Math.floor(this.clock.now() / 1000);
    const jti = randomUUID();
    const token = jwt.sign(
      { sub: userId, purpose, jti, aud: AUDIENCE, iat: nowSec, exp: nowSec + this.ttlSec },
      this.cfg.secret,
      { algorithm: 'HS256' },
    );
    this.state.set(jti, { attempts: 0, consumed: false, expMs: (nowSec + this.ttlSec) * 1000 });
    return { token, expiresInSec: this.ttlSec };
  }

  verify(token: string, purpose: MfaChallengePurpose): { userId: string; jti: string } {
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
    const st = this.state.get(decoded.jti);
    if (!st) throw new AuthError(401, 'Token MFA inválido');
    if (st.consumed) throw new AuthError(401, 'Token MFA ya usado');
    if (st.attempts >= this.maxAttempts) {
      throw new AuthError(429, 'Demasiados intentos. Vuelve a iniciar sesión.');
    }
    return { userId: decoded.sub, jti: decoded.jti };
  }

  recordFailure(jti: string): { remaining: number; locked: boolean } {
    const st = this.state.get(jti);
    if (!st) return { remaining: 0, locked: true };
    st.attempts += 1;
    const remaining = Math.max(0, this.maxAttempts - st.attempts);
    return { remaining, locked: remaining === 0 };
  }

  consume(jti: string): void {
    const st = this.state.get(jti);
    if (st) st.consumed = true;
  }

  private gc(): void {
    const now = this.clock.now();
    for (const [k, v] of this.state) if (v.expMs < now) this.state.delete(k);
  }
}
