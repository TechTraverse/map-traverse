-- Normalize public-schema table/column names for tipg/OGC API compatibility.
--
-- Replaces the legacy normalize_public_ddl_trigger. That event trigger renamed
-- objects INSIDE the load's own transaction (between CREATE TABLE and the data
-- copy), which rolled back single-transaction drag-and-drop loads with a
-- "relation does not exist" error. Normalization now runs OUT OF BAND via
-- public.normalize_public_tables(), called on a schedule (host cron in prod).
--
-- Lock-safety: a rename needs AccessExclusiveLock. A table that is still being
-- loaded either (a) is part of an uncommitted transaction and thus invisible to
-- this function, or (b) holds a conflicting lock. Each rename runs with a short
-- lock_timeout and is skipped (retried next run) if the lock can't be taken, so
-- the sweep can never interfere with an in-progress load.
--
-- Scope: public schema only. example/gunnison/map_admin are untouched.
-- Idempotent — safe to re-run.

BEGIN;

-- Remove the legacy event trigger + its function (the source of the rollbacks).
DROP EVENT TRIGGER IF EXISTS normalize_public_ddl_trigger;
DROP FUNCTION IF EXISTS public._normalize_public_ddl();

-- Helper: lowercase + collapse whitespace runs to a single underscore.
CREATE OR REPLACE FUNCTION public._normalize_ident(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(raw), '\s+', '_', 'g')
$$;

-- Out-of-band sweep. Returns the number of renames performed (table or column)
-- so a caller can decide whether to refresh tipg. Logs each action via NOTICE.
CREATE OR REPLACE FUNCTION public.normalize_public_tables()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  tbl        record;
  col        record;
  new_ident  text;
  renamed    integer := 0;
BEGIN
  FOR tbl IN
    SELECT c.oid, c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
  LOOP
    -- Skip extension-owned tables (e.g. PostGIS spatial_ref_sys).
    IF EXISTS (
      SELECT 1 FROM pg_depend
       WHERE classid = 'pg_class'::regclass
         AND objid   = tbl.oid
         AND deptype = 'e'
    ) THEN
      CONTINUE;
    END IF;

    -- Explicit skip-list: PostGIS metadata + Manifold export tables (mfd_*).
    IF tbl.relname IN (
      'spatial_ref_sys','geometry_columns','geography_columns',
      'raster_columns','raster_overviews'
    ) OR tbl.relname LIKE 'mfd_%' THEN
      CONTINUE;
    END IF;

    -- Each table in its own subtransaction: a busy or failing table is skipped,
    -- never aborting the rest of the sweep.
    BEGIN
      SET LOCAL lock_timeout = '2s';

      -- Normalize columns.
      FOR col IN
        SELECT attname
          FROM pg_attribute
         WHERE attrelid = tbl.oid
           AND attnum > 0
           AND NOT attisdropped
      LOOP
        new_ident := public._normalize_ident(col.attname);
        CONTINUE WHEN new_ident = col.attname;
        IF EXISTS (
          SELECT 1 FROM pg_attribute
           WHERE attrelid = tbl.oid AND attname = new_ident
             AND attnum > 0 AND NOT attisdropped
        ) THEN
          RAISE NOTICE 'normalize: skip column %.% -> % (collision)',
            tbl.relname, col.attname, new_ident;
          CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I',
                       tbl.relname, col.attname, new_ident);
        renamed := renamed + 1;
        RAISE NOTICE 'normalize: renamed column %.% -> %',
          tbl.relname, col.attname, new_ident;
      END LOOP;

      -- Normalize the table name.
      new_ident := public._normalize_ident(tbl.relname);
      IF new_ident <> tbl.relname THEN
        IF EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = new_ident
        ) THEN
          RAISE NOTICE 'normalize: skip table % -> % (collision)',
            tbl.relname, new_ident;
        ELSE
          EXECUTE format('ALTER TABLE public.%I RENAME TO %I',
                         tbl.relname, new_ident);
          renamed := renamed + 1;
          RAISE NOTICE 'normalize: renamed table % -> %', tbl.relname, new_ident;
        END IF;
      END IF;

    EXCEPTION
      WHEN lock_not_available THEN
        RAISE NOTICE 'normalize: skip % (busy, lock_timeout)', tbl.relname;
      WHEN OTHERS THEN
        RAISE NOTICE 'normalize: skip % (error: %)', tbl.relname, SQLERRM;
    END;
  END LOOP;

  RETURN renamed;
END;
$$;

COMMIT;
