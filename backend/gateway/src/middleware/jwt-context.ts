import * as jwt from 'jsonwebtoken';
import type { JwtPayload, TierValue } from '@g3/contracts';

export interface RequestContext {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  tier: TierValue;
}

export function extractContext(authHeader: string | undefined, secret: string): RequestContext {
  if (!authHeader) throw new Error('Authorization header missing');
  if (!authHeader.startsWith('Bearer ')) throw new Error('Expected Bearer token');
  const token = authHeader.slice('Bearer '.length).trim();
  const decoded = jwt.verify(token, secret) as JwtPayload;
  if (!decoded.sub || !decoded.companyId || !decoded.tier) {
    throw new Error('JWT missing required claims (sub, companyId, tier)');
  }
  return {
    userId: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    companyId: decoded.companyId,
    tier: decoded.tier,
  };
}
