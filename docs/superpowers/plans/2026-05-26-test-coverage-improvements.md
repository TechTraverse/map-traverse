# Test Coverage Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise meaningful test coverage across the three workspaces (`packages/map-ui-lib`, `apps/admin-app`, `apps/map-client`), make coverage measurable everywhere, and close the most load-bearing gaps.

**Architecture:** Four parallel agent worktrees off `ai/main`, each owning a focused workstream. After all four merge into `ai/main`, the lead runs `pnpm verify` and resolves any drift. Agents A and B touch the lib but on disjoint files (`vitest.config.ts` vs. new `__tests__/*.test.ts`). Agents C and D each own a separate app. No shared mutable surface.

**Tech Stack:** Vitest 2.x (lib) / 3.x (admin-app, map-client), `@vitest/coverage-v8`, `jsdom`, `supertest` + `pg-mem` (admin-app server), Zustand (map-client store), `nuqs` (map-client URL state).

---

## Worktree layout

Each agent runs in its own worktree off `ai/main`:

| Agent | Branch | Workspace |
|-------|--------|-----------|
| A | `ai/coverage-lib-config` | `packages/map-ui-lib` (config + thresholds only) |
| B | `ai/coverage-lib-utils` | `packages/map-ui-lib` (new tests only, no config edits) |
| C | `ai/coverage-admin-app` | `apps/admin-app` |
| D | `ai/coverage-map-client` | `apps/map-client` |

Each agent must follow the repo's worktree workflow (CLAUDE.md → "Worktree Isolation"):

```bash
git fetch origin
git worktree add -b ai/<branch-name> .claude/worktrees/<branch-name> ai/main
cd .claude/worktrees/<branch-name>
pnpm install
```

When done: commit on the worktree branch, run `pnpm verify`, **do not merge into `ai/main` yourself** — the lead handles merges in the final task.

---

## Agent A — Lib coverage scope + thresholds

**Goal:** Widen the lib's coverage `include` from `src/utils/**` to the whole `src/**`, exclude non-source files, and re-baseline thresholds.

**Files:**
- Modify: `packages/map-ui-lib/vitest.config.ts`
- Reference (read-only): `packages/map-ui-lib/src/utils/__tests__/cql2.test.ts` (test style)

### Task A1: Read current state

- [ ] **Step 1: Inspect current config**

```bash
cat packages/map-ui-lib/vitest.config.ts
```

Expected: shows current `include: ['src/utils/**/*.ts']`, thresholds `60/85/80/60`.

- [ ] **Step 2: Capture pre-change baseline**

```bash
cd packages/map-ui-lib && pnpm exec vitest run --coverage 2>&1 | tee /tmp/coverage-before.txt
```

Save the "All files" line for the PR description.

### Task A2: Widen coverage scope

- [ ] **Step 1: Edit `packages/map-ui-lib/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.stories.tsx',
        'src/**/*.stories.ts',
        'src/**/index.ts',
        'src/main.ts',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Re-baselined for whole-src coverage. Tighten over time.
        statements: 40,
        branches: 70,
        functions: 60,
        lines: 40,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
```

- [ ] **Step 2: Run coverage with new scope**

```bash
cd packages/map-ui-lib && pnpm exec vitest run --coverage 2>&1 | tee /tmp/coverage-after.txt
```

Expected: passes (478+ tests), thresholds met against the new wider include. If thresholds fail, lower the failing dimension by 5 points and re-run. Document final numbers in the commit message.

- [ ] **Step 3: Verify HTML report renders**

```bash
ls packages/map-ui-lib/coverage/index.html
```

Expected: file exists. (Open it locally if you want; not required for the task.)

- [ ] **Step 4: Add `coverage/` to gitignore if missing**

```bash
grep -q "^coverage" packages/map-ui-lib/.gitignore 2>/dev/null || echo "coverage/" >> packages/map-ui-lib/.gitignore
```

- [ ] **Step 5: Commit**

```bash
git add packages/map-ui-lib/vitest.config.ts packages/map-ui-lib/.gitignore
git commit -m "test(lib): widen coverage to src/**, rebaseline thresholds"
```

### Task A3: Add coverage script to root verify (optional but recommended)

- [ ] **Step 1: Inspect root scripts**

```bash
cat package.json | grep -A1 '"scripts"'
```

- [ ] **Step 2: Add a `test:coverage` passthrough at the monorepo root**

Edit `package.json` scripts block to add:

