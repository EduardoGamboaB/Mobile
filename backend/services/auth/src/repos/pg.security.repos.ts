/**
 * Repos Postgres de seguridad: MFA, política por compañía y configuración
 * SSO. Gemelos de los repos en memoria (mismas interfaces).
 */
import type { Pool } from 'pg';
import { iso, withTransaction } from '@g3/platform';
import type { SecurityPolicyDto, SsoConfigDto, UserRole } from '@g3/contracts';
import { AuthError } from '../errors';
import type { MfaRecord, MfaRepo } from '../mfa/mfa.repo';
import type { SecurityPolicyRepo } from '../security/security-policy';
import type { SsoConfigRepo } from '../sso/sso.repos';

// ─────────────────────────────────────── MFA ───────────────────────────────────────

interface FactorRow {
  user_id: string;
  secret_enc: string;
  status: MfaRecord['status'];
  last_used_step: string | null;
  created_at: Date;
  enabled_at: Date | null;
}

export class PgMfaRepo implements MfaRepo {
  constructor(private readonly pool: Pool) {}

  async find(userId: string): Promise<MfaRecord | null> {
    const { rows } = await this.pool.query<FactorRow>(
      `SELECT user_id, secret_enc, status, last_used_step, created_at, enabled_at FROM mfa_factors WHERE user_id = $1`,
      [userId],
    );
    const f = rows[0];
    if (!f) return null;
    const codes = await this.pool.query<{ code_hash: string; used_at: Date | null }>(
      `SELECT code_hash, used_at FROM mfa_recovery_codes WHERE user_id = $1 ORDER BY position`,
      [userId],
    );
    return {
      userId: f.user_id,
      secretEnc: f.secret_enc,
      status: f.status,
      createdAt: iso(f.created_at)!,
      enabledAt: iso(f.enabled_at),
      lastUsedStep: f.last_used_step == null ? null : Number(f.last_used_step),
      recoveryCodes: codes.rows.map((c) => ({ hash: c.code_hash, usedAt: iso(c.used_at) })),
    };
  }

  async save(rec: MfaRecord): Promise<void> {
    await withTransaction(this.pool, async (tx) => {
      // company_id sale del usuario (FK compuesta): el factor no puede cruzar compañías.
      const r = await tx.query(
        `INSERT INTO mfa_factors (user_id, company_id, secret_enc, status, last_used_step, created_at, enabled_at)
         SELECT u.id, u.company_id, $2, $3, $4, $5, $6 FROM users u WHERE u.id = $1
         ON CONFLICT (user_id) DO UPDATE SET
           secret_enc = EXCLUDED.secret_enc,
           status = EXCLUDED.status,
           last_used_step = EXCLUDED.last_used_step,
           created_at = EXCLUDED.created_at,
           enabled_at = EXCLUDED.enabled_at,
           updated_at = now()`,
        [rec.userId, rec.secretEnc, rec.status, rec.lastUsedStep, rec.createdAt, rec.enabledAt],
      );
      if (!r.rowCount) throw new AuthError(404, 'Usuario no encontrado');
      await tx.query(`DELETE FROM mfa_recovery_codes WHERE user_id = $1`, [rec.userId]);
      if (rec.recoveryCodes.length) {
        await tx.query(
          `INSERT INTO mfa_recovery_codes (user_id, company_id, code_hash, position, used_at)
           SELECT f.user_id, f.company_id, c.hash, c.pos - 1, c.used_at
           FROM mfa_factors f,
                unnest($2::text[], $3::timestamptz[]) WITH ORDINALITY AS c(hash, used_at, pos)
           WHERE f.user_id = $1`,
          [rec.userId, rec.recoveryCodes.map((c) => c.hash), rec.recoveryCodes.map((c) => c.usedAt)],
        );
      }
    });
  }

  async delete(userId: string): Promise<void> {
    // Los códigos se van por ON DELETE CASCADE.
    await this.pool.query(`DELETE FROM mfa_factors WHERE user_id = $1`, [userId]);
  }

  async advanceStep(userId: string, step: number): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE mfa_factors SET last_used_step = $2, updated_at = now()
       WHERE user_id = $1 AND status = 'enabled' AND (last_used_step IS NULL OR last_used_step < $2)`,
      [userId, step],
    );
    return (r.rowCount ?? 0) === 1;
  }

  async markRecoveryCodeUsed(userId: string, hash: string, usedAt: string): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE mfa_recovery_codes SET used_at = $3 WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL`,
      [userId, hash, usedAt],
    );
    return (r.rowCount ?? 0) === 1;
  }
}

// ─────────────────────────────── política de seguridad ───────────────────────────────

export class PgSecurityPolicyRepo implements SecurityPolicyRepo {
  constructor(private readonly pool: Pool) {}

