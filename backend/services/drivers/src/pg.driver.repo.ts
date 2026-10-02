import type { Pool } from 'pg';
import { iso, withTransaction, type Queryable } from '@g3/platform';
import type { DriverDto } from '@g3/contracts';
import {
  DriverConflictError,
  DriverValidationError,
  type CreateWithinLimitResult,
  type DriverRepo,
} from './driver.repo';

interface DriverRow {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  federal_license: string | null;
  license_expires_at: string | null;
  status: DriverDto['status'];
  created_at: Date;
}

const COLS = `id, company_id, full_name, phone, email, federal_license,
  license_expires_at::text AS license_expires_at, status, created_at`;

/** Campos de DriverDto que se pueden parchear → columna. */
const PATCHABLE: Partial<Record<keyof DriverDto, string>> = {
  fullName: 'full_name',
  phone: 'phone',
  email: 'email',
  federalLicense: 'federal_license',
  licenseExpiresAt: 'license_expires_at',
  status: 'status',
};

function toDto(r: DriverRow): DriverDto {
  return {
    id: r.id,
    companyId: r.company_id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    federalLicense: r.federal_license,
    licenseExpiresAt: r.license_expires_at,
    status: r.status,
    createdAt: iso(r.created_at)!,
  };
}

/** Traduce violaciones de unicidad / formato a errores de dominio (409 / 400). */
export function translatePgError(e: unknown): never {
  const err = e as { code?: string; constraint?: string; message?: string };
  if (err.code === '23505') {
    if (err.constraint === 'drivers_company_license_uq') throw new DriverConflictError('federalLicense');
    if (err.constraint === 'drivers_company_user_uq') throw new DriverConflictError('userId');
    throw new DriverConflictError('phone');
  }
  if (err.code === '22007' || err.code === '22008') throw new DriverValidationError('Fecha de vencimiento de licencia inválida');
  if (err.code === '23514') throw new DriverValidationError('Datos del chofer inválidos');
  throw e;
}

export class PgDriverRepo implements DriverRepo {
  constructor(private readonly pool: Pool) {}

  async list(companyId: string) {
    const { rows } = await this.pool.query<DriverRow>(
      `SELECT ${COLS} FROM drivers WHERE company_id = $1 ORDER BY created_at, id`,
      [companyId],
    );
    return rows.map(toDto);
  }

  async findById(companyId: string, id: string) {
    const { rows } = await this.pool.query<DriverRow>(`SELECT ${COLS} FROM drivers WHERE company_id = $1 AND id = $2`, [
      companyId,
      id,
    ]);
    return rows[0] ? toDto(rows[0]) : null;
  }

  async create(d: DriverDto) {
    return this.insert(this.pool, d);
  }

  async createWithinLimit(d: DriverDto, limit: number): Promise<CreateWithinLimitResult> {
    if (!Number.isFinite(limit)) return { ok: true, driver: await this.create(d) };
    return withTransaction(this.pool, async (tx) => {
      // Serializa las altas de la compañía: el conteo y el insert ven el mismo estado.
      await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('drivers:' || $1, 0))`, [d.companyId]);
      const { rows } = await tx.query<{ n: string }>(`SELECT count(*) AS n FROM drivers WHERE company_id = $1`, [
        d.companyId,
      ]);
      const count = Number(rows[0].n);
      if (count >= limit) return { ok: false as const, count };
      return { ok: true as const, driver: await this.insert(tx, d) };
    });
  }

  private async insert(db: Queryable, d: DriverDto): Promise<DriverDto> {
    try {
      const { rows } = await db.query<DriverRow>(
        `INSERT INTO drivers (id, company_id, full_name, phone, email, federal_license, license_expires_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${COLS}`,
        [d.id, d.companyId, d.fullName, d.phone, d.email, d.federalLicense, d.licenseExpiresAt, d.status, d.createdAt],
      );
      return toDto(rows[0]);
    } catch (e) {
      translatePgError(e);
    }
  }

  async update(companyId: string, id: string, patch: Partial<DriverDto>) {
    const sets: string[] = [];
    const params: unknown[] = [companyId, id];
    for (const [k, col] of Object.entries(PATCHABLE) as [keyof DriverDto, string][]) {
      if (patch[k] === undefined) continue;
      params.push(patch[k]);
      sets.push(`${col} = $${params.length}`);
    }
    if (sets.length === 0) return this.findById(companyId, id);
    try {
      const { rows } = await this.pool.query<DriverRow>(
        `UPDATE drivers SET ${sets.join(', ')}, updated_at = now()
         WHERE company_id = $1 AND id = $2 RETURNING ${COLS}`,
        params,
      );
      return rows[0] ? toDto(rows[0]) : null;
    } catch (e) {
      translatePgError(e);
    }
  }

  async remove(companyId: string, id: string) {
    const r = await this.pool.query(`DELETE FROM drivers WHERE company_id = $1 AND id = $2`, [companyId, id]);
    return (r.rowCount ?? 0) > 0;
  }

  async countByCompany(companyId: string) {
    const { rows } = await this.pool.query<{ n: string }>(`SELECT count(*) AS n FROM drivers WHERE company_id = $1`, [
      companyId,
    ]);
    return Number(rows[0].n);
  }

  async linkUser(companyId: string, id: string, userId: string | null) {
    try {
      const r = await this.pool.query(
        `UPDATE drivers SET user_id = $3, updated_at = now() WHERE company_id = $1 AND id = $2`,
        [companyId, id, userId],
      );
      return (r.rowCount ?? 0) > 0;
    } catch (e) {
      translatePgError(e);
    }
  }

  async findByUserId(companyId: string, userId: string) {
    const { rows } = await this.pool.query<DriverRow>(
      `SELECT ${COLS} FROM drivers WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId],
    );
    return rows[0] ? toDto(rows[0]) : null;
  }
}
