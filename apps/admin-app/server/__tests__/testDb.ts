/**
 * In-memory Postgres test harness backed by pg-mem.
 *
 * Usage:
 *   const pool = await mockDbModule();
 *   await seedAdminUser('admin', 'admin');
 *   const { app } = await import('../index.js');
 *
 * Notes:
 * - The admin-app does NOT have a `users` table; auth is gated on
 *   `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` env vars (see server/index.ts).
 *   `seedAdminUser` sets those env vars and hashes the password.
 * - Many of `initDb`'s DDL statements are Postgres-specific (DO $$ blocks,
 *   partial indexes, etc.) — pg-mem rejects some. Each statement runs in
 *   try/catch so the tests can proceed against the parts that do work.
 */
import { newDb, DataType } from 'pg-mem';
import { vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface TestPool {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  connect: () => Promise<unknown>;
  end: () => Promise<void>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
}

let currentPool: TestPool | undefined;

export function buildTestDb(): { db: ReturnType<typeof newDb>; Pool: new () => TestPool } {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  // Register functions pg-mem doesn't know about
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
    impure: true,
  });

  // pg-mem already has now(), but ensure it returns a timestamptz
  try {
    db.public.registerFunction({
      name: 'now',
      returns: DataType.timestamptz,
      implementation: () => new Date(),
      impure: true,
    });
  } catch {
    // already registered
  }

  const adapter = db.adapters.createPg();
  return { db, Pool: adapter.Pool as unknown as new () => TestPool };
}

/**
 * Replace the `./db.js` module with a pg-mem-backed pool, then apply the
 * production DDL (skipping statements pg-mem doesn't support).
 *
 * Must be called BEFORE the test file imports `../index.js`.
 */
export async function mockDbModule(): Promise<TestPool> {
  const { Pool } = buildTestDb();
  const pool = new Pool();

  // DDL ported from server/db.ts initDb(). Each statement is wrapped in
  // try/catch because pg-mem doesn't implement every Postgres feature.
  const ddlStatements: string[] = [
    `CREATE SCHEMA IF NOT EXISTS map_admin`,

    // Core map configs table — using TEXT for id since pg-mem's UUID DEFAULT
    // gen_random_uuid() behavior is finicky; tests can still pass UUIDs as text.
    `CREATE TABLE IF NOT EXISTS map_admin.map_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT false,
      environment TEXT NOT NULL DEFAULT 'production',
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS map_configs_published_name_idx
      ON map_admin.map_configs (name) WHERE is_published = true`,

    `CREATE TABLE IF NOT EXISTS map_admin.config_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_id UUID NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS config_versions_config_id_idx
      ON map_admin.config_versions (config_id, version_number)`,

    `CREATE TABLE IF NOT EXISTS map_admin.ogc_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      label TEXT,
      tile_matrix_set_id TEXT DEFAULT 'WebMercatorQuad',
      source_type TEXT NOT NULL DEFAULT 'features',
      auth JSONB,
      metadata JSONB,
      metadata_updated_at TIMESTAMPTZ,
      proxy BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS map_admin.site_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      header_title TEXT NOT NULL DEFAULT 'Map Config Admin',
      header_color TEXT NOT NULL DEFAULT '#1e293b',
      browser_title TEXT NOT NULL DEFAULT 'Map Config Admin',
      favicon_data_url TEXT,
      logo_data_url TEXT,
      logo_height INTEGER NOT NULL DEFAULT 32,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,

    `INSERT INTO map_admin.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,

    `INSERT INTO map_admin.ogc_sources (source_id, url, label, source_type)
      VALUES
        ('carto-positron', 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', 'Positron (Light)', 'basemap'),
        ('carto-dark-matter', 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', 'Dark Matter (Dark)', 'basemap'),
        ('carto-voyager', 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 'Voyager (Streets)', 'basemap')
      ON CONFLICT (source_id) DO NOTHING`,

    // Session table — connect-pg-simple needs this. Note: production uses
    // createTableIfMissing which fires its own DDL; we pre-create here so
    // pg-mem doesn't have to parse it.
    `CREATE TABLE IF NOT EXISTS "session" (
      "sid" VARCHAR NOT NULL PRIMARY KEY,
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP NOT NULL
    )`,
  ];

  for (const stmt of ddlStatements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      // pg-mem doesn't support every Postgres feature — that's fine,
      // tests only need the parts that do work.
      if (process.env.DEBUG_TEST_DB) {
        console.warn('[testDb] skipped DDL:', (err as Error).message);
      }
    }
  }

  currentPool = pool;

  vi.doMock('../db.js', () => ({
    pool,
    createPool: () => pool,
    initDb: async () => {
      /* no-op; DDL already applied above */
    },
  }));

  return pool;
}

/** Returns the most recently mocked pool, if any. */
export function getCurrentPool(): TestPool | undefined {
  return currentPool;
}

/**
 * Configure the admin auth env vars so login + requireAuth work in tests.
 *
 * The admin-app does NOT store users in the database; auth is gated on
 * `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` env vars consumed by the login
 * handler in server/index.ts. This helper hashes the password and sets
 * the env vars before the server module is imported.
 */
export async function seedAdminUser(username = 'admin', password = 'admin'): Promise<void> {
  const hash = await bcrypt.hash(password, 4); // low cost for tests
  process.env.ADMIN_USERNAME = username;
  process.env.ADMIN_PASSWORD_HASH = hash;
  process.env.SESSION_SECRET = 'test-secret';
  // Tell server/index.ts to skip the PgSession store (pg-mem can't run its DDL).
  process.env.NODE_ENV = 'test';
}
