import { randomUUID } from 'crypto';
import {
  getCategoryDef,
  getProviderDef,
  INTEGRATION_CATEGORIES,
  INTEGRATIONS_CATALOG,
  validateIntegrationSettings,
  type IntegrationCategory,
  type IntegrationCategoryDef,
  type IntegrationConfigDto,
  type IntegrationOverviewItemDto,
  type IntegrationScope,
  type IntegrationSource,
  type IntegrationTestDto,
  type ResolvedIntegrationDto,
  type SecretDescriptorDto,
  type UpsertIntegrationDto,
  type UserRole,
} from '@g3/contracts';
import {
  envFallbackFor,
  looksLikeSecretReference,
  parseSecretReference,
  testConnection,
  type EnvLike,
  type FetchLike,
  type IntegrationChange,
} from '@g3/integrations';
import type { IntegrationRecord, IntegrationRepo, StoredSecret } from './integrations.repo';
import type { SecretCipher } from './secret-cipher';
import type { AuditSink, IntegrationAuditAction } from './audit';
import { BadGatewayError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './errors';

/** Identidad que pone el gateway (x-company-id, x-user-id, x-user-role). */
export interface RequestCtx {
  companyId: string;
  userId: string | null;
  role: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface SecretRefResolver {
  resolve(value: string): Promise<string>;
}

export interface IntegrationsServiceDeps {
  repo: IntegrationRepo;
  cipher: SecretCipher;
  /** Resuelve `env:`/`gsm:` (SecretResolver de @g3/integrations). */
  secrets: SecretRefResolver;
  audit: AuditSink;
  /** `fetch` para "Probar conexión". */
  fetch: FetchLike;
  /** Entorno del servicio (respaldo `envFallback`). */
  env: EnvLike;
  /** `G3_PLATFORM_COMPANY_ID`: única compañía que edita el alcance plataforma. */
  platformCompanyId: string | null;
  /**
   * Aviso de cambio para invalidar las cachés de `IntegrationsClient` en
   * todas las réplicas de los consumidores (Redis pub/sub). No debe lanzar.
   */
  publishChange?: (change: IntegrationChange) => Promise<void>;
  now?: () => Date;
  testTimeoutMs?: number;
}

const ADMIN_ROLES = ['owner', 'admin'];
const READ_ROLES = ['owner', 'admin', 'dispatcher'];
/** Últimos 4 solo si el secreto es lo bastante largo como para no revelarlo. */
const HINT_MIN_LENGTH = 8;

export class IntegrationsService {
  private readonly now: () => Date;

  constructor(private readonly deps: IntegrationsServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  // ── Lectura ─────────────────────────────────────────────────────────────

  catalog() {
    return INTEGRATIONS_CATALOG;
  }

  canEditPlatform(ctx: RequestCtx): boolean {
    return !!this.deps.platformCompanyId && ctx.companyId === this.deps.platformCompanyId && ADMIN_ROLES.includes(ctx.role);
  }

  /** Estado efectivo de todas las categorías/ranuras para la compañía que consulta. */
  async overview(ctx: RequestCtx): Promise<IntegrationOverviewItemDto[]> {
    requireIdentity(ctx);
    if (!READ_ROLES.includes(ctx.role)) throw new ForbiddenError();
    const isAdmin = ADMIN_ROLES.includes(ctx.role);
    const canEditPlatform = this.canEditPlatform(ctx);
    const items: IntegrationOverviewItemDto[] = [];
    for (const def of INTEGRATIONS_CATALOG) {
      for (const { id: slot } of def.slots) {
        const company = def.scopes.includes('company') ? await this.deps.repo.find('company', ctx.companyId, def.category, slot) : null;
        const platform = await this.deps.repo.find('platform', null, def.category, slot);
        const envPresent = !!this.envFor(def.category, slot);
        const source: IntegrationSource = company?.enabled ? 'company' : platform?.enabled ? 'platform' : envPresent ? 'env' : 'none';
        const effectiveRecord = source === 'company' ? company : source === 'platform' ? platform : null;
        items.push({
          category: def.category,
          slot,
          effective: {
            source,
            provider: effectiveRecord?.provider ?? (source === 'env' ? this.envFor(def.category, slot)!.provider : null),
            status: effectiveRecord?.status ?? null,
            enabled: source !== 'none',
          },
          company: company ? this.toDto(company, { hints: isAdmin }) : null,
          platform: platform
            ? canEditPlatform
              ? this.toDto(platform, { hints: true })
              : { provider: platform.provider, status: platform.status, enabled: platform.enabled }
            : null,
          envFallbackPresent: envPresent,
          canEditPlatform,
        });
      }
    }
    return items;
  }

  async get(ctx: RequestCtx, category: string, slot: string, scopeParam?: string): Promise<IntegrationConfigDto> {
    const { def, scope } = this.target(category, slot, scopeParam);
    this.assertCanManage(ctx, scope);
    const rec = await this.deps.repo.find(scope, this.ownerOf(ctx, scope), def.category, slot);
    if (!rec) throw new NotFoundError(`Sin configuración de ${def.label} (${scope})`);
    return this.toDto(rec, { hints: true });
  }

  // ── Escritura ───────────────────────────────────────────────────────────

  async upsert(ctx: RequestCtx, category: string, slot: string, scopeParam: string | undefined, input: UpsertIntegrationDto): Promise<IntegrationConfigDto> {
    const { def, scope } = this.target(category, slot, scopeParam);
    this.assertCanManage(ctx, scope);
    if (!input || typeof input !== 'object') throw new ValidationError('Cuerpo inválido');
    const providerId = typeof input.provider === 'string' ? input.provider : '';
    const provider = getProviderDef(def.category, providerId);
    if (!provider) throw new ValidationError(`Proveedor no soportado para ${def.category}: ${providerId || '(vacío)'}`);
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new ValidationError('enabled debe ser sí/no');
    const values = input.values && typeof input.values === 'object' ? input.values : {};

    const companyId = this.ownerOf(ctx, scope);
    const existing = await this.deps.repo.find(scope, companyId, def.category, slot);
    // Cambiar de proveedor descarta los secretos del anterior.
    const previousSecrets = existing && existing.provider === providerId ? existing.secrets : {};

    const secretKeys = provider.fields.filter((f) => f.type === 'secret').map((f) => f.key);
    const settings: Record<string, string | boolean> = {};
    const toValidate: Record<string, unknown> = {};
    const newSecrets: Record<string, string> = {};
    const kept: string[] = [];
    const removed: string[] = [];
    const refErrors: Record<string, string> = {};

    for (const [k, raw] of Object.entries(values)) {
      if (secretKeys.includes(k)) {
        if (raw === null) {
          if (previousSecrets[k]) removed.push(k);
          continue;
        }
        if (raw === undefined || raw === '') continue;
        if (typeof raw !== 'string') {
          toValidate[k] = raw;
          continue;
        }
        const v = raw.trim();
        if (looksLikeSecretReference(v) && parseSecretReference(v).kind === 'literal') {
          refErrors[k] = 'Referencia inválida: usa env:NOMBRE o gsm:projects/<p>/secrets/<s>/versions/<v>';
        }
        newSecrets[k] = v;
        toValidate[k] = v;
        continue;
      }
      if (raw === null || raw === undefined || raw === '') continue;
      const v = typeof raw === 'string' ? raw.trim() : raw;
      toValidate[k] = v;
      if (typeof v === 'string' || typeof v === 'boolean') settings[k] = v;
    }
    for (const k of secretKeys) {
      if (!(k in newSecrets) && !removed.includes(k) && previousSecrets[k]) kept.push(k);
    }

    const errors = { ...validateIntegrationSettings(def.category, providerId, toValidate, { keepSecrets: kept }), ...refErrors };
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Configuración inválida', { errors });
    }

    const now = this.now().toISOString();
    const rec: IntegrationRecord = {
      id: existing?.id ?? `int_${randomUUID()}`,
      scope,
      companyId,
      category: def.category,
      slot,
      provider: providerId,
      enabled: input.enabled ?? true,
      settings,
      secrets: {},
      status: 'unverified',
      lastTest: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: ctx.userId,
    };
    for (const k of kept) rec.secrets[k] = previousSecrets[k];
    for (const [k, v] of Object.entries(newSecrets)) rec.secrets[k] = this.store(rec, k, v);

    const saved = await this.deps.repo.save(rec);
    await this.publishChange(saved);
    await this.audit(ctx, 'integration.updated', saved, {
      created: !existing,
      enabled: saved.enabled,
      previousProvider: existing && existing.provider !== providerId ? existing.provider : null,
      secretsChanged: Object.keys(newSecrets).sort(),
      secretsRemoved: [
        ...removed,
        ...(existing && existing.provider !== providerId ? Object.keys(existing.secrets).map((k) => `${existing.provider}.${k}`) : []),
      ].sort(),
      settingsChanged: changedKeys(existing?.provider === providerId ? existing.settings : {}, settings),
    });
    return this.toDto(saved, { hints: true });
  }

  async remove(ctx: RequestCtx, category: string, slot: string, scopeParam?: string): Promise<void> {
    const { def, scope } = this.target(category, slot, scopeParam);
    this.assertCanManage(ctx, scope);
    const companyId = this.ownerOf(ctx, scope);
    const existing = await this.deps.repo.find(scope, companyId, def.category, slot);
    if (!existing) throw new NotFoundError(`Sin configuración de ${def.label} (${scope})`);
    await this.deps.repo.remove(scope, companyId, def.category, slot);
    await this.publishChange(existing);
    await this.audit(ctx, 'integration.deleted', existing, {});
  }

  /** "Probar conexión" de la configuración guardada (no de la efectiva). */
  async test(ctx: RequestCtx, category: string, slot: string, scopeParam?: string): Promise<IntegrationTestDto> {
    const { def, scope } = this.target(category, slot, scopeParam);
    this.assertCanManage(ctx, scope);
    const rec = await this.deps.repo.find(scope, this.ownerOf(ctx, scope), def.category, slot);
    if (!rec) throw new NotFoundError(`Sin configuración de ${def.label} (${scope}): guárdala antes de probarla`);

    let result: IntegrationTestDto;
    try {
      const secrets = await this.plainSecrets(rec);
      result = await testConnection(def.category, rec.provider, rec.settings, secrets, this.deps.fetch, {
        timeoutMs: this.deps.testTimeoutMs,
        now: () => this.now().getTime(),
      });
    } catch (e) {
      result = {
        ok: false,
        live: false,
        message: (e as Error).message,
        latencyMs: 0,
        testedAt: this.now().toISOString(),
      };
    }
    rec.lastTest = result;
    // Solo una prueba en vivo exitosa marca "verificada"; la de formato deja "sin verificar".
    rec.status = !result.ok ? 'failed' : result.live ? 'verified' : 'unverified';
    await this.deps.repo.save(rec);
    await this.audit(ctx, 'integration.tested', rec, { ok: result.ok, live: result.live, latencyMs: result.latencyMs });
    return result;
  }

  // ── Interno (servicio → servicio) ───────────────────────────────────────

  /**
   * Configuración efectiva CON secretos en claro: compañía → plataforma →
   * entorno del servicio → none. Las deshabilitadas se saltan.
   */
  async resolve(companyId: string | null, category: string, slot = 'default'): Promise<ResolvedIntegrationDto> {
    const def = categoryDef(category);
    if (!def.slots.some((s) => s.id === slot)) throw new NotFoundError(`Ranura desconocida para ${def.category}: ${slot}`);
    const candidates: IntegrationRecord[] = [];
    if (companyId && def.scopes.includes('company')) {
      const c = await this.deps.repo.find('company', companyId, def.category, slot);
      if (c?.enabled) candidates.push(c);
    }
    const p = await this.deps.repo.find('platform', null, def.category, slot);
    if (p?.enabled) candidates.push(p);
    const rec = candidates[0];
    if (rec) {
      let secrets: Record<string, string>;
      try {
        secrets = await this.plainSecrets(rec);
      } catch (e) {
        throw new BadGatewayError((e as Error).message);
      }
      return { category: def.category, slot, source: rec.scope, provider: rec.provider, settings: rec.settings, secrets };
    }
    const env = this.envFor(def.category, slot);
    if (env) return { category: def.category, slot, source: 'env', provider: env.provider, settings: env.settings, secrets: env.secrets };
    return { category: def.category, slot, source: 'none', provider: null, settings: {}, secrets: {} };
  }

  // ── Internos ────────────────────────────────────────────────────────────

  private async publishChange(rec: IntegrationRecord) {
    await this.deps.publishChange?.({ scope: rec.scope, companyId: rec.companyId, category: rec.category, slot: rec.slot }).catch(() => undefined);
  }

  private envFor(category: IntegrationCategory, slot: string) {
    return slot === 'default' ? envFallbackFor(category, this.deps.env) : null;
  }

  private target(category: string, slot: string, scopeParam?: string): { def: IntegrationCategoryDef; scope: IntegrationScope } {
    const def = categoryDef(category);
    if (!def.slots.some((s) => s.id === slot)) throw new NotFoundError(`Ranura desconocida para ${def.category}: ${slot}`);
    if (scopeParam !== undefined && scopeParam !== 'company' && scopeParam !== 'platform') {
      throw new ValidationError('scope debe ser company o platform');
    }
    const scope: IntegrationScope = (scopeParam as IntegrationScope | undefined) ?? (def.scopes.includes('company') ? 'company' : 'platform');
    if (!def.scopes.includes(scope)) {
      throw new ValidationError(`${def.label} solo se configura con alcance ${def.scopes.join(' o ')}`);
    }
    return { def, scope };
  }

  private assertCanManage(ctx: RequestCtx, scope: IntegrationScope) {
    requireIdentity(ctx);
    if (scope === 'platform') {
      if (!this.canEditPlatform(ctx)) throw new ForbiddenError('Solo un owner/admin de la plataforma G3 configura el alcance plataforma');
      return;
    }
    if (!ADMIN_ROLES.includes(ctx.role)) throw new ForbiddenError('Solo owner/admin configuran integraciones');
  }

  private ownerOf(ctx: RequestCtx, scope: IntegrationScope): string | null {
    return scope === 'platform' ? null : ctx.companyId;
  }

  private aad(rec: Pick<IntegrationRecord, 'scope' | 'companyId' | 'category' | 'slot' | 'provider'>, key: string) {
    return [rec.scope, rec.companyId ?? '', rec.category, rec.slot, rec.provider, key].join('|');
  }

  private store(rec: IntegrationRecord, key: string, value: string): StoredSecret {
    const ref = parseSecretReference(value);
    if (ref.kind === 'env') return { storage: 'env', ref: value };
    if (ref.kind === 'gsm') return { storage: 'secret_manager', ref: value };
    return {
      storage: 'encrypted',
      ciphertext: this.deps.cipher.encrypt(value, this.aad(rec, key)),
      hint: value.length >= HINT_MIN_LENGTH ? value.slice(-4) : null,
    };
  }

  private async plainSecrets(rec: IntegrationRecord): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const [k, s] of Object.entries(rec.secrets)) {
      if (s.storage === 'encrypted') {
        try {
          out[k] = this.deps.cipher.decrypt(s.ciphertext, this.aad(rec, k));
        } catch {
          throw new Error(`No se pudo descifrar el secreto "${k}" (¿cambió INTEGRATIONS_ENCRYPTION_KEY?)`);
        }
        continue;
      }
      try {
        out[k] = await this.deps.secrets.resolve(s.ref);
      } catch (e) {
        throw new Error(`No se pudo resolver el secreto "${k}": ${(e as Error).message}`);
      }
    }
    return out;
  }

  private toDto(rec: IntegrationRecord, opts: { hints: boolean }): IntegrationConfigDto {
    const provider = getProviderDef(rec.category, rec.provider);
    const secrets: Record<string, SecretDescriptorDto> = {};
    for (const f of provider?.fields ?? []) {
      if (f.type !== 'secret') continue;
      const s = rec.secrets[f.key];
      secrets[f.key] = !s
        ? { set: false, storage: null, hint: null }
        : s.storage === 'encrypted'
          ? { set: true, storage: 'encrypted', hint: opts.hints ? s.hint : null }
          : { set: true, storage: s.storage, hint: opts.hints ? s.ref : null };
    }
    return {
      id: rec.id,
      scope: rec.scope,
      companyId: rec.companyId,
      category: rec.category,
      slot: rec.slot,
      provider: rec.provider,
      enabled: rec.enabled,
      settings: { ...rec.settings },
      secrets,
      status: rec.status,
      lastTest: rec.lastTest,
      updatedAt: rec.updatedAt,
      updatedBy: rec.updatedBy,
    };
  }

  private async audit(ctx: RequestCtx, action: IntegrationAuditAction, rec: IntegrationRecord, extra: Record<string, unknown>) {
    await this.deps.audit.record({
      // En alcance plataforma la bitácora es la de la compañía plataforma (quien lo cambió).
      companyId: ctx.companyId,
      actor: { type: 'user', userId: ctx.userId, role: (ctx.role as UserRole) ?? null },
      action,
      resource: { type: 'integration', id: rec.id },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { scope: rec.scope, category: rec.category, slot: rec.slot, provider: rec.provider, ...extra },
    });
  }
}

function requireIdentity(ctx: RequestCtx) {
  if (!ctx?.companyId || !ctx.role) throw new UnauthorizedError('Faltan x-company-id / x-user-role (¿llamada fuera del gateway?)');
}

function categoryDef(category: string): IntegrationCategoryDef {
  if (!(INTEGRATION_CATEGORIES as readonly string[]).includes(category)) {
    throw new NotFoundError(`Categoría de integración desconocida: ${category}`);
  }
  return getCategoryDef(category as IntegrationCategory);
}

function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => before[k] !== after[k]).sort();
}
