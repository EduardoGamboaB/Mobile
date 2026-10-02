/**
 * Adaptadores OIDC detrás de interfaces, para que `SsoService` sea 100 %
 * testeable sin red:
 *
 *  - OidcDiscovery            → metadata del IdP (.well-known)
 *  - TokenExchanger           → canje authorization_code + PKCE → id_token
 *  - IdTokenSignatureVerifier → SOLO firma del id_token (las claims las
 *                               valida `validateIdTokenClaims`)
 *  - SecretResolver           → client_secret desde Secret Manager
 *
 * Hay implementación real (fetch / JWKS RS256) y stub para tests.
 */
import { createPublicKey, type JsonWebKey as NodeJwk } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { SsoProvider } from '@g3/contracts';

export interface OidcProviderMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

export interface OidcDiscovery {
  get(issuer: string): Promise<OidcProviderMetadata>;
}

export interface TokenExchangeInput {
  tokenEndpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

export interface TokenExchanger {
  exchange(input: TokenExchangeInput): Promise<{ idToken: string }>;
}

export interface IdTokenSignatureVerifier {
  /** Verifica firma y devuelve las claims SIN validarlas (eso es aparte). */
  verify(idToken: string, ctx: { jwksUri: string }): Promise<Record<string, unknown>>;
}

export interface SecretResolver {
  resolve(ref: string): Promise<string>;
}

// ------------------------------------------------------------------ discovery

/**
 * Metadata conocida de Google y Microsoft Entra (evita un round-trip y sirve
 * de stub en tests). Para un IdP genérico usa `FetchOidcDiscovery`.
 */
export class StaticOidcDiscovery implements OidcDiscovery {
  async get(issuer: string): Promise<OidcProviderMetadata> {
    if (issuer === 'https://accounts.google.com') {
      return {
        issuer,
        authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token',
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
      };
    }
    const ms = /^https:\/\/login\.microsoftonline\.com\/([0-9a-f-]{36})\/v2\.0$/i.exec(issuer);
    if (ms) {
      const base = `https://login.microsoftonline.com/${ms[1]}`;
      return {
        issuer,
        authorization_endpoint: `${base}/oauth2/v2.0/authorize`,
        token_endpoint: `${base}/oauth2/v2.0/token`,
        jwks_uri: `${base}/discovery/v2.0/keys`,
      };
    }
    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
    };
  }
}

export class FetchOidcDiscovery implements OidcDiscovery {
  private readonly cache = new Map<string, { at: number; meta: OidcProviderMetadata }>();
  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly ttlMs = 60 * 60_000) {}

  async get(issuer: string): Promise<OidcProviderMetadata> {
    const hit = this.cache.get(issuer);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.meta;
    const res = await this.fetchImpl(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!res.ok) throw new Error(`Discovery OIDC falló (${res.status})`);
    const meta = (await res.json()) as OidcProviderMetadata;
    // RFC 8414 §3.3 / OIDC Discovery §4.3: el issuer debe ser idéntico (anti mix-up)
    if (meta.issuer !== issuer) throw new Error('El issuer de la metadata no coincide con el configurado');
    for (const k of ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const) {
      if (!meta[k]?.startsWith('https://')) throw new Error(`Metadata OIDC inválida: ${k}`);
    }
    this.cache.set(issuer, { at: Date.now(), meta });
    return meta;
  }
}

// -------------------------------------------------------------- token exchange

export class FetchTokenExchanger implements TokenExchanger {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async exchange(i: TokenExchangeInput): Promise<{ idToken: string }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: i.code,
      redirect_uri: i.redirectUri,
      client_id: i.clientId,
      client_secret: i.clientSecret,
      code_verifier: i.codeVerifier,
    });
    const res = await this.fetchImpl(i.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: body.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
    if (!res.ok || !json.id_token) throw new Error(`Canje de código OIDC falló: ${json.error ?? res.status}`);
    return { idToken: json.id_token };
  }
}

export class StubTokenExchanger implements TokenExchanger {
  readonly calls: TokenExchangeInput[] = [];
  private next: string | null = null;

  respondWith(idToken: string): void {
    this.next = idToken;
  }

  async exchange(input: TokenExchangeInput): Promise<{ idToken: string }> {
    this.calls.push({ ...input });
    if (!this.next) throw new Error('StubTokenExchanger sin id_token configurado');
    const idToken = this.next;
    this.next = null;
    return { idToken };
  }
}

// ------------------------------------------------------------ firma id_token

