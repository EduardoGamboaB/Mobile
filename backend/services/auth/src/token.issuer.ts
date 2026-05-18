import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '@g3/contracts';

export interface TokenIssuerConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSec: number;
  refreshTtlSec: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export class JwtTokenIssuer {
  constructor(private readonly cfg: TokenIssuerConfig) {}

  issue(payload: JwtPayload): IssuedTokens {
    const accessToken = jwt.sign(payload, this.cfg.accessSecret, {
      expiresIn: this.cfg.accessTtlSec,
    });
    const refreshToken = jwt.sign({ sub: payload.sub, kind: 'refresh' }, this.cfg.refreshSecret, {
      expiresIn: this.cfg.refreshTtlSec,
    });
    return { accessToken, refreshToken };
  }

  verifyAccess(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.cfg.accessSecret) as JwtPayload & { kind?: string };
    if (decoded.kind === 'refresh') {
      throw new Error('Token type mismatch');
    }
    return decoded;
  }

  verifyRefresh(token: string): { sub: string } {
    const decoded = jwt.verify(token, this.cfg.refreshSecret) as { sub: string; kind?: string };
    if (decoded.kind !== 'refresh') {
      throw new Error('Token type mismatch');
    }
    return { sub: decoded.sub };
  }
}