```json
"test:coverage": "pnpm --filter @ogc-maps/storybook-components test:coverage"
```

(Leave `verify` unchanged for now — coverage thresholds in agent A may need tuning after agent B's tests land.)

- [ ] **Step 3: Verify**

```bash
pnpm test:coverage 2>&1 | tail -10
```

Expected: coverage report prints, command exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "test: add monorepo test:coverage passthrough"
```

---

## Agent B — Lib utils gap-filling

**Goal:** Add tests for the highest-value 0%-coverage and partial-coverage utils. Do **not** touch `vitest.config.ts` (Agent A owns that).

**Files to create (one test file per util):**
- `packages/map-ui-lib/src/utils/__tests__/measure.test.ts`
- `packages/map-ui-lib/src/utils/__tests__/queryableHelpers.test.ts`
- `packages/map-ui-lib/src/utils/__tests__/globalSearchFetcher.test.ts`
- `packages/map-ui-lib/src/utils/__tests__/csvExport.test.ts`
- `packages/map-ui-lib/src/utils/__tests__/exportConverters.extra.test.ts` (extends existing partial coverage)

**Out of scope (do not test):** `boxDraw.ts` (MapLibre-coupled), `selection.ts` (16-line type-only file), `spriteUtils.ts` (browser-only fetches), `download.ts` / `id.ts` / `slugify.ts` (trivial wrappers — defer).

**Pattern to follow:** see `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts` — uses `vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })` for fetch mocks, `describe`/`it` from `vitest`.

### Task B1: Cover `measure.ts`

**File under test:** `packages/map-ui-lib/src/utils/measure.ts` (150 lines)

**Exports to cover:**
- `calculateDistance(coords, unit)`
- `calculateArea(coords, unit)`
- `calculateMeasurement(mode, coords, unit)`
- `defaultUnitForMode(mode)`
- `buildMeasureGeometryData(coords, mode)`
- `buildMeasurePointsData(coords)`
- `formatMeasurement(measurement)`
- Constants: `UNITS_FOR_MODE`, `UNIT_LABELS`

- [ ] **Step 1: Read the file**

```bash
sed -n '1,150p' packages/map-ui-lib/src/utils/measure.ts
```

- [ ] **Step 2: Write `__tests__/measure.test.ts`**

Required cases:
- `calculateDistance` returns 0 for `<2` coords; converts km/mi/m/ft correctly for a known segment (e.g. `[0,0]→[1,0]` ≈ 111.319 km).
- `calculateArea` returns 0 for `<3` coords; converts km2/mi2/ha/acres for a known polygon (a 1°×1° square at equator).
- `calculateMeasurement` returns `{mode, value, unit}` shape and dispatches on mode.
- `defaultUnitForMode('distance')` → `'km'`; `'area'` → `'km2'` (verify against source).
- `formatMeasurement` formats with sensible precision and the right unit label (e.g. `"123.45 km"`).
- `buildMeasureGeometryData` returns a GeoJSON `Feature` with `LineString` for distance mode, `Polygon` for area; `buildMeasurePointsData` returns a `FeatureCollection` of `Point`s.

Use `import * as turf from '@turf/length'` etc. only if needed for fixtures — prefer asserting against known numeric values with a tolerance:

```ts
expect(calculateDistance([[0,0],[1,0]], 'km')).toBeCloseTo(111.319, 1);
```

- [ ] **Step 3: Run**

```bash
cd packages/map-ui-lib && pnpm exec vitest run src/utils/__tests__/measure.test.ts
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add packages/map-ui-lib/src/utils/__tests__/measure.test.ts
git commit -m "test(lib): cover measure util"
```

### Task B2: Cover `queryableHelpers.ts` partial gaps

**File under test:** `packages/map-ui-lib/src/utils/queryableHelpers.ts` (225 lines, currently 36% covered)

**Read the file first** to identify the uncovered lines (67–214, 221–225 from the baseline report). Likely candidates: the `detectStyleTypeForCollection` / `detectStyleTypesForCollection` async paths.

- [ ] **Step 1: Read the file and existing test**

```bash
sed -n '1,225p' packages/map-ui-lib/src/utils/queryableHelpers.ts
cat packages/map-ui-lib/src/utils/__tests__/queryableHelpers.test.ts
```

- [ ] **Step 2: Add tests for the async detectors**

Write tests that mock `globalThis.fetch` to return a tipg-style `/collections/{id}/queryables` JSON response and assert the detector returns the expected `'fill' | 'line' | 'circle' | 'symbol'` (or array thereof). Cover:
- Single geometry type → single style type.
- Mixed geometry types → multiple style types deduped.
- Missing queryables → returns `null` / empty array (verify against source).
- Network error → propagates / returns null (whichever the source does).

Use the fetch-mock pattern from `ogcApi.test.ts`:

```ts
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ properties: { geometry: { $ref: '#/geometry/Polygon' } } }),
  }));
});
afterEach(() => vi.unstubAllGlobals());
```

- [ ] **Step 3: Run and commit**

```bash
cd packages/map-ui-lib && pnpm exec vitest run src/utils/__tests__/queryableHelpers.test.ts
git add packages/map-ui-lib/src/utils/__tests__/queryableHelpers.test.ts
git commit -m "test(lib): cover queryableHelpers async detectors"
```

### Task B3: Cover `globalSearchFetcher.ts`

**File under test:** `packages/map-ui-lib/src/utils/globalSearchFetcher.ts` (256 lines, **0% covered — biggest gap**)

**Exports to cover:**
- `prefetchKey(layerId, property)`
- `prefetchAllDistinctValues(layers, context)`
- `runGlobalSearch(query, layers, context)`

- [ ] **Step 1: Read the file**

```bash
sed -n '1,256p' packages/map-ui-lib/src/utils/globalSearchFetcher.ts
```

Identify the `GlobalSearchContext` shape and what `runGlobalSearch` returns (likely an array of `{layerId, feature, score?}` or similar).

- [ ] **Step 2: Write `__tests__/globalSearchFetcher.test.ts`**

Required cases:
- `prefetchKey('layer1', 'name')` returns a stable string (`'layer1:name'` or similar — verify).
- `prefetchAllDistinctValues` fans out fetches to `/collections/{id}/queryables` + distinct-value endpoints; assert the URL set matches expected.
- `runGlobalSearch` with a query string filters across multiple layers and returns hits sorted by relevance / layer order (verify against source behavior).
- Cancellation: if an `AbortSignal` is supported, abort mid-flight returns no results / throws `AbortError`.
- Empty query returns empty / no fetches issued.

Mock `fetch` per the `ogcApi.test.ts` pattern. Stub the `GlobalSearchContext` with a minimal object that satisfies the interface.

- [ ] **Step 3: Run and commit**

```bash
cd packages/map-ui-lib && pnpm exec vitest run src/utils/__tests__/globalSearchFetcher.test.ts
git add packages/map-ui-lib/src/utils/__tests__/globalSearchFetcher.test.ts
git commit -m "test(lib): cover globalSearchFetcher"
```

### Task B4: Cover `csvExport.ts` branch gaps

**File under test:** `packages/map-ui-lib/src/utils/csvExport.ts` (currently 86% stmts / 50% branches)

Uncovered lines from baseline: 13–14, 52–54.

- [ ] **Step 1: Read the file**

```bash
sed -n '1,54p' packages/map-ui-lib/src/utils/csvExport.ts
```

- [ ] **Step 2: Add cases targeting the uncovered branches**

Likely the missing branches are: empty feature array, features with mixed property keys (column-union behavior), values needing CSV escaping (quotes, commas, newlines), and `downloadCsv` invoking `URL.createObjectURL` (mock `URL.createObjectURL` + an `<a>` click).

```ts
import { featuresToCsv, downloadCsv } from '../csvExport';

