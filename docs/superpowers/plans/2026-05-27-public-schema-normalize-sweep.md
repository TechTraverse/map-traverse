# Public-schema Normalize Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the load-breaking `normalize_public_ddl_trigger` with an out-of-band, lock-safe `public.normalize_public_tables()` function intended to be invoked periodically on a schedule, so drag-and-dropped tables with spaces/uppercase get tipg-safe names without ever rolling back a load.

**Architecture:** A `plpgsql` function sweeps `public`, renaming mis-named tables/columns with a short `lock_timeout` so it can never touch a table that is mid-load (an in-flight load either holds a conflicting lock or, for single-transaction drag-drops, isn't even visible yet). The function is installed by the seed container (local + prod reseed) and invoked on a schedule. No admin-app / map-client / lib changes.

**Tech Stack:** PostgreSQL 16 (`postgis/postgis:16-3.4-alpine`), bash. No vitest surface — verification is SQL/bash against the local `docker compose` stack.

---

## Important repo facts (read before starting)

- The seed container mounts the whole `./docker/seed` dir to `/scripts` and runs `seed.sh`, which currently installs the trigger at `seed.sh:22-24`.
- tipg refresh route is `http://localhost/ogc/refresh` (root path `/ogc`, enabled by `tipg_debug: true`).

## File structure

| File | Status | Responsibility |
|---|---|---|
| `docker/seed/init_normalize_public.sql` | renamed from `init_normalize_triggers.sql` + rewritten | Drop legacy trigger; define `_normalize_ident` + `normalize_public_tables()` |
| `docker/seed/seed.sh` | modify (line 22-24) | Run the renamed SQL; updated log message |
| `docker/seed/__tests__/normalize.test.sql` | create | Single-session assertions (happy path, skip-list, collision, idempotency) |
| `docker/seed/__tests__/normalize-lock-safety.test.sh` | create | Two-session lock-safety assertion |

---

## Task 1: Rewrite the SQL — drop trigger, add the sweep function

**Files:**
- Rename + Create: `docker/seed/init_normalize_triggers.sql` → `docker/seed/init_normalize_public.sql`

- [ ] **Step 1: Rename the file with git so history follows**

Run (from the worktree root):
```bash
git mv docker/seed/init_normalize_triggers.sql docker/seed/init_normalize_public.sql
```

- [ ] **Step 2: Replace the file contents entirely**

Overwrite `docker/seed/init_normalize_public.sql` with:

```sql
-- Normalize public-schema table/column names for tipg/OGC API compatibility.
--
-- Replaces the legacy normalize_public_ddl_trigger. That event trigger renamed
-- objects INSIDE the load's own transaction (between CREATE TABLE and the data
-- copy), which rolled back single-transaction drag-and-drop loads with a
-- "relation does not exist" error. Normalization now runs OUT OF BAND via
-- public.normalize_public_tables(), called on a schedule.
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
```

- [ ] **Step 3: Commit**

```bash
git add docker/seed/init_normalize_public.sql
git commit -m "feat: out-of-band public normalize function, drop trigger"
```

---

## Task 2: Point seed.sh at the renamed file

**Files:**
- Modify: `docker/seed/seed.sh:22-24`

- [ ] **Step 1: Replace the trigger-install block**

Change `seed.sh` lines 22-24 from:
```bash
echo "Installing normalize-public-ddl triggers..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f /scripts/init_normalize_triggers.sql
echo "Normalize-public-ddl triggers installed!"
```
to:
```bash
echo "Installing public-schema normalize function..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f /scripts/init_normalize_public.sql
echo "Public-schema normalize function installed!"
```

- [ ] **Step 2: Verify no other references to the old filename remain**

Run:
```bash
grep -rn "init_normalize_triggers" . --include='*.sh' --include='*.yml' --include='Dockerfile' 2>/dev/null
```
Expected: no output from tracked files. If anything prints, update it to `init_normalize_public.sql`.

- [ ] **Step 3: Commit**

```bash
git add docker/seed/seed.sh
git commit -m "chore: seed runs renamed normalize SQL"
```

---

## Task 3: Single-session SQL tests (happy path, skip-list, collision, idempotency)

**Files:**
- Create: `docker/seed/__tests__/normalize.test.sql`

**Prereq:** the local stack is up. If not: `docker compose up -d postgis` then wait for healthy.

- [ ] **Step 1: Write the test SQL**

Create `docker/seed/__tests__/normalize.test.sql`:

```sql
-- Run against the local dev DB AFTER installing init_normalize_public.sql:
--   docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 \
--     < docker/seed/__tests__/normalize.test.sql
-- Exits non-zero on first failed ASSERT. Cleans up its own fixtures.

\set ON_ERROR_STOP on

-- Fixtures (uniquely prefixed so we never touch real data).
DROP TABLE IF EXISTS public."zztest_layer";
DROP TABLE IF EXISTS public."ZzTest Layer";
DROP TABLE IF EXISTS public."zztest_mfd_keep";
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
  -- Happy path: table + column normalized.
  ASSERT EXISTS (SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='zztest_layer'),
    'expected zztest_layer to exist';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='zztest_layer' AND column_name='obj_id'),
    'expected obj_id column';

  -- Skip-list: mfd_ table and its bad column untouched.
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mfd_zztest' AND column_name='Bad Col'),
    'expected mfd_ table to be skipped';

  -- Collision: "ZzTest Collide" -> zztest_collide already exists, so original stays.
  ASSERT EXISTS (SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='ZzTest Collide'),
    'expected colliding table to be skipped, not renamed';

  -- Idempotency: a second sweep performs zero renames.
  ASSERT (SELECT public.normalize_public_tables()) = 0,
    'expected second sweep to be a no-op';
END $$;

-- Cleanup.
DROP TABLE IF EXISTS public."zztest_layer";
DROP TABLE IF EXISTS public."mfd_zztest";
DROP TABLE IF EXISTS public."zztest_collide";
DROP TABLE IF EXISTS public."ZzTest Collide";

\echo 'PASS: normalize.test.sql'
```

- [ ] **Step 2: Run it and confirm it FAILS before the function exists**

If the function isn't installed yet on local, run the test to see it fail first:
```bash
docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 < docker/seed/__tests__/normalize.test.sql
```
Expected: FAIL — `function public.normalize_public_tables() does not exist`.

- [ ] **Step 3: Install the function on local, then run the test**

```bash
docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 < docker/seed/init_normalize_public.sql
docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 < docker/seed/__tests__/normalize.test.sql
```
Expected: ends with `PASS: normalize.test.sql` and exit code 0.

- [ ] **Step 4: Commit**

```bash
git add docker/seed/__tests__/normalize.test.sql
git commit -m "test: single-session normalize sweep assertions"
```

---

## Task 4: Two-session lock-safety test

**Files:**
- Create: `docker/seed/__tests__/normalize-lock-safety.test.sh`

- [ ] **Step 1: Write the test script**

Create `docker/seed/__tests__/normalize-lock-safety.test.sh`:

```bash
#!/usr/bin/env bash
# Proves the sweep SKIPS a table that is currently locked (load in progress)
# and renames it once the lock is released. Run against the local stack with
# init_normalize_public.sql already installed.
set -euo pipefail

PSQL=(docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 -At)

cleanup() { "${PSQL[@]}" -c 'DROP TABLE IF EXISTS public."zz_busy"; DROP TABLE IF EXISTS public."Zz Busy";' >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

# Committed fixture with a bad name.
"${PSQL[@]}" -c 'CREATE TABLE public."Zz Busy" (id int);' >/dev/null

# Session A: hold a conflicting lock for ~6s (ROW EXCLUSIVE blocks the rename's
# ACCESS EXCLUSIVE), then commit.
docker exec -i storybook-components-postgis psql -U postgres -d gis -c \
  'BEGIN; LOCK TABLE public."Zz Busy" IN ROW EXCLUSIVE MODE; SELECT pg_sleep(6); COMMIT;' >/dev/null &
LOCK_PID=$!
sleep 1

# Session B: sweep should skip the busy table (and return ~2s after lock_timeout).
"${PSQL[@]}" -c 'SELECT public.normalize_public_tables();' >/dev/null
STILL_BAD=$("${PSQL[@]}" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='Zz Busy';")
if [ "$STILL_BAD" != "1" ]; then echo "FAIL: table renamed while locked"; exit 1; fi

wait "$LOCK_PID"

# Lock released: sweep now renames it.
"${PSQL[@]}" -c 'SELECT public.normalize_public_tables();' >/dev/null
RENAMED=$("${PSQL[@]}" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='zz_busy';")
if [ "$RENAMED" != "1" ]; then echo "FAIL: table not renamed after lock released"; exit 1; fi

echo "PASS: normalize-lock-safety.test.sh"
```

- [ ] **Step 2: Make it executable and run it**

```bash
chmod +x docker/seed/__tests__/normalize-lock-safety.test.sh
docker/seed/__tests__/normalize-lock-safety.test.sh
```
Expected: ends with `PASS: normalize-lock-safety.test.sh` and exit 0. (Total runtime ~6-8s.)

- [ ] **Step 3: Commit**

```bash
git add docker/seed/__tests__/normalize-lock-safety.test.sh
git commit -m "test: lock-safety skip-and-retry for busy tables"
```

---

## Task 8: Merge the tracked changes to ai/main

> Tracked SQL/seed/test changes only.

- [ ] **Step 1: Run the lib verify (sanity — these changes don't touch lib, expect pass)**

```bash
pnpm verify
```
Expected: PASS (no code paths changed; this just confirms the build).

- [ ] **Step 2: Merge to ai/main**

```bash
git checkout ai/main
git merge ai/normalize-public-sweep --no-ff -m "merge: public-schema normalize sweep"
```

- [ ] **Step 3: Clean up the worktree**

Use ExitWorktree (action: remove) or:
```bash
git worktree remove .claude/worktrees/ai-normalize-sweep
```

---

## Self-review

**Spec coverage:**
- Drop event trigger → Task 1 (SQL). ✓
- `normalize_public_tables()` lock-safe, skip-list, collision guard, per-table exception → Task 1. ✓
- Testing (happy/skip/collision/idempotency/lock-safety) → Tasks 3, 4. ✓
- No admin-app/map-client/lib changes → respected (only docker/seed). ✓

**Placeholder scan:** none — every code/SQL/bash block is complete.

**Type/name consistency:** `init_normalize_public.sql`, `public.normalize_public_tables()` (returns `integer`), `public._normalize_ident(text)` — used consistently across Tasks 1–4.

**Deviation from spec:** spec left the SQL filename rename optional; this plan commits to `init_normalize_public.sql` (Task 1) and the function returns an `integer` count (not a `SETOF`/`TABLE`) — simpler and avoids RETURN NEXT rows surviving a subtransaction rollback; the caller only needs "did anything change?".
