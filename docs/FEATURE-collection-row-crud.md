# Feature Spec: Admin Row-Level CRUD + Geometry Editor for "My Data" collections

> **Status:** Implemented. This document is the original handoff spec, kept for
> historical/context value. The "Exploration still TODO" section at the bottom has
> since been completed; the as-built design is captured in the work itself
> (`apps/admin-app/server/rowRoutes.ts`, `columnIntrospection.ts`;
> `packages/map-ui-lib/src/components/{GeometryEditor,AttributeForm}`;
> `apps/admin-app/src/{pages/DataEditorPage.tsx,components/GeometryDrawMap.tsx}`).

## Context / goal

Admins can upload GIS files into `uploads.<table>` (PostGIS) and serve them via
tipg as map layers. They currently **cannot edit the contents**. This feature
gives the admin full **CRUD over the rows of an uploaded collection**:

- **Create / Read / Update / Delete** individual feature rows (attributes + geometry).
- **Geometry creation/editing two ways:**
  1. typing **coordinates / WKT**, and
  2. **drawing** a point / box / polygon (and likely line) on a **small interactive map**.
- New **components for creating and editing items in a collection**, including the
  draw-on-a-map geometry editor.
- This is a **large feature** — plan in detail, update Storybook stories, and add
  strong test coverage (the repo treats tests as a first-class deliverable).

## Hard constraints (from `CLAUDE.md` + project-conventions skill)

- **`packages/map-ui-lib` is framework-agnostic — NO MapLibre / react-map-gl.** The
  actual draw map must live in an **app** (almost certainly `apps/admin-app`). The
  lib may hold geometry *logic* (WKT/coord↔GeoJSON, validation), controlled form
  inputs, and a geometry editor that takes geometry as **controlled props** and
  emits changes — but it must not render a map.
- **Controlled components**, **`mapui:` Tailwind prefix** in the lib, Storybook
  story per lib component.
- **No `@testing-library/react`** in the lib — test pure logic in `utils/` + use
  `renderToStaticMarkup` for components.
- **`pnpm verify`** (build + lib tests) must pass; for full coverage also run
  `cd apps/admin-app && pnpm exec vitest run`, map-client, and ingest suites.
- Worktree workflow: branch off `ai/main`, merge `--no-ff`; never commit to `main`.

## Key findings from exploration (admin server — COMPLETED)

All paths under `apps/admin-app/server/` unless noted.

- **DB / pool**: `db.ts:3-14` `createPool()` → connects to the **`gis`** database
  (`DB_NAME`, default `gis`), `search_path = map_admin,public`. The same pool can
  read/write `uploads.*` data tables AND `map_admin.uploaded_datasets` metadata —
  they live in one DB. Pool is injected via `DataRouteDeps` (`dataRoutes.ts:39-43`).
- **Existing routes**: `dataRoutes.ts` has `GET /api/data` (list, open),
  `GET /api/data/:id`, `POST /api/data/upload`, `DELETE /api/data/:id`. All values
  parameterized (`$1,$2`); identifiers validated, never interpolated raw. Safe
  DELETE pattern (validate id → txn → `DROP TABLE IF EXISTS uploads."<table>"` +
  delete tracking row): `dataRoutes.ts:303-307`.
- **Identifier safety**: `sanitizeTableName.ts` — `isValidIdentifier()` (`≤63`,
  `/^[a-z_][a-z0-9_]*$/`, reserved-word reject). **There is NO column-name
  validator yet** — must add `isValidColumnName()` (same regex) for dynamic
  INSERT/UPDATE over arbitrary user columns. A matching CHECK constraint on
  `uploaded_datasets.table_name` exists (`db.ts:204-208`).
- **Column / geometry schema introspection: does NOT exist yet** — no
  `information_schema` / `geometry_columns` queries anywhere. Must add a
  `columnIntrospection.ts` that returns `{ columns:[{name,type,nullable}],
  primaryKey, geometryColumn:{name,type,srid} }` via `information_schema.columns`,
  PostGIS `geometry_columns`, and PK from constraints. The uploads tables use PK
  `gid`/`ogc_fid` (FID was changed to `ogc_fid` during the bugfix work) and
  geometry column `geom`, SRID 4326 — confirm per-table via introspection, don't
  assume.
- **tipg refresh**: `refreshTipg()` (`dataRoutes.ts:45-83`, uses `TIPG_REFRESH_URL`).
  **NOT needed for row inserts/updates/deletes** (schema unchanged) — only for
  create/drop/alter of tables. Don't refresh on every row edit.
- **Stats drift**: `uploaded_datasets.feature_count` / `bbox` / `updated_at` are
  set from the ingest sidecar response on upload (`dataRoutes.ts:240-261`). Row
  CRUD will make them stale → add a recompute (e.g. `POST /api/data/:id/refresh-stats`
  doing `COUNT(*)` + `ST_Extent`, or recompute inline after each mutating call).
- **Auth**: `requireAuth` (`index.ts:108-123`) — gate all mutating row routes
  (POST/PUT/DELETE). Reads (`GET rows/schema`) can mirror `GET /api/data` (open) or
  also be gated — decide with user.
- **Route registration**: add `registerRowRoutes({app, pool, requireAuth})` in
  `index.ts` after `registerDataRoutes(...)` (`index.ts:195`).