it('escapes commas and quotes in values', () => {
  const csv = featuresToCsv([{ type: 'Feature', geometry: null, properties: { name: 'a,b' } }], {});
  expect(csv).toContain('"a,b"');
});
```

For `downloadCsv`, stub the DOM:

```ts
const click = vi.fn();
vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() });
const anchor = { click, setAttribute: vi.fn(), style: {} } as unknown as HTMLAnchorElement;
vi.spyOn(document, 'createElement').mockReturnValue(anchor);
downloadCsv('a,b\n1,2', 'test.csv');
expect(click).toHaveBeenCalled();
```

- [ ] **Step 3: Run and commit**

```bash
cd packages/map-ui-lib && pnpm exec vitest run src/utils/__tests__/csvExport.test.ts
git add packages/map-ui-lib/src/utils/__tests__/csvExport.test.ts
git commit -m "test(lib): cover csvExport edge cases"
```

### Task B5: Extend `exportConverters.ts` coverage

**File under test:** `packages/map-ui-lib/src/utils/exportConverters.ts` (currently 66% stmts, lines 101–109, 112–132 uncovered)

The existing test is `exportConverters.test.ts`. **Extend it in place** (not a new file):

- [ ] **Step 1: Read both files**

```bash
sed -n '90,141p' packages/map-ui-lib/src/utils/exportConverters.ts
cat packages/map-ui-lib/src/utils/__tests__/exportConverters.test.ts
```

- [ ] **Step 2: Add cases for the async converters that are uncovered**

Likely `flatgeobufConverter` and/or `geopackageConverter` (optional deps — they may need to be mocked or skipped on environments without the dep). For each:

```ts
it('flatgeobufConverter produces a non-empty Blob', async () => {
  const features = [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0,0] }, properties: {} }];
  const blob = await flatgeobufConverter(features as any, 'col');
  expect(blob).toBeInstanceOf(Blob);
  expect(blob.size).toBeGreaterThan(0);
});
```

If the optional dep is missing, the converter likely throws — assert that behavior instead.

- [ ] **Step 3: Run and commit**

```bash
cd packages/map-ui-lib && pnpm exec vitest run src/utils/__tests__/exportConverters.test.ts
git add packages/map-ui-lib/src/utils/__tests__/exportConverters.test.ts
git commit -m "test(lib): cover remaining exportConverters branches"
```

### Task B6: Verify all lib tests still pass

- [ ] **Step 1: Full lib test run**

```bash
cd packages/map-ui-lib && pnpm exec vitest run
```

Expected: 478 + (new tests) all green, no regressions.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin ai/coverage-lib-utils
```

