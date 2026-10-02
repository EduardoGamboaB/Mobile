/**
 * SSO OIDC para G3 Admin (Google Workspace / Microsoft Entra / OIDC genérico).
 *
 * Flujo: authorization code + PKCE (S256), `state` y `nonce` de 256 bits,
 * guardados server-side y de uso único (TTL 10 min). El `redirect_uri` es
 * FIJO por entorno (nunca viene del cliente → sin open redirect).
 *
 * Validaciones del id_token: firma (IdTokenSignatureVerifier), iss, aud/azp,
 * exp/iat con skew de 60 s, nonce, email_verified (o xms_edov en Entra),
 * dominio permitido y `hd` de Google Workspace.
 */
import { createHash, randomBytes, randomUUID } from 'crypto';
import type {
  AuthSessionDto,
  SsoCallbackDto,
  SsoConfigDto,
  SsoDiscoverResponseDto,
  SsoStartDto,
  SsoStartResponseDto,
  UpdateSsoConfigDto,
} from '@g3/contracts';
import type { Clock } from '../clock';
import { AuthError } from '../errors';
import type { AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth.service';
import type { PasswordHasher } from '../password.hasher';
import type { UserRecord, UserRepo } from '../repos/in-memory.user.repo';
import type { CompanyRepo } from '../repos/in-memory.company.repo';
import { assertAdmin, auditActor, type ActorContext, type RequestMeta } from '../security/actor';
import {
  IdTokenClaimError,
  validateIdTokenClaims,
  type IdTokenSignatureVerifier,
  type OidcDiscovery,
  type SecretResolver,
  type TokenExchanger,
} from './oidc';
import type { SsoConfigRepo, SsoStateStore } from './sso.repos';

const STATE_TTL_MS = 10 * 60_000;
const PROVIDERS = ['google', 'microsoft', 'oidc'] as const;
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/** Dominios de correo de consumo: nunca pueden "pertenecer" a una compañía. */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com',
  'yahoo.com.mx', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'prodigy.net.mx',
]);
/** Referencia a Secret Manager o variable de entorno — nunca el secreto en claro. */
const SECRET_REF_RE = /^(projects\/[a-z0-9-]+\/secrets\/[A-Za-z0-9_-]+(\/versions\/(latest|\d+))?|env:[A-Z][A-Z0-9_]*)$/;

export interface SsoServiceDeps {
  configs: SsoConfigRepo;
  states: SsoStateStore;
  discovery: OidcDiscovery;
  exchanger: TokenExchanger;
  signatureVerifier: IdTokenSignatureVerifier;
  secrets: SecretResolver;
  users: UserRepo;
  companies: CompanyRepo;
  hasher: PasswordHasher;
  auth: AuthService;
  audit: AuditService;
  clock: Clock;
  /** Callback de G3 Admin registrado en el IdP, p.ej. https://admin.g3.mx/login/sso/callback */
  redirectUri: string;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function domainOf(email: string): string | null {
  const m = /^[^@\s]+@([^@\s]+)$/.exec((email ?? '').trim().toLowerCase());
  return m ? m[1] : null;
}

export class SsoService {
  constructor(private readonly d: SsoServiceDeps) {}

  // ---------------------------------------------------------------- config

  async getConfig(actor: ActorContext): Promise<SsoConfigDto | null> {
    assertAdmin(actor);
    return this.d.configs.findByCompany(actor.companyId);
  }

