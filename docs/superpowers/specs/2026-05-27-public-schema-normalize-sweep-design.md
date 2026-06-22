# Public-schema table normalization — scheduled lock-safe sweep

**Date:** 2026-05-27
**Status:** Approved (design)
**Scope:** `docker/seed/` — no application (admin-app / map-client / lib) changes.

## Problem

A user connects to the production Postgres (`gis` DB) with a GIS client and
drag-and-drops layers into the `public` schema. Those layers arrive with
identifiers tipg can't serve cleanly — names containing **spaces** or
**uppercase** letters.

The existing fix, `docker/seed/init_normalize_triggers.sql`, installs a
`ddl_command_end` **event trigger** (`normalize_public_ddl_trigger`) that
lowercases + snake_cases table and column names. The trigger fires **inside the
load's own transaction**, between `CREATE TABLE` and the data copy. When a
single-transaction loader (GDAL/ogr2ogr behind QGIS, etc.) creates a table and
then copies into it, the trigger renames the table out from under the in-flight
copy, the copy fails with `relation "..." does not exist`, and **the whole
transaction rolls back** — the table never lands.

Evidence on prod (2026-05-27): the event trigger is installed and enabled
(`evtenabled = 'O'`), yet **zero** mis-named tables exist. Failed loads leave no
trace (full rollback), which matches the user's report of loads silently not
appearing. The five spatial tables that did succeed all have clean names.

## Goal

Normalize mis-named `public` tables/columns into tipg-safe identifiers
**without breaking loads**, running unattended ("when I'm not around"), and
**without adding any feature to the admin app**.

## Key insight: lock-safety removes the need for commit-detection

Renaming a table requires an `AccessExclusiveLock`. While a drag-and-drop is
still writing, that lock is held by the loading transaction. If the normalizer
sets a short `lock_timeout` and attempts the rename, the attempt **fails fast
and is skipped** whenever the table is busy. Therefore the normalizer *cannot*
interfere with an in-progress load even if it runs at exactly the wrong moment.

Consequence: we do **not** need an event trigger, `LISTEN`/`NOTIFY`, or any
commit signal. A periodic lock-safe sweep is sufficient and correct. (Postgres
has no after-commit DDL trigger anyway; event triggers only fire pre-commit,
which is the source of the current bug.)

## Design

Two pieces, both in `docker/seed/`:

### 1. Drop the event trigger

`DROP EVENT TRIGGER IF EXISTS normalize_public_ddl_trigger;` and drop its
function `public._normalize_public_ddl()`. This stops the rollbacks. Keep the
`public._normalize_ident(text)` helper — the sweep reuses it.

### 2. `public.normalize_public_tables()` — lock-safe sweep function

A `plpgsql` function, installed once, idempotent. Behavior mirrors the old
trigger's normalization logic but applied out-of-band and defensively:

- Iterate base tables in `public`.
- **Skip-list** (unchanged from the trigger): extension-owned objects
  (`pg_depend deptype = 'e'`), PostGIS metadata (`spatial_ref_sys`,
  `geometry_columns`, `geography_columns`, `raster_columns`,
  `raster_overviews`), and Manifold export tables (`mfd_%`).
- For each table, run inside a **per-table `BEGIN ... EXCEPTION` block** with
  `SET LOCAL lock_timeout = '2s'`:
  - Rename any column whose `_normalize_ident()` form differs, with a
    collision guard (skip if the normalized column name already exists).
  - Rename the table itself if its `_normalize_ident()` form differs, with a
    collision guard.
  - On `lock_not_available` (busy table) or any error: **catch, log via
    `RAISE NOTICE`, and continue** — the table is retried on the next run. One
    busy/failed table never aborts the rest.
- Return a count of renames performed, so the caller can decide whether to
  refresh tipg.

`_normalize_ident` stays: `regexp_replace(lower(raw), '\s+', '_', 'g')`.

## Data flow

```
GIS client drag-drop ─┐
  CREATE TABLE "My Layer" + COPY + COMMIT   (one txn, holds AccessExclusiveLock)
                      │
   (no trigger fires — load commits cleanly, table = "My Layer")
                      ▼
scheduled invocation ─► normalize_public_tables()
                           • lock_timeout=2s; table not busy → rename "My Layer" → my_layer
                           • (if still loading → lock_not_available → skip, retry next run)
                      ▼
              tipg serves collection public.my_layer
```

## Error handling

- **Busy table (load in progress):** `lock_timeout` → `lock_not_available`
  caught per-table → skipped → retried next cycle. Never breaks a load.
- **Name collision** (normalized name already taken): guarded, skipped, logged.
- **Invocation failure:** non-zero exit logged; retried on next scheduled run.
  No state to corrupt (function is idempotent).
- **tipg refresh failure:** non-fatal; a periodic tipg restart is the backstop.

## Testing

No vitest surface (SQL + shell). Verify against the local
`docker compose` stack (`storybook-components-postgis`):

1. **Happy path:** `CREATE TABLE public."My Layer" ("Obj Id" int);` then
   `SELECT public.normalize_public_tables();` → assert table is `my_layer`,
   column is `obj_id`.
2. **Skip-list:** create `public.mfd_test` with bad names → assert untouched.
3. **Collision guard:** pre-create `public.foo` and `public."Foo"` → assert the
   rename is skipped and logged, not errored.
4. **Lock-safety (the important one):** in session A `BEGIN; CREATE TABLE
   public."Busy Tbl"(...); ` (hold open, lock held); in session B call
   `normalize_public_tables()` → assert `Busy Tbl` is skipped (not renamed, no
   hang beyond ~2s); commit A; re-run sweep → assert now renamed.
5. **Idempotency:** run the install SQL twice and the function twice → no errors,
   no spurious renames on the second pass.

## Out of scope / non-goals

- No admin-app, map-client, or lib changes.
- No `LISTEN`/`NOTIFY`, no listener daemon, no new container, no `pg_cron`.
- No normalization of non-`public` schemas (`example`, `gunnison`, `map_admin`
  are deliberately untouched).
- Not solving sub-2-minute latency — acceptable per the chosen approach.

## Affected files

- `docker/seed/init_normalize_triggers.sql` → replaced by a new SQL file
  (drop trigger + `_normalize_ident` + `normalize_public_tables()`); rename to
  reflect it's no longer a trigger (e.g. `init_normalize_public.sql`).
- `apps/admin-app/**` — **untouched.**
