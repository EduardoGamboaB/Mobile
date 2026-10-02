import type { AlertDto } from '@g3/contracts';
import { iso, type Queryable } from '@g3/platform';
import type { AlertFilter, AlertRepo } from './in-memory.alert.repo';

interface AlertRow {
  id: string;
  company_id: string;
  level: AlertDto['level'];
  type: AlertDto['type'];
  message: string;
  resolved: boolean;
  created_at: Date;
}

const toDto = (r: AlertRow): AlertDto => ({
  id: r.id,
  companyId: r.company_id,
  level: r.level,
  type: r.type,
  message: r.message,
  resolved: r.resolved,
  createdAt: iso(r.created_at)!,
});

const COLS = 'id, company_id, level, type, message, resolved, created_at';

export class PgAlertRepo implements AlertRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string, filter: AlertFilter = {}) {
    const { rows } = await this.db.query<AlertRow>(
      `SELECT ${COLS} FROM alerts
        WHERE company_id = $1
          AND ($2::boolean IS NULL OR resolved = $2)
          AND ($3::text IS NULL OR level = $3)
        ORDER BY created_at DESC
        LIMIT 1000`,
      [companyId, filter.resolved ?? null, filter.level ?? null],
    );
    return rows.map(toDto);
  }

  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query<AlertRow>(`SELECT ${COLS} FROM alerts WHERE company_id = $1 AND id = $2`, [companyId, id]);
    return rows[0] ? toDto(rows[0]) : null;
  }

  async create(a: AlertDto) {
    const { rows } = await this.db.query<AlertRow>(
      `INSERT INTO alerts (id, company_id, level, type, message, resolved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLS}`,
      [a.id, a.companyId, a.level, a.type, a.message, a.resolved, a.createdAt],
    );
    return toDto(rows[0]);
  }

  async update(companyId: string, id: string, patch: Pick<Partial<AlertDto>, 'resolved'>) {
    const { rows } = await this.db.query<AlertRow>(
      `UPDATE alerts
          SET resolved = coalesce($3::boolean, resolved),
              resolved_at = CASE WHEN $3 IS TRUE THEN coalesce(resolved_at, now()) WHEN $3 IS FALSE THEN NULL ELSE resolved_at END
        WHERE company_id = $1 AND id = $2
        RETURNING ${COLS}`,
      [companyId, id, patch.resolved ?? null],
    );
    return rows[0] ? toDto(rows[0]) : null;
  }
}