---

## Agent C — Admin-app coverage tooling + tests

**Goal:** Stand up coverage in `apps/admin-app`, add tests for `inspectSource.ts`, and add an Express server integration test layer (auth + configs CRUD).

**Files:**
- Modify: `apps/admin-app/package.json` (add deps + scripts)
- Modify: `apps/admin-app/vitest.config.ts` (add coverage block + jsdom env split)
- Create: `apps/admin-app/src/utils/__tests__/inspectSource.test.ts`
- Create: `apps/admin-app/server/__tests__/routes.auth.test.ts`
- Create: `apps/admin-app/server/__tests__/routes.configs.test.ts`
- Create: `apps/admin-app/server/__tests__/testDb.ts` (shared in-memory pg helper)

### Task C1: Add coverage tooling

- [ ] **Step 1: Add deps**

```bash
cd apps/admin-app
pnpm add -D @vitest/coverage-v8 supertest @types/supertest pg-mem
```

- [ ] **Step 2: Add coverage config + jsdom env for the React tests**

Edit `apps/admin-app/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    environmentMatchGlobs: [
      ['src/components/**', 'jsdom'],
      ['src/pages/**', 'jsdom'],
      ['server/**', 'node'],
      ['**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        statements: 30,
        branches: 60,
        functions: 50,
        lines: 30,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
```

- [ ] **Step 3: Add scripts to `apps/admin-app/package.json`**

```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

(Replace existing `test` script.)

- [ ] **Step 4: Verify baseline still passes**

```bash
cd apps/admin-app && pnpm exec vitest run
```

Expected: 25 tests pass (the existing ones).

```bash
pnpm exec vitest run --coverage 2>&1 | tail -20
```

Expected: report prints. Coverage will be low but the run should not fail thresholds yet — if it does, lower thresholds by 5 points until passing, document final numbers.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-app/package.json apps/admin-app/vitest.config.ts ../../pnpm-lock.yaml
git commit -m "test(admin-app): add v8 coverage + supertest tooling"
```

### Task C2: Cover `inspectSource.ts`

**File under test:** `apps/admin-app/src/utils/inspectSource.ts` (335 lines, 0% covered)

**Export:** `inspectSourceClientSide(url, opts)` — probes a URL and returns metadata about whether it's OGC Features / TileJSON / XYZ / unknown, plus collection lists, attribution, etc.

- [ ] **Step 1: Read the file**

```bash
sed -n '1,335p' apps/admin-app/src/utils/inspectSource.ts
```

- [ ] **Step 2: Write `apps/admin-app/src/utils/__tests__/inspectSource.test.ts`**

