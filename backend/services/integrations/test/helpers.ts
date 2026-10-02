import { randomBytes } from 'crypto';
import type { FetchLike, HttpRequestInit } from '@g3/integrations';
import { IntegrationsService, type IntegrationsServiceDeps, type RequestCtx } from '../src/integrations.service';
import { InMemoryIntegrationRepo } from '../src/integrations.repo';
import { AesGcmSecretCipher } from '../src/secret-cipher';
import { RecordingAuditSink } from '../src/audit';

export const PLATFORM = 'cmp_g3';
export const TWILIO_SID = 'AC' + 'f'.repeat(32);
export const TWILIO_TOKEN = 'twilio-token-0123456789abcd';

export const ctxOf = (companyId: string, role: string, userId = `usr_${role}`): RequestCtx => ({ companyId, role, userId, ip: '10.0.0.1', userAgent: 'jest' });
export const platformAdmin = ctxOf(PLATFORM, 'admin');
export const owner = ctxOf('cmp_a', 'owner');
export const dispatcher = ctxOf('cmp_a', 'dispatcher');
export const driver = ctxOf('cmp_a', 'driver');
export const otherOwner = ctxOf('cmp_b', 'owner');

export interface FakeHttp {
  fetch: FetchLike;
  calls: { url: string; init: HttpRequestInit }[];
  reply: { status: number; body: unknown };
}

export function fakeHttp(status = 200, body: unknown = { status: 'active' }): FakeHttp {
  const h: FakeHttp = {
    calls: [],
    reply: { status, body },
    fetch: async (url, init) => {
      h.calls.push({ url, init });
      return { ok: h.reply.status < 300, status: h.reply.status, text: async () => JSON.stringify(h.reply.body) };
    },
  };
  return h;
}

export class FakeRefResolver {
  constructor(readonly values: Record<string, string> = {}) {}
  async resolve(v: string) {
    if (!/^(env|gsm):/.test(v)) return v;
    const hit = this.values[v];
    if (hit === undefined) throw new Error(`referencia sin valor: ${v}`);
    return hit;
  }
}

export function build(over: Partial<IntegrationsServiceDeps> = {}) {
  const repo = new InMemoryIntegrationRepo();
  const audit = new RecordingAuditSink();
  const http = fakeHttp();
  const key = randomBytes(32);
  const deps: IntegrationsServiceDeps = {
    repo,
    cipher: new AesGcmSecretCipher(key),
    secrets: new FakeRefResolver({ 'gsm:projects/g3-prod/secrets/twilio/versions/1': 'from-gsm-token-xyz', 'env:TW_TOKEN': 'from-env-token' }),
    audit,
    fetch: http.fetch,
    env: {},
    platformCompanyId: PLATFORM,
    now: () => new Date('2026-10-02T12:00:00.000Z'),
    ...over,
  };
  return { svc: new IntegrationsService(deps), repo, audit, http, deps, key };
}

/** `OMIT` = no mandar el campo authToken (para probar que se conserva). */
export const OMIT = Symbol('omit');
export const twilio = (authToken: string | null | typeof OMIT = TWILIO_TOKEN, extra: Record<string, string | boolean | null> = {}) => ({
  provider: 'twilio',
  enabled: true,
  values: { accountSid: TWILIO_SID, from: '+15005550006', ...(authToken === OMIT ? {} : { authToken }), ...extra },
});

export async function status(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    return (e as { status?: number }).status ?? 500;
  }
}
