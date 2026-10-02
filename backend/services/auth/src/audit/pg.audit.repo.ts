import type { Pool } from 'pg';
import { iso, withTransaction } from '@g3/platform';
import type { AuditActorDto, AuditEntryDto } from '@g3/contracts';
import { GENESIS_HASH, GLOBAL_CHAIN, type AuditFilter, type AuditHead, type AuditRepo } from './audit.repo';

interface AuditRow {
  id: string;
  seq: string;
  company_id: string | null;
  actor_type: AuditActorDto['type'];
  actor_user_id: string | null;
  actor_role: AuditActorDto['role'];
  action: AuditEntryDto['action'];
  resource_type: string;
  resource_id: string | null;
  ip: string | null;
  user_agent: string | null;
  occurred_at: Date;
  metadata: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

const COLS = `id, seq, company_id, actor_type, actor_user_id, actor_role, action, resource_type, resource_id,
  ip, user_agent, occurred_at, metadata, prev_hash, hash`;

function toDto(r: AuditRow): AuditEntryDto {
  return {
    id: r.id,
    seq: Number(r.seq),
    companyId: r.company_id,
    actor: { type: r.actor_type, userId: r.actor_user_id, role: r.actor_role },
    action: r.action,
    resource: { type: r.resource_type, id: r.resource_id },
    ip: r.ip,
    userAgent: r.user_agent,
    timestamp: iso(r.occurred_at)!,
    metadata: r.metadata ?? {},
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

/**
 * Bitácora en Postgres. `appendNext` serializa los anexos de una cadena con
 * `SELECT … FOR UPDATE` sobre su fila en `audit_chain_heads` (creada al
 * vuelo con `ON CONFLICT DO NOTHING`), así N réplicas escribiendo a la vez
 * producen una cadena continua. La tabla `audit_log` rechaza UPDATE/DELETE
 * por trigger.
 */
export class PgAuditRepo implements AuditRepo {
  constructor(private readonly pool: Pool) {}

  async appendNext(chainKey: string, build: (head: AuditHead | null) => AuditEntryDto): Promise<AuditEntryDto> {
    const companyId = chainKey === GLOBAL_CHAIN ? null : chainKey;
    return withTransaction(this.pool, async (tx) => {
      await tx.query(
        `INSERT INTO audit_chain_heads (chain_key, company_id, seq, hash) VALUES ($1, $2, 0, $3)
         ON CONFLICT (chain_key) DO NOTHING`,
        [chainKey, companyId, GENESIS_HASH],
      );
      const { rows } = await tx.query<{ seq: string; hash: string }>(
        `SELECT seq, hash FROM audit_chain_heads WHERE chain_key = $1 FOR UPDATE`,
        [chainKey],
      );
      const seq = Number(rows[0].seq);
      const e = build(seq === 0 ? null : { seq, hash: rows[0].hash });
      await tx.query(
        `INSERT INTO audit_log (id, chain_key, seq, company_id, actor_type, actor_user_id, actor_role, action,
                                resource_type, resource_id, ip, user_agent, occurred_at, metadata, prev_hash, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          e.id,
          chainKey,
          e.seq,
          e.companyId,
          e.actor.type,
          e.actor.userId,
          e.actor.role,
          e.action,
          e.resource.type,
          e.resource.id,
          e.ip,
          e.userAgent,
          e.timestamp,
          JSON.stringify(e.metadata ?? {}),
          e.prevHash,
          e.hash,
        ],
      );
      await tx.query(`UPDATE audit_chain_heads SET seq = $2, hash = $3, updated_at = now() WHERE chain_key = $1`, [
        chainKey,
        e.seq,
        e.hash,
      ]);
      return e;
    });
  }

  async head(chainKey: string): Promise<AuditHead | null> {
    const { rows } = await this.pool.query<{ seq: string; hash: string }>(
      `SELECT seq, hash FROM audit_chain_heads WHERE chain_key = $1`,
      [chainKey],
    );
    if (!rows[0] || Number(rows[0].seq) === 0) return null;
    return { seq: Number(rows[0].seq), hash: rows[0].hash };
  }

  async list(chainKey: string): Promise<AuditEntryDto[]> {
    const { rows } = await this.pool.query<AuditRow>(
      `SELECT ${COLS} FROM audit_log WHERE chain_key = $1 ORDER BY seq`,
      [chainKey],
    );
    return rows.map(toDto);
  }

  async search(chainKey: string, f: AuditFilter, offset: number, limit: number) {
    const where = ['chain_key = $1'];
    const params: unknown[] = [chainKey];
    const add = (sql: string, v: unknown) => {
      params.push(v);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (f.action) add('action = ?', f.action);
    if (f.actorId) add('actor_user_id = ?', f.actorId);
    if (f.resourceType) add('resource_type = ?', f.resourceType);
    if (f.fromMs != null) add('occurred_at >= ?', new Date(f.fromMs).toISOString());
    if (f.toMs != null) add('occurred_at <= ?', new Date(f.toMs).toISOString());
    const w = where.join(' AND ');
    const total = await this.pool.query<{ n: string }>(`SELECT count(*) AS n FROM audit_log WHERE ${w}`, params);
    const { rows } = await this.pool.query<AuditRow>(
      `SELECT ${COLS} FROM audit_log WHERE ${w} ORDER BY seq DESC OFFSET $${params.length + 1} LIMIT $${params.length + 2}`,
      [...params, offset, limit],
    );
    return { items: rows.map(toDto), total: Number(total.rows[0].n) };
  }
}