Mock `fetch` per response type. Required cases:
- OGC Features landing page (`/`) with `links` referencing `/collections` → returns `{type: 'ogc-features', collections: [...]}`.
- TileJSON response → returns `{type: 'tilejson', tileJson: {...}}`.
- XYZ tile URL probe (`{z}/{x}/{y}.png`) → returns `{type: 'xyz'}`.
- Auth header injection: pass an auth config, verify the mock fetch received the right `Authorization` header.
- Network error → returns `{type: 'unknown', error: ...}` (verify against source).

Test pattern: 30–50 test cases mirroring the layout of `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts`. Use `vi.stubGlobal('fetch', ...)` and `vi.unstubAllGlobals()` in `afterEach`.

- [ ] **Step 3: Run and commit**

```bash
cd apps/admin-app && pnpm exec vitest run src/utils/__tests__/inspectSource.test.ts
git add apps/admin-app/src/utils/__tests__/inspectSource.test.ts
git commit -m "test(admin-app): cover inspectSource"
```

### Task C3: Server test harness with `pg-mem`

**Goal:** A reusable in-memory Postgres backed `pool` so server tests can run without Docker.

- [ ] **Step 1: Inspect `server/db.ts`**

```bash
cat apps/admin-app/server/db.ts
```

Note: `pool` is a module-level `new Pool({...})`. To swap it for tests we need a way to inject. Simplest: export a `createPool()` factory, and have tests mock the `./db.js` module via `vi.mock`.

- [ ] **Step 2: Refactor `server/db.ts` minimally for testability**

Wrap the pool construction so tests can replace it:

```ts
import { Pool } from 'pg';

export function createPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'gis',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    options: '-c search_path=map_admin,public',
  });
}

export const pool = createPool();
```

(Leave `initDb` and other exports untouched.)

- [ ] **Step 3: Read the production DDL**

```bash
sed -n '1,200p' apps/admin-app/server/db.ts
```

Copy the `CREATE TABLE` / `CREATE INDEX` statements that `initDb` runs. You will paste them into the helper below so pg-mem matches the production schema. If `initDb` runs DDL that pg-mem rejects (e.g. partial indexes with `WHERE`, or certain Postgres-specific syntax), wrap each statement in `try { await pool.query(stmt); } catch (e) { /* pg-mem-unsupported, skip */ }`.

- [ ] **Step 4: Create `apps/admin-app/server/__tests__/testDb.ts`**

```ts
import { newDb, DataType } from 'pg-mem';
import { vi } from 'vitest';
import bcrypt from 'bcryptjs';

export function buildTestDb() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
  });
  // pg-mem doesn't know now() returning timestamptz by default; register if needed:
  db.public.registerFunction({
    name: 'now',
    returns: DataType.timestamptz,
    implementation: () => new Date(),
    impure: true,
  });
  const adapter = db.adapters.createPg();
  return { db, Pool: adapter.Pool };
}

/**
 * Replace the `../db.js` module before importing `../index.js`.
 * Call this from `beforeAll` (top-level of the test file) BEFORE
 * importing the server module.
 */
export async function mockDbModule() {
  const { Pool } = buildTestDb();
  const pool = new Pool();

  // DDL — paste the production CREATE TABLE / CREATE INDEX statements here,
  // each wrapped in try/catch so pg-mem-unsupported syntax is skipped.
  const ddlStatements = [
    `CREATE SCHEMA IF NOT EXISTS map_admin`,
    `CREATE TABLE IF NOT EXISTS map_admin.map_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT false,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // ... paste the remaining CREATE TABLE / CREATE INDEX statements from
    // production initDb() here, in order. Include the users table, sessions
    // table, and any other tables the routes you're testing actually touch.
  ];
  for (const stmt of ddlStatements) {
    try { await pool.query(stmt); } catch { /* pg-mem-unsupported; skip */ }
  }

  vi.doMock('../db.js', () => ({
    pool,
    createPool: () => pool,
    initDb: async () => { /* no-op; DDL already applied above */ },
  }));
  return pool;
}

/** Seed an admin user with a known password. */
export async function seedAdminUser(
  pool: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  username = 'admin',
  password = 'admin',
) {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO map_admin.users (username, password_hash) VALUES ($1, $2)`,
    [username, hash],
  );
}
```

- [ ] **Step 4: Commit the harness**

```bash
git add apps/admin-app/server/db.ts apps/admin-app/server/__tests__/testDb.ts
git commit -m "test(admin-app): add pg-mem-backed server test harness"
```

### Task C4: Auth route integration tests

**Routes to cover (in `server/index.ts`):**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

- [ ] **Step 1: Identify the express `app` instance**

```bash
grep -n "const app\|app\.listen\|export " apps/admin-app/server/index.ts | head -20
```

If `app` is not exported, refactor `server/index.ts` to:
1. Move the `app.listen(...)` call inside `if (import.meta.url === ...) { ... }` so importing doesn't start the server.
2. `export { app }` at the bottom.

- [ ] **Step 2: Write `apps/admin-app/server/__tests__/routes.auth.test.ts`**

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser } from './testDb.js';

