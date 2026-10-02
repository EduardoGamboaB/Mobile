import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from 'pg';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Lo mínimo que un repositorio necesita: `query`. Lo implementan el pool y
 * el cliente de una transacción, así un repo funciona igual dentro o fuera
 * de `withTransaction`.
 */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface DbConfig {
  /** `postgres://user:pass@host:5432/db` (Cloud SQL: socket `/cloudsql/<instancia>` vía `host`). */
  connectionString?: string;
  /** Schema del servicio: se fija como `search_path` en cada conexión. */
  schema: string;
  /** Conexiones por instancia (Cloud Run: ≈ concurrencia / 4). */
  max?: number;
  statementTimeoutMs?: number;
  /** `require` en producción fuera del socket de Cloud SQL. */
  ssl?: boolean;
  applicationName?: string;
}

const SCHEMA_RE = /^[a-z][a-z0-9_]{0,62}$/;

export function assertSchemaName(schema: string): string {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Nombre de schema inválido: ${schema}`);
  return schema;
}

/**
 * Lee la conexión del entorno: `DATABASE_URL`, o bien `DB_HOST`/`DB_PORT`/
 * `DB_USER`/`DB_PASS`/`DB_NAME` (compatibilidad con docker-compose).
 * Devuelve `null` si no hay base configurada (el servicio usa repos en memoria).
 */
export function dbConfigFromEnv(schema: string, env: NodeJS.ProcessEnv = process.env): DbConfig | null {
  let connectionString = env.DATABASE_URL;
  if (!connectionString && env.DB_HOST) {
    const user = encodeURIComponent(env.DB_USER ?? 'postgres');
    const pass = env.DB_PASS ? `:${encodeURIComponent(env.DB_PASS)}` : '';
    const host = env.DB_HOST.startsWith('/') ? `localhost` : env.DB_HOST;
    const port = env.DB_PORT ?? '5432';
    const db = env.DB_NAME ?? 'g3';
    const socket = env.DB_HOST.startsWith('/') ? `?host=${encodeURIComponent(env.DB_HOST)}` : '';
    connectionString = `postgres://${user}${pass}@${host}:${port}/${db}${socket}`;
  }
  if (!connectionString) return null;
  return {
    connectionString,
    schema: assertSchemaName(env.DB_SCHEMA ?? schema),
    max: Number(env.DB_POOL_MAX ?? 10),
    statementTimeoutMs: Number(env.DB_STATEMENT_TIMEOUT_MS ?? 15_000),
    ssl: env.DB_SSL === 'require',
    applicationName: env.K_SERVICE ?? `g3-${schema}`,
  };
}

/** Pool con `search_path` del servicio y timeouts para no colgar instancias. */
export function createPool(cfg: DbConfig): Pool {
  const schema = assertSchemaName(cfg.schema);
  const poolCfg: PoolConfig = {
    connectionString: cfg.connectionString,
    max: cfg.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: cfg.applicationName,
    ssl: cfg.ssl ? { rejectUnauthorized: true } : undefined,
    // `options` se aplica al abrir cada conexión (sin un SET por consulta).
    options: `-c search_path=${schema},public -c statement_timeout=${cfg.statementTimeoutMs ?? 15_000}`,
  };
  const pool = new Pool(poolCfg);
  // Un error en una conexión ociosa no debe tumbar el proceso.
  pool.on('error', (e) => logError('[db] error en conexión ociosa', e));
  return pool;
}

function logError(msg: string, e: unknown) {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ severity: 'ERROR', message: msg, error: e instanceof Error ? e.message : String(e) }));
}

/**
 * Ejecuta `fn` en una transacción. Con `isolation: 'serializable'` reintenta
 * los conflictos de serialización (40001) hasta 3 veces.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (tx: PoolClient) => Promise<T>,
  opts: { isolation?: 'read committed' | 'repeatable read' | 'serializable' } = {},
): Promise<T> {
  const attempts = opts.isolation === 'serializable' ? 3 : 1;
  for (let i = 1; ; i++) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${(opts.isolation ?? 'read committed').toUpperCase()}`);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      const code = (e as { code?: string }).code;
      if (code === '40001' && i < attempts) continue;
      throw e;
    } finally {
      client.release();
    }
  }
}

export interface MigrationFile {
  version: string;
  name: string;
  sql: string;
  checksum: string;
}

/** Lee `NNNN_nombre.sql` de un directorio, en orden. */
export async function loadMigrations(dir: string): Promise<MigrationFile[]> {
  const files = (await fs.readdir(dir)).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  return Promise.all(
    files.map(async (f) => {
      const sql = await fs.readFile(path.join(dir, f), 'utf8');
      return {
        version: f.slice(0, 4),
        name: f.slice(5, -4),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}

/**
 * Aplica las migraciones pendientes del servicio en su schema, cada una en
 * su transacción, con un advisory lock para que varias instancias que
 * arrancan a la vez no las corran dos veces. Falla si una migración ya
 * aplicada cambió (checksum distinto): las migraciones son inmutables.
 */
export async function runMigrations(
  pool: Pool,
  opts: { schema: string; dir: string; log?: (m: string) => void },
): Promise<string[]> {
  const schema = assertSchemaName(opts.schema);
  const log = opts.log ?? (() => undefined);
  const files = await loadMigrations(opts.dir);
  const client = await pool.connect();
  const lockKey = BigInt.asIntN(64, BigInt('0x' + createHash('sha256').update(`g3:migrations:${schema}`).digest('hex').slice(0, 16)));
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [lockKey.toString()]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`SET search_path = ${schema}, public`);
    await client.query(`CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query<{ version: string; checksum: string }>(
      `SELECT version, checksum FROM ${schema}.schema_migrations`,
    );
    const done = new Map(rows.map((r) => [r.version, r.checksum]));
    for (const m of files) {
      const prev = done.get(m.version);
      if (prev) {
        if (prev !== m.checksum) {
          throw new Error(`La migración ${schema}/${m.version}_${m.name} cambió después de aplicarse (checksum distinto)`);
        }
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query(
          `INSERT INTO ${schema}.schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`,
          [m.version, m.name, m.checksum],
        );
        await client.query('COMMIT');
        applied.push(`${m.version}_${m.name}`);
        log(`[db] migración aplicada: ${schema}/${m.version}_${m.name}`);
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw new Error(`Falló la migración ${schema}/${m.version}_${m.name}: ${(e as Error).message}`);
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockKey.toString()]).catch(() => undefined);
    await client.query('RESET search_path').catch(() => undefined);
    client.release();
  }
}

/** Ping barato para readiness. */
export async function pingDb(db: Queryable): Promise<void> {
  await db.query('SELECT 1');
}

/** Convierte un `timestamptz` de pg (Date) a ISO, respetando null. */
export function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

/** `numeric` llega como string desde pg: lo convierte a number respetando null. */
export function num(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : Number(v);
}