- **Tests**: `server/__tests__/testDb.ts` uses **pg-mem**, which **does NOT
  implement PostGIS functions** (`ST_GeomFromText`, `ST_AsGeoJSON`, `ST_Extent`,
  etc.). **Critical implication:** geometry SQL cannot be unit-tested via pg-mem.
  Strategy: (a) unit-test the pure **SQL/param builders** and geometry conversion
  logic, (b) cover real geometry SQL in an **integration test against real
  PostGIS** (there's precedent: `apps/ingest-service/src/ingest.integration.test.ts`
  gated by `INGEST_INTEGRATION=1`, CI job `ingest-integration` provides PostGIS).
  Route tests (`routes.data.test.ts`) mock `fetch` + use `supertest.agent`.

## Proposed shape (refine after finishing exploration)

### Server (`apps/admin-app/server/`)
- `columnIntrospection.ts` — schema discovery (cols/types/PK/geometry col+SRID).
- `rowRoutes.ts` — `registerRowRoutes`:
  - `GET  /api/data/:id/schema` — columns + pk + geometry column.
  - `GET  /api/data/:id/rows?limit&offset&sort` — page rows; geometry as GeoJSON
    via `ST_AsGeoJSON`; return total.
  - `POST /api/data/:id/rows` — insert (attrs + geometry). Geometry in via
    `ST_GeomFromGeoJSON($n)` (preferred — client already speaks GeoJSON) or
    `ST_GeomFromText`/`ST_SetSRID`; reproject to table SRID if needed.
  - `PUT  /api/data/:id/rows/:rowId` — update by PK.
  - `DELETE /api/data/:id/rows/:rowId` — delete by PK.
  - (optional) `POST /api/data/:id/refresh-stats`.
- **Security**: resolve `table_name` from `uploaded_datasets` by id; validate it +
  every column name via `isValidIdentifier`/new `isValidColumnName`; values always
  parameterized; geometry validated (`ST_IsValid`) and SRID-normalized; reject
  writes to the PK / system columns as appropriate.

### Lib (`packages/map-ui-lib/src/`) — framework-agnostic, controlled, `mapui:`
- `utils/` geometry helpers: **WKT→GeoJSON parser** (reverse of existing
  `wkt.ts:geojsonGeometryToWkt`), coordinate-string↔GeoJSON, geometry validation —
  all pure, fully unit-tested.
- Attribute **form** + **feature table** components (reuse SearchPanel inputs:
  AutocompleteInput / NumberInput / DateRangeInput; `ConfirmDialog`; ResultsDrawer
  table utils — confirm exact names when exploring frontend).
- A **geometry editor** component that is map-agnostic: takes the current geometry
  as a controlled prop + `onChange`, offers coordinate/WKT entry, and exposes a
  slot/render-prop for the app to plug in the actual draw map. Stories + tests.

### App (`apps/admin-app/src/`)
- New route e.g. `/my-data/:id` (collection editor) — table of rows + add/edit/
  delete + the attribute/geometry editor (modal or panel).
- `utils/dataApi.ts` — add `getCollectionSchema`, `listRows`, `createRow`,
  `updateRow`, `deleteRow` (pure request builders → unit-test like existing
  `dataApi.test.ts`).
- **The draw map** lives here (admin already renders maps via
  `MapPreview.tsx` — CONFIRM it uses maplibre/react-map-gl and whether a draw lib
  exists). Wrap a MapLibre map + a drawing interaction (point/box/polygon/line),
  bind to the lib geometry-editor's controlled geometry prop.

## Open questions for the user (RESOLVED)
1. **Geometry types**: introspect the column's exact `geometry(<type>,<srid>)`;
   coerce single↔multi (`ST_Multi`) + reproject to table SRID so an inserted row
   matches the collection's declared type.
2. **Draw map basemap/library**: **terra-draw** + its MapLibre adapter, in
   `apps/admin-app` only. Lib stays framework-agnostic.
3. **Coordinate entry UX**: both a WKT textarea and structured lat/lng entry,
   EPSG:4326.
4. **Read auth**: gate ALL row routes (reads included) behind `requireAuth` —
   public read access already exists via tipg.
5. **Stats drift**: recompute `feature_count`/`bbox` inline after each mutation.
6. **Scale**: server-side limit/offset paging + sortable columns + simple filter.
7. **Bulk ops**: single-row CRUD only for v1; bulk deferred.

## Testing strategy (carry forward)
- Lib: pure geometry utils (WKT/coord↔GeoJSON, validation) — exhaustive vitest;
  components via `renderToStaticMarkup`; stories as visual contract.
- Admin server: route tests with pg-mem + `supertest.agent` for **non-geometry**
  paths (auth, validation, 404, param building); **integration test against real
  PostGIS** (gated like `INGEST_INTEGRATION`) for the actual geometry SQL
  (insert/read/update round-trips, SRID, `ST_AsGeoJSON`/`ST_GeomFromGeoJSON`).
- Admin client: pure request builders in `dataApi.test.ts`; geometry-editor pure
  logic extracted + tested; map component kept thin (logic in testable utils).
- E2E: drive admin via Chrome DevTools MCP against the local docker stack — open a
  collection, add a row by coordinates AND by drawing, edit, delete; confirm via
  tipg `/collections/{id}/items` that changes persisted.
