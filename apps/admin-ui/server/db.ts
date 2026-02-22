import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'gis',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
});

export async function initDb(): Promise<void> {
  // Core map configs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS map_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT false,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Add environment column if upgrading from earlier schema
  await pool.query(`
    ALTER TABLE map_configs ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production'
  `);

  // Replace old single-published index with per-environment unique index
  await pool.query(`DROP INDEX IF EXISTS map_configs_is_published_idx`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS map_configs_published_per_env_idx
      ON map_configs (environment) WHERE is_published = true
  `);

  // Version history table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS config_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_id UUID NOT NULL REFERENCES map_configs(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS config_versions_config_id_idx
      ON config_versions (config_id, version_number DESC)
  `);

  // Prevent duplicate version numbers for the same config
  await pool.query(`
    ALTER TABLE config_versions DROP CONSTRAINT IF EXISTS config_versions_config_id_version_number_key
  `);
  await pool.query(`
    ALTER TABLE config_versions ADD CONSTRAINT config_versions_config_id_version_number_key UNIQUE (config_id, version_number)
  `);
}
