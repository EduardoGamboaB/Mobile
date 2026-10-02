import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { createPool, runMigrations } from './db';

/**
 * Base de pruebas: si existe `TEST_DATABASE_URL`, crea un schema temporal,
 * corre las migraciones del servicio y devuelve un pool apuntando a él.
 * Sin la variable devuelve `null` y los tests de Postgres se saltan
 * (`describeIfDb`). En CI la variable siempre está (servicio postgres).
 */
export async function createTestDb(migrationsDir: string, prefix = 't'): Promise<{
  pool: Pool;
  schema: string;
  drop(): Promise<void>;
} | null> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  const schema = `${prefix}_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: url, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();
  const pool = createPool({ connectionString: url, schema, max: 4 });
  await runMigrations(pool, { schema, dir: migrationsDir });
  return {
    pool,
    schema,
    async drop() {
      await pool.end();
      const a = new Pool({ connectionString: url, max: 1 });
      await a.query(`DROP SCHEMA ${schema} CASCADE`);
      await a.end();
    },
  };
}

/** `describe` que solo corre con `TEST_DATABASE_URL` (Postgres real). */
export const describeIfDb: jest.Describe = (process.env.TEST_DATABASE_URL ? describe : describe.skip) as jest.Describe;

/** `describe` que solo corre con `TEST_REDIS_URL` (Redis real). */
export const describeIfRedis: jest.Describe = (process.env.TEST_REDIS_URL ? describe : describe.skip) as jest.Describe;
