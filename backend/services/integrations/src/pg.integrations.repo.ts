import type { IntegrationCategory, IntegrationScope, IntegrationStatus, IntegrationTestDto } from '@g3/contracts';
import { iso, type Queryable } from '@g3/platform';
import type { IntegrationRecord, IntegrationRepo, StoredSecret } from './integrations.repo';

interface Row {
  id: string;
  scope: IntegrationScope;
  company_id: string | null;
  category: IntegrationCategory;
  slot: string;
  provider: string;
  enabled: boolean;
  settings: Record<string, string | boolean>;
  secrets: Record<string, StoredSecret>;
  status: IntegrationStatus;
  last_test: IntegrationTestDto | null;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
}

const COLS = `id, scope, company_id, category, slot, provider, enabled, settings, secrets, status, last_test,
  created_at, updated_at, updated_by`;

const toRecord = (r: Row): IntegrationRecord => ({
  id: r.id,
  scope: r.scope,
  companyId: r.company_id,
  category: r.category,
  slot: r.slot,
  provider: r.provider,
  enabled: r.enabled,
  settings: r.settings ?? {},
  // Tal cual se guardaron: ciphertext/referencias. Se descifran en el servicio.
  secrets: r.secrets ?? {},
  status: r.status,
  lastTest: r.last_test,
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
  updatedBy: r.updated_by,
});

/** La plataforma no tiene compañía, aunque el llamador la mande. */
const owner = (scope: IntegrationScope, companyId: string | null) => (scope === 'platform' ? null : companyId);

export class PgIntegrationRepo implements IntegrationRepo {
  constructor(private readonly db: Queryable) {}

  async find(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string) {
    const { rows } = await this.db.query<Row>(
      `SELECT ${COLS} FROM integration_configs
        WHERE scope = $1 AND coalesce(company_id, '') = coalesce($2, '') AND category = $3 AND slot = $4`,
      [scope, owner(scope, companyId), category, slot],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  /** Alta o reemplazo de la configuración del destino; conserva `id` y `created_at` existentes. */
  async save(r: IntegrationRecord) {
    const { rows } = await this.db.query<Row>(
      `INSERT INTO integration_configs
         (id, scope, company_id, category, slot, provider, enabled, settings, secrets, status, last_test, created_at, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12, $13, $14)
       ON CONFLICT (scope, (coalesce(company_id, '')), category, slot) DO UPDATE SET
         provider = excluded.provider, enabled = excluded.enabled, settings = excluded.settings,
         secrets = excluded.secrets, status = excluded.status, last_test = excluded.last_test,
         updated_at = excluded.updated_at, updated_by = excluded.updated_by
       RETURNING ${COLS}`,
      [
        r.id, r.scope, owner(r.scope, r.companyId), r.category, r.slot, r.provider, r.enabled,
        JSON.stringify(r.settings ?? {}), JSON.stringify(r.secrets ?? {}), r.status,
        r.lastTest ? JSON.stringify(r.lastTest) : null, r.createdAt, r.updatedAt, r.updatedBy,
      ],
    );
    return toRecord(rows[0]);
  }

  async remove(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string) {
    const { rowCount } = await this.db.query(
      `DELETE FROM integration_configs
        WHERE scope = $1 AND coalesce(company_id, '') = coalesce($2, '') AND category = $3 AND slot = $4`,
      [scope, owner(scope, companyId), category, slot],
    );
    return (rowCount ?? 0) > 0;
  }
}
