import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial: extensión uuid, esquema multi-tenant para todas
 * las entidades del dominio, índices y enums.
 */
export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // companies
    await q.query(`
      CREATE TABLE "companies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "rfc" varchar(32),
        "city" varchar(100),
        "active" boolean NOT NULL DEFAULT true,
        "stripe_customer_id" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );`);

    // users
    await q.query(`CREATE TYPE "user_role" AS ENUM ('driver','dispatcher','admin','owner');`);
    await q.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "email" varchar(200) NOT NULL UNIQUE,
        "password_hash" varchar(200) NOT NULL,
        "full_name" varchar(200) NOT NULL,
        "role" user_role NOT NULL DEFAULT 'admin',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "users" ("company_id");`);

    // subscriptions
    await q.query(`CREATE TYPE "tier_value" AS ENUM ('free','starter','pro','business','enterprise');`);
    await q.query(`CREATE TYPE "subscription_status" AS ENUM ('trialing','active','past_due','canceled','incomplete');`);
    await q.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "tier" tier_value NOT NULL DEFAULT 'free',
        "status" subscription_status NOT NULL DEFAULT 'active',
        "units" int NOT NULL DEFAULT 1,
        "price_mxn" numeric(10,2) NOT NULL DEFAULT 0,
        "stripe_subscription_id" varchar,
        "stripe_price_id" varchar,
        "current_period_end" timestamptz,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "subscriptions" ("company_id", "status");`);

    // drivers
    await q.query(`CREATE TYPE "driver_status" AS ENUM ('active','on_trip','inactive','suspended');`);
    await q.query(`
      CREATE TABLE "drivers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "full_name" varchar(200) NOT NULL,
        "phone" varchar(32),
        "email" varchar(200),
        "federal_license" varchar(60),
        "license_expires_at" date,
        "status" driver_status NOT NULL DEFAULT 'active',
        "score" int NOT NULL DEFAULT 75,
        "on_time_pct" int NOT NULL DEFAULT 0,
        "km_per_liter" numeric(5,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "drivers" ("company_id");`);

    // tractors
    await q.query(`CREATE TYPE "fuel_type" AS ENUM ('diesel','electrico','hibrido');`);
    await q.query(`CREATE TYPE "tractor_status" AS ENUM ('active','maintenance','parked','sold');`);
    await q.query(`
      CREATE TABLE "tractors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "number" varchar(32) NOT NULL,
        "brand" varchar(80),
        "model" varchar(80),
        "year" int,
        "plates" varchar(20),
        "vin" varchar(32),
        "fuel" fuel_type NOT NULL DEFAULT 'diesel',
        "horsepower" int NOT NULL DEFAULT 0,
        "status" tractor_status NOT NULL DEFAULT 'active',
        "driver_id" uuid,
        "health" int NOT NULL DEFAULT 100,
        "mileage_km" int NOT NULL DEFAULT 0,
        "last_service_km" int NOT NULL DEFAULT 0,
        "next_service_km" int NOT NULL DEFAULT 10000,
        "insurance_expires_at" date,
        "verification_expires_at" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "tractors" ("company_id");`);

    // trailers
    await q.query(`CREATE TYPE "trailer_type" AS ENUM ('jaula_42','caja_53','caja_48','refrigerado','tolva','tanque','plataforma','lowboy');`);
    await q.query(`CREATE TYPE "trailer_status" AS ENUM ('active','maintenance','parked');`);
    await q.query(`
      CREATE TABLE "trailers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "number" varchar(32) NOT NULL,
        "type" trailer_type NOT NULL,
        "plates" varchar(20),
        "vin" varchar(32),
        "capacity_tons" numeric(6,2) NOT NULL DEFAULT 0,
        "temp_range" varchar,
        "status" trailer_status NOT NULL DEFAULT 'active',
        "attached_tractor_id" uuid,
        "health" int NOT NULL DEFAULT 100,
        "last_inspection_at" date,
        "insurance_expires_at" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "trailers" ("company_id");`);

    // trips
    await q.query(`CREATE TYPE "trip_status" AS ENUM ('scheduled','loading','in_transit','unloading','finished','cancelled');`);
    await q.query(`CREATE TYPE "payment_status" AS ENUM ('pending','released','held','na');`);
    await q.query(`
      CREATE TABLE "trips" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "folio" varchar(32) NOT NULL UNIQUE,
        "client" varchar(200) NOT NULL,
        "cargo" varchar(200),
        "origin" varchar(200) NOT NULL,
        "destination" varchar(200) NOT NULL,
        "driver_id" uuid NOT NULL,
        "tractor_id" uuid NOT NULL,
        "trailer_id" uuid,
        "status" trip_status NOT NULL DEFAULT 'scheduled',
        "load_date" timestamptz,
        "eta_unload" timestamptz,
        "finished_at" timestamptz,
        "tons" numeric(8,2) NOT NULL DEFAULT 0,
        "price_per_ton" numeric(10,2) NOT NULL DEFAULT 0,
        "gross_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "driver_commission" numeric(10,2) NOT NULL DEFAULT 0,
        "tolls" numeric(10,2) NOT NULL DEFAULT 0,
        "diesel" numeric(10,2) NOT NULL DEFAULT 0,
        "inspection_pct" int NOT NULL DEFAULT 0,
        "evidence_count" int NOT NULL DEFAULT 0,
        "payment_status" payment_status NOT NULL DEFAULT 'na',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "trips" ("company_id", "status");`);

    // alerts
    await q.query(`CREATE TYPE "alert_source" AS ENUM ('tractor','trailer','driver','trip','document');`);
    await q.query(`CREATE TYPE "alert_severity" AS ENUM ('info','warning','critical');`);
    await q.query(`
      CREATE TABLE "alerts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "source" alert_source NOT NULL,
        "entity_id" varchar(64) NOT NULL,
        "entity_label" varchar(200) NOT NULL,
        "severity" alert_severity NOT NULL DEFAULT 'info',
        "title" varchar(200) NOT NULL,
        "detail" text NOT NULL,
        "acknowledged" boolean NOT NULL DEFAULT false,
        "acknowledged_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ON "alerts" ("company_id", "acknowledged");`);

    // Row-level security helpers (defensa en profundidad junto al
    // TenantInterceptor). En producción se habilita por compañía con
    // policies por rol; aquí dejamos el toggle preparado.
    await q.query(`ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;`);
    await q.query(`ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;`);
    await q.query(`ALTER TABLE "tractors" ENABLE ROW LEVEL SECURITY;`);
    await q.query(`ALTER TABLE "trailers" ENABLE ROW LEVEL SECURITY;`);
    await q.query(`ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "alerts"; DROP TYPE IF EXISTS "alert_source", "alert_severity";`);
    await q.query(`DROP TABLE IF EXISTS "trips"; DROP TYPE IF EXISTS "trip_status", "payment_status";`);
    await q.query(`DROP TABLE IF EXISTS "trailers"; DROP TYPE IF EXISTS "trailer_type", "trailer_status";`);
    await q.query(`DROP TABLE IF EXISTS "tractors"; DROP TYPE IF EXISTS "fuel_type", "tractor_status";`);
    await q.query(`DROP TABLE IF EXISTS "drivers"; DROP TYPE IF EXISTS "driver_status";`);
    await q.query(`DROP TABLE IF EXISTS "subscriptions"; DROP TYPE IF EXISTS "tier_value", "subscription_status";`);
    await q.query(`DROP TABLE IF EXISTS "users"; DROP TYPE IF EXISTS "user_role";`);
    await q.query(`DROP TABLE IF EXISTS "companies";`);
  }
}