  async updateConfig(actor: ActorContext, dto: UpdateSsoConfigDto): Promise<SsoConfigDto> {
    assertAdmin(actor);
    const domains = [...new Set((dto?.allowedDomains ?? []).map((x) => String(x).trim().toLowerCase()))];
    const bad = (msg: string) => new AuthError(400, msg);
    if (!PROVIDERS.includes(dto?.provider)) throw bad('Proveedor SSO inválido');
    if (typeof dto.issuer !== 'string' || !/^https:\/\/[^\s]+$/.test(dto.issuer)) throw bad('issuer debe ser una URL https');
    if (typeof dto.clientId !== 'string' || !dto.clientId.trim() || dto.clientId.length > 256) throw bad('clientId requerido');
    if (typeof dto.clientSecretRef !== 'string' || !SECRET_REF_RE.test(dto.clientSecretRef)) {
      throw bad('clientSecretRef debe ser una referencia de Secret Manager (projects/<p>/secrets/<s>) o env:VAR');
    }
    if (domains.length === 0 || domains.length > 20) throw bad('Configura entre 1 y 20 dominios permitidos');
    if (domains.some((x) => !DOMAIN_RE.test(x))) throw bad('Dominio inválido');
    if (domains.some((x) => PUBLIC_EMAIL_DOMAINS.has(x))) throw bad('No se permiten dominios de correo público');
    for (const dom of domains) {
      const owner = await this.d.configs.findByDomain(dom);
      if (owner && owner.companyId !== actor.companyId) {
        throw new AuthError(409, `El dominio ${dom} ya está asociado a otra compañía`);
      }
    }

    const before = await this.d.configs.findByCompany(actor.companyId);
    const next: SsoConfigDto = {
      companyId: actor.companyId,
      provider: dto.provider,
      enabled: Boolean(dto.enabled),
      // exacto: debe coincidir byte a byte con el `iss` del id_token
      issuer: dto.issuer,
      clientId: dto.clientId.trim(),
      clientSecretRef: dto.clientSecretRef,
      allowedDomains: domains,
      jitProvisioning: Boolean(dto.jitProvisioning),
      updatedAt: new Date(this.d.clock.now()).toISOString(),
    };
    await this.d.configs.save(next);
    const summary = (c: SsoConfigDto | null) =>
      c && {
        provider: c.provider,
        enabled: c.enabled,
        issuer: c.issuer,
        clientId: c.clientId,
        allowedDomains: c.allowedDomains,
        jitProvisioning: c.jitProvisioning,
        secretRefChanged: before ? before.clientSecretRef !== c.clientSecretRef : true,
      };
    await this.d.audit.record({
      companyId: actor.companyId,
      actor: auditActor(actor),
      action: 'sso_config.updated',
      resource: { type: 'sso_config', id: actor.companyId },
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { before: summary(before), after: summary(next) },
    });
    return next;
  }

  // ------------------------------------------------------------- discovery

  async discover(email: string): Promise<SsoDiscoverResponseDto> {
    const cfg = await this.enabledConfigFor(email);
    return cfg ? { ssoEnabled: true, provider: cfg.provider } : { ssoEnabled: false, provider: null };
  }

  // ----------------------------------------------------------------- start

  async start(input: SsoStartDto): Promise<SsoStartResponseDto> {
    const cfg = await this.enabledConfigFor(input?.email);
    if (!cfg) throw new AuthError(404, 'SSO no está configurado para ese dominio');
    const meta = await this.d.discovery.get(cfg.issuer);

    const state = b64url(randomBytes(32));
    const nonce = b64url(randomBytes(32));
    const codeVerifier = b64url(randomBytes(32));
    const codeChallenge = b64url(createHash('sha256').update(codeVerifier).digest());
    await this.d.states.put(state, { companyId: cfg.companyId, nonce, codeVerifier, createdAtMs: this.d.clock.now() });

    const url = new URL(meta.authorization_endpoint);
    const p = url.searchParams;
    p.set('response_type', 'code');
    p.set('client_id', cfg.clientId);
    p.set('redirect_uri', this.d.redirectUri);
    p.set('scope', 'openid email profile');
    p.set('state', state);
    p.set('nonce', nonce);
    p.set('code_challenge', codeChallenge);
    p.set('code_challenge_method', 'S256');
    p.set('login_hint', input.email.trim().toLowerCase());
    if (cfg.provider === 'google') p.set('hd', domainOf(input.email)!);
    return { authorizationUrl: url.toString(), state };
  }

  // -------------------------------------------------------------- callback