let app: import('express').Express;

beforeAll(async () => {
  const pool = await mockDbModule();
  await seedAdminUser(pool, 'admin', 'admin');
  ({ app } = await import('../index.js'));
});

describe('auth routes', () => {
  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('accepts valid credentials and sets a session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns user when session is valid', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });
});
```

- [ ] **Step 3: Run**

```bash
cd apps/admin-app && pnpm exec vitest run server/__tests__/routes.auth.test.ts
```

Expected: 4 green.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-app/server/__tests__/routes.auth.test.ts apps/admin-app/server/index.ts
git commit -m "test(admin-app): auth route integration tests"
```

### Task C5: Configs CRUD route integration tests

**Routes to cover:**
- `GET /api/configs` — list
- `POST /api/configs` — create
- `GET /api/configs/:id` — fetch one
- `PUT /api/configs/:id` — update
- `DELETE /api/configs/:id` — delete
- `POST /api/configs/:id/publish` — publish (verify uniqueness constraint trips on duplicate published name)

- [ ] **Step 1: Write `apps/admin-app/server/__tests__/routes.configs.test.ts`**

Follow the auth-test pattern. For each route assert:
- Auth required (401 when no session).
- Happy path (201/200 with expected body shape).
- Validation failure (400 when `safeValidateMapConfig` rejects).
- Uniqueness conflict on publish (409 or whichever status the server returns — verify against source).

Use `request.agent(app)` to share the login cookie across calls.

- [ ] **Step 2: Run and commit**

```bash
cd apps/admin-app && pnpm exec vitest run server/__tests__/routes.configs.test.ts
git add apps/admin-app/server/__tests__/routes.configs.test.ts
git commit -m "test(admin-app): configs CRUD integration tests"
```

### Task C6: Verify and push

- [ ] **Step 1: Full admin-app test run**

```bash
cd apps/admin-app && pnpm exec vitest run --coverage
```

Expected: all green; coverage above the (relaxed) thresholds.

- [ ] **Step 2: Push**

```bash
git push -u origin ai/coverage-admin-app
```

---

## Agent D — Map-client test infrastructure + smoke tests

**Goal:** Stand up vitest in `apps/map-client` and cover the two pieces of glue that are not in the lib: the Zustand `mapStore` and the `useMapUrlState` nuqs bridge.

**Files:**
- Modify: `apps/map-client/package.json` (add deps + scripts)
- Create: `apps/map-client/vitest.config.ts`
- Create: `apps/map-client/src/stores/__tests__/mapStore.test.ts`
- Create: `apps/map-client/src/hooks/__tests__/useMapUrlState.test.tsx`
- Create: `apps/map-client/vitest.setup.ts` (optional, for `matchMedia` / `ResizeObserver` stubs)

### Task D1: Add vitest tooling

- [ ] **Step 1: Add deps**

```bash
cd apps/map-client
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/react-hooks
```

(If `@testing-library/react-hooks` is React-18-incompatible, use `renderHook` from `@testing-library/react` v14+ instead.)

- [ ] **Step 2: Create `apps/map-client/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    restoreMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        statements: 20,
        branches: 50,
        functions: 30,
        lines: 20,
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
```

- [ ] **Step 3: Create `apps/map-client/vitest.setup.ts`**

```ts
import { vi } from 'vitest';

// Stubs for browser APIs MapLibre / nuqs touch at import time.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}
```

- [ ] **Step 4: Add scripts to `apps/map-client/package.json`**

```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Verify scaffold**

```bash
cd apps/map-client && pnpm exec vitest run --passWithNoTests
```

Expected: 0 tests, exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/map-client/package.json apps/map-client/vitest.config.ts apps/map-client/vitest.setup.ts ../../pnpm-lock.yaml
git commit -m "test(map-client): scaffold vitest with jsdom"
```

### Task D2: Cover `mapStore.ts`

**File under test:** `apps/map-client/src/stores/mapStore.ts` (338 lines)

