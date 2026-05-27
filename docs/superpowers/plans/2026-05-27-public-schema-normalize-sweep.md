# Public-schema Normalize Sweep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the load-breaking `normalize_public_ddl_trigger` with an out-of-band, lock-safe `public.normalize_public_tables()` function driven by a host cron, so drag-and-dropped tables with spaces/uppercase get tipg-safe names without ever rolling back a load.

**Architecture:** A `plpgsql` function sweeps `public`, renaming mis-named tables/columns with a short `lock_timeout` so it can never touch a table that is mid-load (an in-flight load either holds a conflicting lock or, for single-transaction drag-drops, isn't even visible yet). The function is installed by the seed container (local + prod reseed) and called every 2 minutes by a host cron in production. No admin-app / map-client / lib changes.

**Tech Stack:** PostgreSQL 16 (`postgis/postgis:16-3.4-alpine`), bash, Ansible. No vitest surface — verification is SQL/bash against the local `docker compose` stack.

---

## Important repo facts (read before starting)

- **Worktree:** all *tracked* work happens on branch `ai/normalize-public-sweep` in worktree `/Users/caesterlein/Projects/ogc-maps/storybook-components/.claude/worktrees/ai-normalize-sweep`.
- **`ansible/` is gitignored** (`.gitignore:50`). It exists ONLY in the main checkout at `/Users/caesterlein/Projects/ogc-maps/storybook-components/ansible/`, NOT in the worktree and NOT in version control. Ansible edits (Tasks 5–6) are made directly in the main checkout and are **not committed**.
- **Prod is a write.** Tasks 7–8 mutate the production database/host (`ogc-maps-postgis` / `16.147.169.174`). They are gated: do NOT run them without explicit user approval in-session.
- The seed container mounts the whole `./docker/seed` dir to `/scripts` and runs `seed.sh`, which currently installs the trigger at `seed.sh:22-24`.
- tipg refresh route is `http://localhost/ogc/refresh` (root path `/ogc`, enabled by `tipg_debug: true`). The `*/30` `ogc-maps-tipg-restart` cron is the backstop.

## File structure

| File | Status | Responsibility |
|---|---|---|
| `docker/seed/init_normalize_public.sql` | renamed from `init_normalize_triggers.sql` + rewritten | Drop legacy trigger; define `_normalize_ident` + `normalize_public_tables()` |
| `docker/seed/seed.sh` | modify (line 22-24) | Run the renamed SQL; updated log message |
| `docker/seed/__tests__/normalize.test.sql` | create | Single-session assertions (happy path, skip-list, collision, idempotency) |
| `docker/seed/__tests__/normalize-lock-safety.test.sh` | create | Two-session lock-safety assertion |
| `ansible/normalize-sweep.sh` | create (local, gitignored) | Cron wrapper: call function, refresh tipg if anything renamed, log |
| `ansible/playbook.yml` | modify (local, gitignored) | Install renamed SQL/function; copy script; add `*/2` cron; drop old opt-in trigger task |

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
Expected: no output from tracked files (the worktree has no `ansible/`). If anything prints, update it to `init_normalize_public.sql`.

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

## Task 5: Cron wrapper script (LOCAL, gitignored)

**Files:**
- Create: `/Users/caesterlein/Projects/ogc-maps/storybook-components/ansible/normalize-sweep.sh` (in the **main checkout**, not the worktree; gitignored — not committed)

- [ ] **Step 1: Write the wrapper**

Create `ansible/normalize-sweep.sh`:

```bash
#!/usr/bin/env bash
# Installed on the prod host; invoked by cron every 2 minutes.
# Calls the lock-safe normalize function; if anything was renamed, refreshes
# tipg so the corrected collection appears without waiting for the 30-min
# tipg-restart cron.
set -euo pipefail

TS() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

RENAMED=$(docker exec -i ogc-maps-postgis \
  psql -U postgres -d gis -tAc "SELECT public.normalize_public_tables();" \
  2>>/var/log/ogc-maps-normalize.log | tr -d '[:space:]')

if [ -z "${RENAMED:-}" ]; then
  echo "$(TS) normalize: sweep failed (no result) — see errors above" >> /var/log/ogc-maps-normalize.log
  exit 1
fi

if [ "$RENAMED" -gt 0 ]; then
  echo "$(TS) normalize: $RENAMED rename(s); refreshing tipg" >> /var/log/ogc-maps-normalize.log
  curl -fsS -m 20 http://localhost/ogc/refresh >/dev/null 2>&1 \
    && echo "$(TS) normalize: tipg refresh ok" >> /var/log/ogc-maps-normalize.log \
    || echo "$(TS) normalize: tipg refresh failed (30-min restart is backstop)" >> /var/log/ogc-maps-normalize.log
fi
```

- [ ] **Step 2: Confirm the tipg refresh route exists on prod**

Before relying on `/ogc/refresh`, verify it responds (read-only; requires the already-approved prod SSH path). Run:
```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@16.147.169.174 'curl -fsS -m 10 -o /dev/null -w "%{http_code}\n" http://localhost/ogc/refresh'
```
Expected: `200`. If it 404s, `tipg_debug` is off in the running container — in that case drop the curl block from the script and rely on the `*/30` tipg-restart cron (note this in the playbook comment).

> This step needs user approval (prod read). Do not run unprompted.

---

## Task 6: Wire the playbook (LOCAL, gitignored)

**Files:**
- Modify: `/Users/caesterlein/Projects/ogc-maps/storybook-components/ansible/playbook.yml` (main checkout; gitignored — not committed)

- [ ] **Step 1: Update the seed-file copy task**

Find the task that copies `init_normalize_triggers.sql` (playbook.yml ~line 124-128) and change both the `src` basename and `dest` basename to `init_normalize_public.sql`:

```yaml
    - name: Copy init_normalize_public.sql
      ansible.builtin.copy:
        src: "{{ playbook_dir }}/../docker/seed/init_normalize_public.sql"
        dest: "{{ app_dir }}/docker/seed/init_normalize_public.sql"
        mode: "0644"
```

- [ ] **Step 2: Replace the opt-in trigger-install task with a function-install task**

Replace the `install-normalize-trigger` task (playbook.yml ~line 227-231) with a non-opt-in install that runs on every deploy (it's idempotent and also drops the legacy trigger):

```yaml
    # ---- Install / refresh the public-schema normalize function ----
    - name: Install public-schema normalize function (drops legacy trigger)
      ansible.builtin.shell: |
        docker exec -i ogc-maps-postgis psql -U postgres -d gis \
          < {{ app_dir }}/docker/seed/init_normalize_public.sql
      changed_when: false
```

- [ ] **Step 3: Copy the cron wrapper script**

Add near the backup-script copy task:

```yaml
    - name: Deploy normalize-sweep script
      ansible.builtin.copy:
        src: normalize-sweep.sh
        dest: "{{ app_dir }}/normalize-sweep.sh"
        mode: "0755"
```

- [ ] **Step 4: Install the cron job**

Add near the other `ansible.builtin.cron` tasks:

```yaml
    - name: Install public-schema normalize cron job
      ansible.builtin.cron:
        name: "ogc-maps-normalize"
        minute: "*/2"
        job: "{{ app_dir }}/normalize-sweep.sh >> /var/log/ogc-maps-normalize.log 2>&1"
        user: root
```

- [ ] **Step 5: Lint the playbook locally**

```bash
cd /Users/caesterlein/Projects/ogc-maps/storybook-components/ansible
ansible-playbook playbook.yml --syntax-check
```
Expected: `playbook: playbook.yml` with no syntax errors. (If `ansible-playbook` isn't installed locally, skip and rely on the dry-run in Task 7.)

---

## Task 7: Deploy to prod — GATED (requires explicit user approval)

> **STOP.** Every step here mutates production. Confirm with the user before each. Do not proceed in a loop.

**Files:** none (runtime actions against `16.147.169.174` / `ogc-maps-postgis`).

- [ ] **Step 1: Dry-run the playbook against prod**

```bash
cd /Users/caesterlein/Projects/ogc-maps/storybook-components/ansible
ansible-playbook -i inventory.ini playbook.yml --check --diff
```
Expected: shows the new copy/install/cron tasks as changes; no errors. (`--check` may report false "changed" on shell tasks; focus on the copy/cron diffs.)

- [ ] **Step 2: Apply (installs function, drops trigger, installs script + cron)**

```bash
cd /Users/caesterlein/Projects/ogc-maps/storybook-components/ansible
ansible-playbook -i inventory.ini playbook.yml
```

- [ ] **Step 3: Verify the trigger is gone and the function exists**

```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@16.147.169.174 \
  'docker exec ogc-maps-postgis psql -U postgres -d gis -At -c "
    SELECT '"'"'trigger:'"'"' || count(*) FROM pg_event_trigger WHERE evtname='"'"'normalize_public_ddl_trigger'"'"';
    SELECT '"'"'func:'"'"' || count(*) FROM pg_proc WHERE proname='"'"'normalize_public_tables'"'"';"'
```
Expected: `trigger:0` and `func:1`.

- [ ] **Step 4: Verify the cron is installed**

```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@16.147.169.174 'sudo crontab -l | grep ogc-maps-normalize'
```
Expected: the `*/2 * * * * .../normalize-sweep.sh ...` line.

- [ ] **Step 5: Smoke-test the wrapper end-to-end on prod**

```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@16.147.169.174 'sudo /opt/ogc-maps/normalize-sweep.sh; tail -5 /var/log/ogc-maps-normalize.log'
```
Expected: runs clean (exit 0); log shows a timestamped line (0 renames is fine on a clean schema).

---

## Task 8: Merge the tracked changes to ai/main

> Tracked SQL/seed/test changes only. Ansible files are gitignored and stay local.

- [ ] **Step 1: Run the lib verify (sanity — these changes don't touch lib, expect pass)**

```bash
cd /Users/caesterlein/Projects/ogc-maps/storybook-components/.claude/worktrees/ai-normalize-sweep && pnpm verify
```
Expected: PASS (no code paths changed; this just confirms the worktree builds).

- [ ] **Step 2: Merge to ai/main**

```bash
git -C /Users/caesterlein/Projects/ogc-maps/storybook-components checkout ai/main
git -C /Users/caesterlein/Projects/ogc-maps/storybook-components merge ai/normalize-public-sweep --no-ff -m "merge: public-schema normalize sweep"
```

- [ ] **Step 3: Clean up the worktree**

Use ExitWorktree (action: remove) or:
```bash
git -C /Users/caesterlein/Projects/ogc-maps/storybook-components worktree remove .claude/worktrees/ai-normalize-sweep
```

---

## Self-review

**Spec coverage:**
- Drop event trigger → Task 1 (SQL) + Task 6 (prod). ✓
- `normalize_public_tables()` lock-safe, skip-list, collision guard, per-table exception → Task 1. ✓
- Host cron + wrapper + tipg refresh → Tasks 5, 6. ✓
- Ansible wiring (swap trigger task, copy script, cron) → Task 6. ✓
- Apply to prod once + verify → Task 7. ✓
- Testing (happy/skip/collision/idempotency/lock-safety) → Tasks 3, 4. ✓
- No admin-app/map-client/lib changes → respected (only docker/seed + ansible). ✓
- gitignored ansible handled separately, prod gated → Important-facts + Tasks 5-7. ✓

**Placeholder scan:** none — every code/SQL/bash block is complete.

**Type/name consistency:** `init_normalize_public.sql`, `public.normalize_public_tables()` (returns `integer`), `public._normalize_ident(text)`, cron name `ogc-maps-normalize`, log `/var/log/ogc-maps-normalize.log`, route `/ogc/refresh` — used consistently across Tasks 1–8.

**Deviation from spec:** spec left the SQL filename rename optional; this plan commits to `init_normalize_public.sql` (Task 1) and the function returns an `integer` count (not a `SETOF`/`TABLE`) — simpler and avoids RETURN NEXT rows surviving a subtransaction rollback; the wrapper only needs "did anything change?".
