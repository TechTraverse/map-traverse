-- Map configs table for the admin UI
CREATE TABLE IF NOT EXISTS map_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique published names
CREATE UNIQUE INDEX IF NOT EXISTS map_configs_published_name_idx
  ON map_configs (name) WHERE is_published = true;

-- At most one default config
CREATE UNIQUE INDEX IF NOT EXISTS map_configs_default_idx
  ON map_configs ((true)) WHERE is_default = true;

-- Version history table (one row per snapshot)
CREATE TABLE IF NOT EXISTS config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES map_configs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS config_versions_config_id_idx
  ON config_versions (config_id, version_number DESC);

-- Prevent duplicate version numbers for the same config
ALTER TABLE config_versions DROP CONSTRAINT IF EXISTS config_versions_config_id_version_number_key;
ALTER TABLE config_versions ADD CONSTRAINT config_versions_config_id_version_number_key UNIQUE (config_id, version_number);