/** Stub para tests: el "IdP" firma con HS256 y una llave compartida. */
export class HmacTestSignatureVerifier implements IdTokenSignatureVerifier {
  constructor(private readonly key: string) {}
  async verify(idToken: string): Promise<Record<string, unknown>> {
    return jwt.verify(idToken, this.key, { algorithms: ['HS256'], ignoreExpiration: true }) as Record<string, unknown>;
  }
}

interface Jwk extends NodeJwk {
  kid?: string;
  alg?: string;
  use?: string;
}

/**
 * Verificación real RS256 contra el JWKS del IdP (Google / Entra). Solo
 * acepta RS256 (bloquea `none` y confusión HS256↔RS256). Cachea llaves y
 * refresca una vez si llega un `kid` desconocido (rotación de llaves).
 */
export class JwksSignatureVerifier implements IdTokenSignatureVerifier {
  private readonly cache = new Map<string, { at: number; keys: Jwk[] }>();
  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly ttlMs = 60 * 60_000) {}

  async verify(idToken: string, ctx: { jwksUri: string }): Promise<Record<string, unknown>> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new Error('id_token malformado');
    if (decoded.header.alg !== 'RS256') throw new Error('Algoritmo de id_token no permitido');
    const kid = decoded.header.kid;
    if (!kid) throw new Error('id_token sin kid');

    let jwk = (await this.keys(ctx.jwksUri, false)).find((k) => k.kid === kid);
    if (!jwk) jwk = (await this.keys(ctx.jwksUri, true)).find((k) => k.kid === kid);
    if (!jwk) throw new Error('kid desconocido en el JWKS del IdP');

    const key = createPublicKey({ key: jwk, format: 'jwk' });
    return jwt.verify(idToken, key, { algorithms: ['RS256'], ignoreExpiration: true }) as Record<string, unknown>;
  }

  private async keys(uri: string, force: boolean): Promise<Jwk[]> {
    const hit = this.cache.get(uri);
    if (!force && hit && Date.now() - hit.at < this.ttlMs) return hit.keys;
    const res = await this.fetchImpl(uri);
    if (!res.ok) throw new Error(`No se pudo leer el JWKS (${res.status})`);
    const { keys } = (await res.json()) as { keys: Jwk[] };
    this.cache.set(uri, { at: Date.now(), keys: keys ?? [] });
    return keys ?? [];
  }
}

// -------------------------------------------------------- validación claims

export interface ExpectedIdToken {
  provider: SsoProvider;
  issuer: string;
  clientId: string;
  nonce: string;
  allowedDomains: string[];
  nowMs: number;
  skewSec?: number;
}

export interface ValidatedIdentity {
  sub: string;
  email: string;
  name: string | null;
}

export class IdTokenClaimError extends Error {
  constructor(readonly reason: string) {
    super(`id_token inválido: ${reason}`);
  }
}

export function validateIdTokenClaims(c: Record<string, unknown>, e: ExpectedIdToken): ValidatedIdentity {
  const skew = e.skewSec ?? 60;
  const nowSec = Math.floor(e.nowMs / 1000);
  if (c.iss !== e.issuer) throw new IdTokenClaimError('iss');
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(e.clientId)) throw new IdTokenClaimError('aud');
  if (aud.length > 1 && c.azp !== e.clientId) throw new IdTokenClaimError('azp');
  if (typeof c.exp !== 'number' || c.exp + skew < nowSec) throw new IdTokenClaimError('exp');
  if (typeof c.iat !== 'number' || c.iat - skew > nowSec) throw new IdTokenClaimError('iat');
  if (typeof c.nonce !== 'string' || c.nonce !== e.nonce) throw new IdTokenClaimError('nonce');
  if (typeof c.sub !== 'string' || !c.sub) throw new IdTokenClaimError('sub');
  if (typeof c.email !== 'string' || !c.email.includes('@')) throw new IdTokenClaimError('email');

  // Entra ID no emite email_verified; `xms_edov` (optional claim) indica dominio verificado.
  const verified = c.email_verified === true || (e.provider === 'microsoft' && c.xms_edov === true);
  if (!verified) throw new IdTokenClaimError('email_verified');

  const email = c.email.trim().toLowerCase();
  const domain = email.split('@')[1];
  const allowed = e.allowedDomains.map((d) => d.toLowerCase());
  if (!allowed.includes(domain)) throw new IdTokenClaimError('domain');
  // Google Workspace: `hd` prueba que la cuenta pertenece al Workspace (no Gmail personal).
  if (e.provider === 'google' && (typeof c.hd !== 'string' || !allowed.includes(c.hd.toLowerCase()))) {
    throw new IdTokenClaimError('hd');
  }
  return { sub: c.sub, email, name: typeof c.name === 'string' ? c.name : null };
}
