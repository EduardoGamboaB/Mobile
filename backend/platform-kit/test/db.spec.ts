import { Pool } from 'pg';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createPool, dbConfigFromEnv, iso, num, runMigrations, withTransaction } from '../src';
import { createTestDb, describeIfDb } from '../src/testing';

const DIR = path.join(__dirname, 'fixtures/migrations');

describe('configuración desde el entorno', () => {
  test('DATABASE_URL o DB_* (incluido socket de Cloud SQL); sin nada → null', () => {
    expect(dbConfigFromEnv('trips', {})).toBeNull();
    expect(dbConfigFromEnv('trips', { DATABASE_URL: 'postgres://u@h/db' })).toMatchObject({ schema: 'trips', max: 10 });
    const sock = dbConfigFromEnv('auth', { DB_HOST: '/cloudsql/p:r:i', DB_USER: 'g3_auth', DB_PASS: 'p@ss', DB_NAME: 'g3' })!;
    expect(sock.connectionString).toBe('postgres://g3_auth:p%40ss@localhost:5432/g3?host=%2Fcloudsql%2Fp%3Ar%3Ai');
    expect(() => dbConfigFromEnv('x', { DATABASE_URL: 'postgres://h/db', DB_SCHEMA: 'drop table;' })).toThrow(/inválido/);
  });

  test('iso y num toleran null', () => {
    expect(iso(null)).toBeNull();
    expect(iso(new Date('2026-10-01T00:00:00Z'))).toBe('2026-10-01T00:00:00.000Z');
    expect(num('12.50')).toBe(12.5);
    expect(num(null)).toBeNull();
  });
});

describeIfDb('Postgres real', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(DIR);
  });
  afterAll(async () => db?.drop());

  test('las migraciones se aplican una vez y el search_path apunta al schema del servicio', async () => {
    await db!.pool.query(`INSERT INTO widgets (id, name, qty) VALUES ('w1', 'tolva', 30.5)`);
    const { rows } = await db!.pool.query(`SELECT name, qty FROM widgets`);
    expect(rows).toEqual([{ name: 'tolva', qty: '30.50' }]);
    expect(await runMigrations(db!.pool, { schema: db!.schema, dir: DIR })).toEqual([]);
  });

  test('varias instancias migrando a la vez no se pisan (advisory lock)', async () => {
    const schema = `${db!.schema}_c`;
    const pool = createPool({ connectionString: process.env.TEST_DATABASE_URL, schema, max: 4 });
    try {
      const results = await Promise.all([1, 2, 3].map(() => runMigrations(pool, { schema, dir: DIR })));
      expect(results.flat().sort()).toEqual(['0001_init', '0002_add_qty']);
    } finally {
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    }
  });

  test('una migración ya aplicada no se puede editar', async () => {
    const tmp = path.join(__dirname, 'fixtures', `tmp_${Date.now()}`);
    await fs.mkdir(tmp);
    await fs.copyFile(path.join(DIR, '0001_init.sql'), path.join(tmp, '0001_init.sql'));
    const schema = `${db!.schema}_e`;
    const pool = createPool({ connectionString: process.env.TEST_DATABASE_URL, schema, max: 2 });
    try {
      await runMigrations(pool, { schema, dir: tmp });
      await fs.appendFile(path.join(tmp, '0001_init.sql'), '\n-- cambio\n');
      await expect(runMigrations(pool, { schema, dir: tmp })).rejects.toThrow(/cambió/);
    } finally {
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
      await fs.rm(tmp, { recursive: true });
    }
  });

  test('withTransaction hace rollback ante error', async () => {
    await expect(
      withTransaction(db!.pool, async (tx) => {
        await tx.query(`INSERT INTO widgets (id, name) VALUES ('w2', 'x')`);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const { rows } = await db!.pool.query(`SELECT count(*)::int AS n FROM widgets WHERE id = 'w2'`);
    expect(rows[0].n).toBe(0);
  });

  test('una migración que falla no deja cambios a medias', async () => {
    const tmp = path.join(__dirname, 'fixtures', `bad_${Date.now()}`);
    await fs.mkdir(tmp);
    await fs.writeFile(path.join(tmp, '0001_bad.sql'), 'CREATE TABLE ok_t (id int); CREATE TABLE ok_t (id int);');
    const schema = `${db!.schema}_b`;
    const pool = createPool({ connectionString: process.env.TEST_DATABASE_URL, schema, max: 2 });
    try {
      await expect(runMigrations(pool, { schema, dir: tmp })).rejects.toThrow(/0001_bad/);
      const { rows } = await pool.query(`SELECT to_regclass('${schema}.ok_t') AS t`);
      expect(rows[0].t).toBeNull();
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
      await fs.rm(tmp, { recursive: true });
    }
  });
});

// Evita "open handle" si no hay DB.
afterAll(async () => {
  await new Pool().end().catch(() => undefined);
});
