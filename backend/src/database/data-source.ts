import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'] });

/**
 * Cloud SQL desde Cloud Run usa socket Unix:
 *   postgres://USER:PASS@/g3?host=/cloudsql/PROJECT:REGION:INSTANCE
 *
 * En dev usa TCP (postgres://user:pass@localhost:5432/g3).
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
  migrationsTableName: 'g3_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn', 'migration'] : ['error'],
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