  async find(companyId: string): Promise<SecurityPolicyDto | null> {
    const { rows } = await this.pool.query<{ company_id: string; require_mfa_for_roles: UserRole[]; updated_at: Date }>(
      `SELECT company_id, require_mfa_for_roles, updated_at FROM security_policies WHERE company_id = $1`,
      [companyId],
    );
    const r = rows[0];
    return r ? { companyId: r.company_id, requireMfaForRoles: r.require_mfa_for_roles, updatedAt: iso(r.updated_at)! } : null;
  }

  async save(p: SecurityPolicyDto): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO security_policies (company_id, require_mfa_for_roles, updated_at) VALUES ($1, $2, $3)
         ON CONFLICT (company_id) DO UPDATE SET
           require_mfa_for_roles = EXCLUDED.require_mfa_for_roles, updated_at = EXCLUDED.updated_at`,
        [p.companyId, p.requireMfaForRoles, p.updatedAt],
      );
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === '23514') throw new AuthError(400, 'requireMfaForRoles contiene roles inválidos');
      if (code === '23503') throw new AuthError(404, 'Compañía no encontrada');
      throw e;
    }
  }
}

// ─────────────────────────────────── SSO (OIDC) ───────────────────────────────────

interface SsoRow {
  company_id: string;
  provider: SsoConfigDto['provider'];
  enabled: boolean;
  issuer: string;
  client_id: string;
  client_secret_ref: string;
  jit_provisioning: boolean;
  updated_at: Date;
  domains: string[] | null;
}

const SSO_SELECT = `
  SELECT c.company_id, c.provider, c.enabled, c.issuer, c.client_id, c.client_secret_ref, c.jit_provisioning,
         c.updated_at,
         (SELECT array_agg(d.domain ORDER BY d.position) FROM sso_config_domains d WHERE d.company_id = c.company_id)
           AS domains
  FROM sso_configs c`;

function toSso(r: SsoRow): SsoConfigDto {
  return {
    companyId: r.company_id,
    provider: r.provider,
    enabled: r.enabled,
    issuer: r.issuer,
    clientId: r.client_id,
    clientSecretRef: r.client_secret_ref,
    allowedDomains: r.domains ?? [],
    jitProvisioning: r.jit_provisioning,
    updatedAt: iso(r.updated_at)!,
  };
}

export class PgSsoConfigRepo implements SsoConfigRepo {
  constructor(private readonly pool: Pool) {}

  async findByCompany(companyId: string) {
    const { rows } = await this.pool.query<SsoRow>(`${SSO_SELECT} WHERE c.company_id = $1`, [companyId]);
    return rows[0] ? toSso(rows[0]) : null;
  }

  async findByDomain(domain: string) {
    const { rows } = await this.pool.query<SsoRow>(
      `${SSO_SELECT} JOIN sso_config_domains x ON x.company_id = c.company_id WHERE x.domain = lower($1)`,
      [domain],
    );
    return rows[0] ? toSso(rows[0]) : null;
  }

  async save(cfg: SsoConfigDto): Promise<void> {
    try {
      await withTransaction(this.pool, async (tx) => {
        await tx.query(
          `INSERT INTO sso_configs (company_id, provider, enabled, issuer, client_id, client_secret_ref,
                                    jit_provisioning, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (company_id) DO UPDATE SET
             provider = EXCLUDED.provider, enabled = EXCLUDED.enabled, issuer = EXCLUDED.issuer,
             client_id = EXCLUDED.client_id, client_secret_ref = EXCLUDED.client_secret_ref,
             jit_provisioning = EXCLUDED.jit_provisioning, updated_at = EXCLUDED.updated_at`,
          [
            cfg.companyId,
            cfg.provider,
            cfg.enabled,
            cfg.issuer,
            cfg.clientId,
            cfg.clientSecretRef,
            cfg.jitProvisioning,
            cfg.updatedAt,
          ],
        );
        await tx.query(`DELETE FROM sso_config_domains WHERE company_id = $1`, [cfg.companyId]);
        await tx.query(
          `INSERT INTO sso_config_domains (domain, company_id, position)
           SELECT lower(d), $1, (o - 1)::smallint FROM unnest($2::text[]) WITH ORDINALITY AS t(d, o)`,
          [cfg.companyId, cfg.allowedDomains],
        );
      });
    } catch (e) {
      const err = e as { code?: string; detail?: string };
      if (err.code === '23505') {
        const dom = /\(domain\)=\(([^)]+)\)/.exec(err.detail ?? '')?.[1];
        throw new AuthError(409, `El dominio ${dom ?? ''} ya está asociado a otra compañía`.replace('  ', ' '));
      }
      if (err.code === '23514') throw new AuthError(400, 'Configuración SSO inválida');
      if (err.code === '23503') throw new AuthError(404, 'Compañía no encontrada');
      throw e;
    }
  }
}
