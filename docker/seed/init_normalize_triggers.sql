-- Normalize new public-schema DDL for tipg/OGC API compatibility.
--
-- Fires on:
--   CREATE TABLE  — lowercases the table name, replaces spaces with underscores,
--                   and does the same for every column present at creation time.
--   ALTER TABLE   — normalizes any column whose name is not yet lowercase/snake_case
--                   (catches ADD COLUMN and other ALTER TABLE variants).
--
-- Scope: public schema only. Other schemas (example, gunnison, map_admin …) are
-- untouched regardless of naming conventions.
--
-- ⚠  Rename-during-load warning
-- Some loaders (ogr2ogr, shp2pgsql) CREATE the table then immediately COPY into it
-- in the same session.  If the table or a column is renamed by this trigger between
-- CREATE TABLE and the COPY the loader will fail with "relation does not exist".
-- Prefer loaders that already produce lowercase snake_case names (the project
-- convention per load-gis-data/SKILL.md).  If you must load a file with bad names,
-- temporarily disable this trigger:
--
--   ALTER EVENT TRIGGER normalize_public_ddl_trigger DISABLE;
--   -- … run your loader …
--   ALTER EVENT TRIGGER normalize_public_ddl_trigger ENABLE;
--
-- This script is idempotent — safe to re-run on an existing database.

BEGIN;

-- Helper: lowercase + collapse all whitespace runs to a single underscore
CREATE OR REPLACE FUNCTION public._normalize_ident(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(raw), '\s+', '_', 'g')
$$;

-- Event trigger function
CREATE OR REPLACE FUNCTION public._normalize_public_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cmd          record;
  col          record;
  cur_schema   text;
  cur_table    text;
  new_name     text;
BEGIN
  FOR cmd IN
    SELECT *
      FROM pg_event_trigger_ddl_commands()
     WHERE object_type = 'table'
       AND schema_name = 'public'
       AND command_tag IN ('CREATE TABLE', 'ALTER TABLE')
  LOOP
    -- Skip objects owned by an installed extension (e.g. PostGIS spatial_ref_sys)
    IF EXISTS (
      SELECT 1
        FROM pg_depend
       WHERE classid   = 'pg_class'::regclass
         AND objid     = cmd.objid
         AND deptype   = 'e'
    ) THEN
      CONTINUE;
    END IF;

    -- Resolve the current name from the OID (may already differ from DDL text
    -- if another command in the same transaction renamed it)
    SELECT n.nspname, c.relname
      INTO cur_schema, cur_table
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE c.oid = cmd.objid;

    IF NOT FOUND THEN
      CONTINUE;  -- table was dropped in the same transaction
    END IF;

    -- Explicit skip-list for PostGIS metadata tables (belt-and-braces on top of
    -- the extension-dependency check above)
    IF cur_table IN (
      'spatial_ref_sys',
      'geometry_columns',
      'geography_columns',
      'raster_columns',
      'raster_overviews'
    ) THEN
      CONTINUE;
    END IF;

    -- Skip Manifold export tables (mfd_* prefix), matching normalize-columns.sh
    IF cur_table LIKE 'mfd_%' THEN
      CONTINUE;
    END IF;

    -- ── Normalize columns ──────────────────────────────────────────────────────
    FOR col IN
      SELECT attname
        FROM pg_attribute
       WHERE attrelid  = cmd.objid
         AND attnum    > 0
         AND NOT attisdropped
    LOOP
      new_name := public._normalize_ident(col.attname);
      IF new_name = col.attname THEN
        CONTINUE;  -- already normalized
      END IF;

      -- Skip if the normalized name already exists on this table (collision guard)
      IF EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid  = cmd.objid
           AND attname   = new_name
           AND attnum    > 0
           AND NOT attisdropped
      ) THEN
        RAISE NOTICE
          'normalize_public_ddl: skipping column rename %.%.% → % (collision)',
          cur_schema, cur_table, col.attname, new_name;
        CONTINUE;
      END IF;

      EXECUTE format(
        'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
        cur_schema, cur_table, col.attname, new_name
      );
      RAISE NOTICE
        'normalize_public_ddl: renamed column %.%.% → %',
        cur_schema, cur_table, col.attname, new_name;
    END LOOP;

    -- ── Normalize table name (CREATE TABLE only to avoid repeat renames) ───────
    IF cmd.command_tag = 'CREATE TABLE' THEN
      new_name := public._normalize_ident(cur_table);
      IF new_name <> cur_table THEN
        -- Collision guard
        IF EXISTS (
          SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
           WHERE n.nspname = cur_schema
             AND c.relname = new_name
        ) THEN
          RAISE NOTICE
            'normalize_public_ddl: skipping table rename %.% → %.% (collision)',
            cur_schema, cur_table, cur_schema, new_name;
        ELSE
          EXECUTE format(
            'ALTER TABLE %I.%I RENAME TO %I',
            cur_schema, cur_table, new_name
          );
          RAISE NOTICE
            'normalize_public_ddl: renamed table %.% → %.%',
            cur_schema, cur_table, cur_schema, new_name;
        END IF;
      END IF;
    END IF;

  END LOOP;
END;
$$;

-- Install the event trigger (idempotent via DROP IF EXISTS + CREATE)
DROP EVENT TRIGGER IF EXISTS normalize_public_ddl_trigger;
CREATE EVENT TRIGGER normalize_public_ddl_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE')
  EXECUTE FUNCTION public._normalize_public_ddl();

COMMIT;