**Exports:** `useMapStore`, `useActiveLayerIds`, `useEffectiveCql2Filters`

- [ ] **Step 1: Read the store**

```bash
cat apps/map-client/src/stores/mapStore.ts
```

Identify actions and computed selectors.

- [ ] **Step 2: Write `apps/map-client/src/stores/__tests__/mapStore.test.ts`**

Zustand stores are testable directly via their `getState()` / `setState()` / action methods. Required cases:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from '../mapStore';

beforeEach(() => {
  // Reset to initial state by re-applying the initial setter (or however the store exposes reset).
  useMapStore.setState(useMapStore.getInitialState?.() ?? {}, true);
});

describe('mapStore', () => {
  it('toggles layer visibility', () => {
    useMapStore.getState().toggleLayer('layer-1');
    expect(useMapStore.getState().activeLayerIds).toContain('layer-1');
    useMapStore.getState().toggleLayer('layer-1');
    expect(useMapStore.getState().activeLayerIds).not.toContain('layer-1');
  });

  it('merges base + active cql2 filters via useEffectiveCql2Filters', () => {
    // mapStore exposes a layer's permanent cql2Filter via the loaded config,
    // and SearchPanel writes to activeCql2Filters[layerId]. The merged result
    // is the logical AND of the two — verify by:
    // 1. Seeding the store with a layer that has a base cql2Filter (e.g. {op:'=', args:[{property:'category'},'A']}).
    // 2. Calling setActiveCql2Filter(layerId, {op:'>', args:[{property:'value'},10]}).
    // 3. Asserting useEffectiveCql2Filters() returns {op:'and', args: [base, active]}.
    // Use renderHook for the selector, or call the store's selector function directly if it's exported.
    const layerId = 'l1';
    const base = { op: '=', args: [{ property: 'category' }, 'A'] };
    const active = { op: '>', args: [{ property: 'value' }, 10] };
    useMapStore.setState({
      layers: { [layerId]: { id: layerId, cql2Filter: base } } as any,
      activeCql2Filters: { [layerId]: active } as any,
    });
    const { result } = renderHook(() => useEffectiveCql2Filters());
    expect(result.current[layerId]).toEqual({ op: 'and', args: [base, active] });
  });

  it('clears active filters', () => {
    useMapStore.getState().setActiveCql2Filter('l1', { op: '=', args: [{ property: 'x' }, 1] });
    useMapStore.getState().clearActiveCql2Filters();
    expect(useMapStore.getState().activeCql2Filters).toEqual({});
  });

  it('updates viewport', () => {
    useMapStore.getState().setViewport({ longitude: 5, latitude: 6, zoom: 7 });
    expect(useMapStore.getState().viewport).toMatchObject({ longitude: 5, latitude: 6, zoom: 7 });
  });
});
```

Aim for one test per action. Use the **renderHook** form only when testing the React-hook selectors (`useActiveLayerIds`, `useEffectiveCql2Filters`):

```ts
import { renderHook, act } from '@testing-library/react';
import { useEffectiveCql2Filters } from '../mapStore';
const { result } = renderHook(() => useEffectiveCql2Filters());
```

- [ ] **Step 3: Run and commit**

```bash
cd apps/map-client && pnpm exec vitest run src/stores/__tests__/mapStore.test.ts
git add apps/map-client/src/stores/__tests__/mapStore.test.ts
git commit -m "test(map-client): cover mapStore actions and selectors"
```

### Task D3: Cover `useMapUrlState.ts`

**File under test:** `apps/map-client/src/hooks/useMapUrlState.ts` (54 lines)

This hook reads/writes URL state via nuqs and syncs it to `mapStore`.

- [ ] **Step 1: Read the hook**

```bash
cat apps/map-client/src/hooks/useMapUrlState.ts
```

- [ ] **Step 2: Write `apps/map-client/src/hooks/__tests__/useMapUrlState.test.tsx`**

nuqs needs an adapter at the React root. The simplest test setup is the `NuqsTestingAdapter`:

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useMapUrlState } from '../useMapUrlState';

it('reads viewport from search params', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NuqsTestingAdapter searchParams="?lng=10&lat=20&zoom=5">{children}</NuqsTestingAdapter>
  );
  const { result } = renderHook(() => useMapUrlState(), { wrapper });
  expect(result.current.viewport).toEqual({ longitude: 10, latitude: 20, zoom: 5 });
});

it('writing viewport pushes to URL', () => {
  const onUrlUpdate = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>{children}</NuqsTestingAdapter>
  );
  const { result } = renderHook(() => useMapUrlState(), { wrapper });
  act(() => result.current.setViewport({ longitude: 1, latitude: 2, zoom: 3 }));
  expect(onUrlUpdate).toHaveBeenCalled();
});
```

