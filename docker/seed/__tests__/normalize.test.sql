-- Run against the local dev DB AFTER installing init_normalize_public.sql:
--   docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 \
--     < docker/seed/__tests__/normalize.test.sql
-- Exits non-zero on first failed ASSERT. Cleans up its own fixtures.

\set ON_ERROR_STOP on

DROP TABLE IF EXISTS public."zztest_layer";
DROP TABLE IF EXISTS public."ZzTest Layer";
DROP TABLE IF EXISTS public."mfd_zztest";
DROP TABLE IF EXISTS public."zztest_collide";
DROP TABLE IF EXISTS public."ZzTest Collide";

CREATE TABLE public."ZzTest Layer" ("Obj Id" int, "geom" int);
CREATE TABLE public."mfd_zztest" ("Bad Col" int);            -- skip-list
CREATE TABLE public."zztest_collide" (id int);               -- collision target
CREATE TABLE public."ZzTest Collide" (id int);               -- normalizes to existing

SELECT public.normalize_public_tables();

DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='zztest_layer'),
    'expected zztest_layer to exist';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='zztest_layer' AND column_name='obj_id'),
    'expected obj_id column';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mfd_zztest' AND column_name='Bad Col'),
    'expected mfd_ table to be skipped';
  ASSERT EXISTS (SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='ZzTest Collide'),
    'expected colliding table to be skipped, not renamed';
  ASSERT (SELECT public.normalize_public_tables()) = 0,
    'expected second sweep to be a no-op';
END $$;

DROP TABLE IF EXISTS public."zztest_layer";
DROP TABLE IF EXISTS public."mfd_zztest";
DROP TABLE IF EXISTS public."zztest_collide";
DROP TABLE IF EXISTS public."ZzTest Collide";

\echo 'PASS: normalize.test.sql'
