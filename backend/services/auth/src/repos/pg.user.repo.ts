import type { Pool } from 'pg';
import { iso } from '@g3/platform';
import type { TierValue, UserRole } from '@g3/contracts';
import { DuplicateUserError, type UserRecord, type UserRepo } from './in-memory.user.repo';
import type { CompanyRecord, CompanyRepo } from './in-memory.company.repo';
import { AuthError } from '../errors';

interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  tier: TierValue;
  phone: string | null;
  driver_id: string | null;
  created_at: Date;
}

const USER_COLS = `id, company_id, email, password_hash, full_name, role, tier, phone, driver_id, created_at`;

function toUser(r: UserRow): UserRecord {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    fullName: r.full_name,
    role: r.role,
    companyId: r.company_id,
    tier: r.tier,
    createdAt: iso(r.created_at)!,
    phone: r.phone,
    driverId: r.driver_id,
  };
}

/** 23505 de `users` → error de dominio 409 según la restricción violada. */
function translateUserError(e: unknown): never {
  const err = e as { code?: string; constraint?: string };
  if (err.code === '23505') {
    if (err.constraint === 'users_email_uq') throw new DuplicateUserError('email');
    if (err.constraint === 'users_phone_uq') throw new DuplicateUserError('phone');
    if (err.constraint === 'users_company_driver_uq') throw new DuplicateUserError('driverId');
    throw new DuplicateUserError('id');
  }
  if (err.code === '23503') throw new AuthError(400, 'La compañía no existe');
  if (err.code === '23514') throw new AuthError(400, 'Datos de usuario inválidos');
  throw e;
}

export class PgUserRepo implements UserRepo {
  constructor(private readonly pool: Pool) {}

  private async one(sql: string, params: unknown[]): Promise<UserRecord | null> {
    const { rows } = await this.pool.query<UserRow>(sql, params);
    return rows[0] ? toUser(rows[0]) : null;
  }

  findByEmail(email: string) {
    return this.one(`SELECT ${USER_COLS} FROM users WHERE lower(email) = lower($1)`, [email]);
  }
  findByPhone(phone: string) {
    return this.one(`SELECT ${USER_COLS} FROM users WHERE phone = $1`, [phone]);
  }
  findById(id: string) {
    return this.one(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  }
  async findAll() {
    const { rows } = await this.pool.query<UserRow>(`SELECT ${USER_COLS} FROM users ORDER BY created_at, id`);
    return rows.map(toUser);
  }
  async findByCompanyId(companyId: string) {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLS} FROM users WHERE company_id = $1 ORDER BY created_at, id`,
      [companyId],
    );
    return rows.map(toUser);
  }

  async create(rec: UserRecord) {
    try {
      const { rows } = await this.pool.query<UserRow>(
        `INSERT INTO users (id, company_id, email, password_hash, full_name, role, tier, phone, driver_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${USER_COLS}`,
        [
          rec.id,
          rec.companyId,
          rec.email,
          rec.passwordHash,
          rec.fullName,
          rec.role,
          rec.tier,
          rec.phone ?? null,
          rec.driverId ?? null,
          rec.createdAt,
        ],
      );
      return toUser(rows[0]);
    } catch (e) {
      translateUserError(e);
    }
  }

  async updateTierForCompany(companyId: string, tier: TierValue) {
    await this.pool.query(`UPDATE users SET tier = $2, updated_at = now() WHERE company_id = $1`, [companyId, tier]);
  }

  async updateRole(id: string, role: UserRole) {
    return this.one(`UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING ${USER_COLS}`, [id, role]);
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.pool.query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [id, passwordHash]);
  }
}

interface CompanyRow {
  id: string;
  name: string;
  rfc: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: Date;
}

const COMPANY_COLS = `id, name, rfc, contact_email, contact_phone, created_at`;

function toCompany(r: CompanyRow): CompanyRecord {
  return {
    id: r.id,
    name: r.name,
    rfc: r.rfc,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    createdAt: iso(r.created_at)!,
  };
}

export class PgCompanyRepo implements CompanyRepo {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query<CompanyRow>(`SELECT ${COMPANY_COLS} FROM companies WHERE id = $1`, [id]);
    return rows[0] ? toCompany(rows[0]) : null;
  }
  async findAll() {
    const { rows } = await this.pool.query<CompanyRow>(`SELECT ${COMPANY_COLS} FROM companies ORDER BY created_at, id`);
    return rows.map(toCompany);
  }
  async create(rec: CompanyRecord) {
    try {
      const { rows } = await this.pool.query<CompanyRow>(
        `INSERT INTO companies (id, name, rfc, contact_email, contact_phone, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COMPANY_COLS}`,
        [rec.id, rec.name, rec.rfc, rec.contactEmail, rec.contactPhone, rec.createdAt],
      );
      return toCompany(rows[0]);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === '23505') throw new AuthError(409, 'La compañía ya existe');
      if (code === '23514') throw new AuthError(400, 'Datos de la compañía inválidos');
      throw e;
    }
  }
}