Cover at minimum: viewport read, viewport write, active-layers read, active-layers write.

- [ ] **Step 3: Run and commit**

```bash
cd apps/map-client && pnpm exec vitest run src/hooks/__tests__/useMapUrlState.test.tsx
git add apps/map-client/src/hooks/__tests__/useMapUrlState.test.tsx
git commit -m "test(map-client): cover useMapUrlState url<->store sync"
```

### Task D4: Verify and push

- [ ] **Step 1: Full map-client run**

```bash
cd apps/map-client && pnpm exec vitest run --coverage
```

Expected: green; coverage thresholds met.

- [ ] **Step 2: Push**

```bash
git push -u origin ai/coverage-map-client
```

---

## Lead — Integrate, verify, promote

After agents A–D push their branches.

### Task L1: Merge all four into `ai/main`

- [ ] **Step 1: Fetch and switch to `ai/main`**

```bash
git fetch origin
git checkout ai/main
git pull --ff-only origin ai/main
```

- [ ] **Step 2: Merge in order (low-conflict first)**

```bash
git merge --no-ff origin/ai/coverage-lib-config -m "merge: lib coverage config"
git merge --no-ff origin/ai/coverage-lib-utils  -m "merge: lib utils tests"
git merge --no-ff origin/ai/coverage-admin-app  -m "merge: admin-app coverage + tests"
git merge --no-ff origin/ai/coverage-map-client -m "merge: map-client test scaffold + smoke tests"
```

Per CLAUDE.md "Merge conflicts" rule: resolve mechanical conflicts (e.g. `pnpm-lock.yaml`, `package.json` scripts blocks) yourself; halt only if the two sides contradict.

### Task L2: Verify the integrated tree

- [ ] **Step 1: Reinstall and run full verify**

```bash
pnpm install
pnpm verify
```

Expected: all builds + all tests pass.

- [ ] **Step 2: Run each coverage report**

```bash
pnpm --filter @ogc-maps/storybook-components test:coverage 2>&1 | tail -5
pnpm --filter admin-app test:coverage 2>&1 | tail -5
pnpm --filter map-client test:coverage 2>&1 | tail -5
```

Capture the "All files" line from each for the integration commit message.

- [ ] **Step 3: If a coverage threshold trips post-merge**, adjust the threshold in the corresponding `vitest.config.ts` down by 5 points, commit, re-run. Do not skip tests.

### Task L3: Push and finish

- [ ] **Step 1: Push `ai/main`**

```bash
git push origin ai/main
```

- [ ] **Step 2: Clean up worktrees**

```bash
git worktree list
git worktree remove .claude/worktrees/coverage-lib-config
git worktree remove .claude/worktrees/coverage-lib-utils
git worktree remove .claude/worktrees/coverage-admin-app
git worktree remove .claude/worktrees/coverage-map-client
git branch -d ai/coverage-lib-config ai/coverage-lib-utils ai/coverage-admin-app ai/coverage-map-client
```

- [ ] **Step 3: Open a promotion PR (`ai/main` → `main`)** per CLAUDE.md workflow, with a summary of:
  - Lib coverage: `<before>` → `<after>` across all of `src/**`.
  - Admin-app coverage: now measurable, with `<n>` server tests + `<n>` `inspectSource` tests.
  - Map-client coverage: now measurable, with mapStore and useMapUrlState covered.

---

## Notes for all agents

- **Worktree workflow is mandatory.** Do not commit to `ai/main` directly (CLAUDE.md → "Worktree Isolation").
- **Commit messages**: one line, ~50 chars, no `Co-Authored-By` trailer (repo convention).
- **Test patterns**: mirror `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts` for fetch-mocked utils, `Legend.test.tsx` for component DOM tests with `renderToStaticMarkup`.
- **No `@testing-library/react` in the lib** (CLAUDE.md "Gotchas"). Agents B's tests must stay pure-logic or `renderToStaticMarkup`.
- **Coverage thresholds are relaxable.** If a threshold trips and you've made a genuine effort, lower it by 5 points and document why. The point is measurability, not green-bar performance art.