  async callback(input: SsoCallbackDto, meta: RequestMeta): Promise<AuthSessionDto> {
    const pending = typeof input?.state === 'string' ? await this.d.states.take(input.state) : null;
    if (!pending || this.d.clock.now() - pending.createdAtMs > STATE_TTL_MS) {
      throw new AuthError(401, 'Sesión SSO inválida o expirada. Vuelve a intentarlo.');
    }
    const cfg = await this.d.configs.findByCompany(pending.companyId);
    if (!cfg || !cfg.enabled) throw new AuthError(401, 'SSO deshabilitado para esta compañía');

    const fail = async (reason: string, status = 401, msg = 'No fue posible validar tu identidad con el proveedor SSO') => {
      await this.d.audit.record({
        companyId: cfg.companyId,
        actor: { type: 'anonymous', userId: null, role: null },
        action: 'auth.login.failed',
        resource: { type: 'user', id: null },
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { method: 'sso', provider: cfg.provider, reason },
      });
      return new AuthError(status, msg);
    };

    let identity;
    try {
      const op = await this.d.discovery.get(cfg.issuer);
      const clientSecret = await this.d.secrets.resolve(cfg.clientSecretRef);
      const { idToken } = await this.d.exchanger.exchange({
        tokenEndpoint: op.token_endpoint,
        code: String(input.code ?? ''),
        codeVerifier: pending.codeVerifier,
        redirectUri: this.d.redirectUri,
        clientId: cfg.clientId,
        clientSecret,
      });
      const claims = await this.d.signatureVerifier.verify(idToken, { jwksUri: op.jwks_uri });
      identity = validateIdTokenClaims(claims, {
        provider: cfg.provider,
        issuer: cfg.issuer,
        clientId: cfg.clientId,
        nonce: pending.nonce,
        allowedDomains: cfg.allowedDomains,
        nowMs: this.d.clock.now(),
      });
    } catch (e) {
      throw await fail(e instanceof IdTokenClaimError ? e.reason : 'exchange_or_signature');
    }

    let user = await this.d.users.findByEmail(identity.email);
    if (user && user.companyId !== cfg.companyId) {
      throw await fail('email_belongs_to_other_company', 403, 'Tu cuenta no pertenece a esta compañía');
    }
    if (!user) {
      if (!cfg.jitProvisioning) {
        throw await fail('user_not_provisioned', 403, 'Tu usuario no existe en G3. Pide acceso a tu administrador.');
      }
      user = await this.provision(cfg, identity, meta);
    }

    await this.d.audit.record({
      companyId: cfg.companyId,
      actor: auditActor({ userId: user.id, role: user.role }),
      action: 'auth.login.succeeded',
      resource: { type: 'user', id: user.id },
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { method: 'sso', provider: cfg.provider },
    });
    return this.d.auth.sessionFor(user);
  }

  private async provision(
    cfg: SsoConfigDto,
    identity: { email: string; name: string | null; sub: string },
    meta: RequestMeta,
  ): Promise<UserRecord> {
    const company = await this.d.companies.findById(cfg.companyId);
    const peers = await this.d.users.findByCompanyId(cfg.companyId);
    const tier = peers[0]?.tier ?? 'free';
    // Contraseña aleatoria inutilizable: el usuario JIT solo entra por SSO.
    const passwordHash = await this.d.hasher.hash(b64url(randomBytes(32)));
    const user = await this.d.users.create({
      id: randomUUID(),
      email: identity.email,
      passwordHash,
      fullName: identity.name ?? identity.email,
      role: 'viewer',
      companyId: cfg.companyId,
      tier,
      createdAt: new Date(this.d.clock.now()).toISOString(),
    });
    await this.d.audit.record({
      companyId: cfg.companyId,
      actor: { type: 'system', userId: null, role: null },
      action: 'user.provisioned_jit',
      resource: { type: 'user', id: user.id },
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { provider: cfg.provider, role: 'viewer', company: company?.name ?? null },
    });
    return user;
  }

  private async enabledConfigFor(email: string): Promise<SsoConfigDto | null> {
    const domain = domainOf(email);
    if (!domain) return null;
    const cfg = await this.d.configs.findByDomain(domain);
    return cfg?.enabled ? cfg : null;
  }
}
