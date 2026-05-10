# Mike1 Feedback — Execution Plan

10 items derived from client feedback (2026-05-10) on `Mike1`, deployed at
`http://16.147.169.174`. An investigation pass (results in `INVESTIGATION.md`,
raw artifacts in `investigation/`) refined or invalidated each hypothesis —
**read INVESTIGATION.md before starting any item.** This file is the
build-order and acceptance contract; INVESTIGATION.md is the evidence.

Items 1 and 2 are demoted (could not reproduce). Item 10 has an extra wrinkle
beyond the original wiring bug. Everything else is confirmed.

---

## Deployment quick reference

- **Live admin:** `http://16.147.169.174/admin/` — username `admin`; password is the literal value commented out in `terraform/terraform.tfvars` (`# admin_password_hash = ...`).
- **Live map-client:** `http://16.147.169.174/`.
- **OGC API:** `http://16.147.169.174/ogc/collections/<id>/queryables`.
- **DB:** `psql -h 16.147.169.174 -U postgres` — password from
  `terraform output -raw db_password` inside `terraform/`. **Configs live in
  `map_admin.map_configs`, sources in `map_admin.ogc_sources`** (the `public.*`
  rows are stale seed data — ignore).
- **Containers (on host):** `ogc-maps-admin-app`, `ogc-maps-map-client`,
  `ogc-maps-tipg`, `ogc-maps-postgis`, `ogc-maps-caddy`. The repo's
  `docker-compose.yml` is **not** what the host runs.
- **Bundles are stale** for both apps — local fixes won't appear on
  `16.147.169.174` without a redeploy (see `feedback.md` D for the gap).

---

## Recommended execution order

Build order from `INVESTIGATION.md` cluster analysis:

1. **Wave A (parallel, 4 worktrees):** items **3**, **4**, **6**, **8+9**
   bundled. No file overlap.
2. **Wave B (parallel, 1 worktree):** item **7**. Independent of A but
   touches many files — easier to land separately.
3. **Wave C (sequential):** **10** first, then **5**. Both edit the layer
   rendering blocks of `apps/admin-app/src/components/MapPreview.tsx` and
   `apps/map-client/src/components/MapContainer.tsx`; do not parallelise.
4. **Wave D (final lint pass):** items **1** and **2** as defensive
   pre-save validation. Combine into one worktree; both are now scoped as
   guardrails rather than bug fixes.

Branch naming: `ralph/fb-<n>-<slug>`. Wave A through D each merge into
`ralph/main` per `CLAUDE.md → Worktree Isolation`. Run `pnpm verify` from
each worktree before the merge.

---

## Item 3 — Admin preview: lat/lng input missing

**Status:** Pending · **Wave:** A · **Complexity:** S (one-line)

**Confirmed cause:** `apps/admin-app/src/components/MapPreview.tsx:1507-1513`
omits `onNavigate` on `<CoordinateDisplay>`, so the readout renders as a
passive `<span>`. Public map-client wires it correctly at
`apps/map-client/src/components/MapOverlay.tsx:706-713`.

**Steps:**
1. In `MapPreview.tsx` add
   `onNavigate={(lat, lng) => mapInstance?.flyTo({ center: [lng, lat], zoom: 14 })}`
   using the existing `mapInstance` ref (already in scope in this component).
2. Spot-check `CoordinateDisplay` polish (Esc collapses, parse error keeps
   form open). Already present per the lib component — verify, don't rewrite.

**Acceptance:**
- Admin preview's coord readout expands into the lat/lng form on click.
- Submitting valid coords flies the preview map to that location at zoom 14.
- Out-of-range values show the inline error.
- `pnpm verify` passes.

**Files:** `apps/admin-app/src/components/MapPreview.tsx` only.

---

## Item 4 — Labels for line and polygon layers

**Status:** Pending · **Wave:** A · **Complexity:** M

**Confirmed cause:** `packages/map-ui-lib/src/utils/queryableHelpers.ts:39-45`
maps Point → `['circle', 'symbol']` but LineString → `['line']` and
Polygon → `['fill', 'line']`. The LayerEditor never offers a `symbol` style
for non-points, so labeling is reachable only by hand-editing JSON.
`text-field` and friends already exist in the property registry (lines
99-117).

**Steps:**
1. Add `'symbol'` to the array returned by `geometryTypeToStyleTypes` for
   `linestring` and `polygon`.
2. Do **not** auto-add a symbol style in
   `buildDefaultStylesForGeometryTypes` — keep that behaviour as-is so
   existing maps don't regress. Symbol styles are opt-in.
3. In `packages/map-ui-lib/src/components/LayerEditor/LayerEditor.tsx` add
   an "Add labels" button visible only when (a) at least one of the layer's
   geometry types is line or polygon and (b) the layer has at least one
   string-typed queryable. Clicking appends a `StyleConfig` with:
   - `type: 'symbol'`
   - `text-field: '{<first-string-prop>}'`
   - `text-size: 12`, `text-halo-color: '#fff'`, `text-halo-width: 1`
   - `symbol-placement: 'line'` for line, `'point'` for polygon
   - `geometryFilter` matching the relevant type when source is mixed
4. Add a story showing line + polygon labels in
   `LayerEditor.stories.tsx` (and verify the existing `StyleEditor` handles
   the symbol style — it does).
5. Add a "Labeling lines and polygons" subsection to `docs/CONFIGURATION.md`.

**Acceptance:**
- Mike1's road layer can be given following-the-line labels via the editor
  (no JSON editing).
- Mike1's town layer can be given centroid labels.
- Existing maps without symbol styles render unchanged.

**Files:** `queryableHelpers.ts`, `LayerEditor.tsx`,
`LayerEditor.stories.tsx`, `docs/CONFIGURATION.md`. No schema change needed.

---

## Item 6 — Sort Key: enable data-driven, improve copy

**Status:** Pending · **Wave:** A · **Complexity:** S

**Confirmed cause:** `*-sort-key` properties (`propertyRegistry.ts:16,41,63,115`)
have `widget: 'number'` but no `dataDriven: true`. MapLibre supports
data-driven sort-key. The current help text doesn't mention that the value
can be a property expression.

**Steps:**
1. Add `dataDriven: true` to all four sort-key entries in `propertyRegistry.ts`.
2. Expand the description on each to mention that it accepts a property
   expression (e.g. `["get", "priority"]`) so features can be sorted by a
   column.
3. Add a short "Stacking order: layer order vs. Sort Key" section to
   `docs/CONFIGURATION.md` distinguishing the two.

**Acceptance:**
- Sort Key field offers the data-driven toggle in the StyleEditor for
  fill, line, circle, and symbol layers.
- Setting Sort Key to a property name produces correct stacking on the map.
- Description visible in tooltip on hover.

**Files:** `propertyRegistry.ts`, `docs/CONFIGURATION.md`. The non-code
client reply lives in `feedback.md`.

---

## Item 8 + 9 — Configurable legend background + outline-only swatch

**Status:** Pending · **Wave:** A (combined worktree) · **Complexity:** M

Combined because both edit `packages/map-ui-lib/src/components/Legend/Legend.tsx`
and the legend schema in `packages/map-ui-lib/src/schemas/config.ts`.

### 8 — Background

**Confirmed cause:** `Legend.tsx:402` hardcodes `mapui:bg-white`. There's no
top-level legend display config (per-layer `LegendConfig` exists but is
per-entry).

**Steps:**
1. Add an optional `LegendDisplayConfigSchema` (background, borderColor,
   textColor) and surface it on `MapConfigSchema` (likely under
   `ui.legend` or as a top-level `legendDisplay`). Use the
   `extend-map-config` skill.
2. Replace the hardcoded `mapui:bg-white` with an inline
   `style={{ backgroundColor }}` (and matching styles for border/text).
3. Add a section in `LegendEditor.tsx` exposing the new fields.

### 9 — Outline-only swatch shape

**Confirmed cause:** `Swatch` in `Legend.tsx:35-68` supports
`square|circle|line` only; no transparent / outline-only variant.

**Steps:**
1. Extend `LegendEntrySchema.shape` with `'outline-square'` and
   `'outline-circle'`. Add optional `outlineColor` / `outlineWidth`.
2. Update `Swatch` to render the new shapes (transparent fill + 1px
   border using inline style).
3. Update `LegendEntryEditor` to expose the new shapes and conditional
   outline color/width fields.

**Acceptance (combined):**
- Background and text colors of the legend can be set from
  `LegendEditor` and persist across reload.
- A polygon legend entry can be configured as an outlined hollow swatch.
- `Legend.stories.tsx` covers dark background and outline-only entries.
- `pnpm verify` passes.

**Files:** `Legend.tsx`, `LegendEntry*.tsx`, `LegendEditor.tsx`,
`schemas/config.ts`, `Legend.stories.tsx`, `LegendEditor.stories.tsx`,
`docs/CONFIGURATION.md`.

---

## Item 7 — Color copy/paste + recents palette

**Status:** Pending · **Wave:** B · **Complexity:** M

**Confirmed cause:** No bug — UX gap. Color pickers across the app
(`StyleEditor`, `DataDrivenColorEditor`, `LegendEntryEditor`,
`BasemapEditor`) all hand-edit hex values without copy/paste affordance.

**Notes:**
- Deployed instance is plain HTTP; `navigator.clipboard.writeText` may be
  gated. Use a session-scoped store as the primary copy/paste channel; OS
  clipboard is a nice-to-have.

**Steps:**
1. Add `useColorClipboard()` hook in
   `packages/map-ui-lib/src/hooks/` (module-level state is fine — keep it
   framework-agnostic).
2. `grep -rn 'type="color"\|widget: ..color' packages/map-ui-lib/src apps`
   to enumerate every color-editing surface.
3. Wrap each with copy/paste icon-buttons. Show a "Recent colors" strip
   underneath, sourced from `localStorage` keyed `mapui:recent-colors`
   (cap at 8).
4. Stories for the picker showing the recents strip.

**Acceptance:**
- A color from Layer A applies to Layer B in two clicks (copy → paste),
  no typing.
- Recents persist across reload.
- Copy/paste works on plain HTTP.

**Files:** new hook, all color picker call sites listed above, stories.

---

## Item 10 — Layer-level CQL2 doesn't filter the map (+ value-case hint)

**Status:** Pending · **Wave:** C (first) · **Complexity:** M

**Confirmed cause — two compounding bugs:**

1. **Wiring:** Both apps initialise `activeCql2Filters: {}`
   (`apps/map-client/src/stores/mapStore.ts:117`,
   `apps/admin-app/src/components/MapPreview.tsx:249`) and never seed from
   `layer.cql2Filter`. Confirmed live: vector tile requests for `towns`
   carry no `filter=` query param.
2. **Mike's value is wrong:** Mike's saved rule is
   `abandoned = "No"`. Actual data values are `"NO"`, `"YES"`, `NULL`
   (counts 14 / 8 / 23). Even with the wiring fixed, his filter matches
   nothing → he'd see all 45 towns disappear and call it broken.

**Steps:**
1. **Wiring (PLAN's design B).** Introduce `baseCql2Filters` derived from
   `layers[i].cql2Filter`. AND-merge with `activeCql2Filters` at every
   consumer:
   - `getCql2FilteredVectorTileUrl`, `getVectorTileSourceKey`,
     `fetchFeatures`, `useOgcFeatures`, `useCsvExport`.
   - Ensure `getVectorTileSourceKey` includes the merged filter so MapLibre
     refetches on either base or active changes.
2. **Distinct-values hint in the CQL2 editor.** Locate the value input in
   `Cql2FilterEditor` (likely
   `packages/map-ui-lib/src/components/Cql2FilterEditor/`). When the rule's
   `property` is a string queryable, fetch distinct values using the
   existing autocomplete/distinct-values utility (already used by
   SearchPanel and `DataDrivenColorEditor`) and render a dropdown instead
   of a free-form text input. Fall back to free text when distinct values
   aren't available.
3. **Smoke test on Mike1.** Update Mike1's saved rule via the wizard to
   `"NO"`. Confirm the layer hides abandoned towns and the SearchPanel
   filters layer on top of that base filter.
4. Update `docs/SEARCH-INTEGRATION.md`: "`layer.cql2Filter` is a permanent
   base filter applied to every request; SearchPanel filters AND on top."

**Acceptance:**
- A layer with `cql2Filter` shows the filter applied on first map render
  and on every reload, both in admin preview and map-client.
- Clearing the SearchPanel does not reveal base-filtered features.
- CSV export of the filtered layer respects both base + active filters.
- The CQL2 editor shows a distinct-values dropdown on string properties.

**Files:** `mapStore.ts`, `MapPreview.tsx`, `MapContainer.tsx`,
`utils/ogcApi.ts`, `Cql2FilterEditor.tsx`, `useCsvExport.ts`,
`docs/SEARCH-INTEGRATION.md`. **Coordinate with item 5 (next) — both edit
`MapPreview.tsx` and `MapContainer.tsx` rendering blocks.**

---

## Item 5 — Per-category line styling

**Status:** Pending · **Wave:** C (after item 10) · **Complexity:** L

**Confirmed cause:**
- **Line width:** already implemented.
  `propertyRegistry.ts:24` has `dataDriven: true`;
  `DataDrivenNumberEditor.tsx:18-60` already supports `match` (categorical)
  mode. **No code change for line-width** — just verify the editor surfaces
  it for line layers and document it.
- **Line dasharray:** MapLibre style spec data-constants `line-dasharray`,
  so the only path is sub-layer expansion at render time.

**Steps:**
1. **Line-width verification.** Confirm in the deployed admin (or
   storybook) that the categorical mode appears in the StyleEditor for a
   line layer's Line Width field. If it does, write up a short
   `docs/CONFIGURATION.md` note. If it doesn't, fix the visibility
   condition (don't redo the editor).
2. **Dasharray schema.** Add to `StyleConfigSchema` in
   `schemas/config.ts` (line-only):
   ```ts
   dashByCategory?: {
     property: string;
     cases: { value: string | number; dasharray: number[] }[];
     default?: number[];
   }
   ```
3. **Dasharray editor.** Add a "Dash by category" panel to the line
   StyleEditor next to the existing dasharray widget.
4. **Render-time helper.** Add
   `expandDashByCategoryLayer(layer): LayerConfig[]` in
   `packages/map-ui-lib/src/utils/`. Returns one layer per case with a
   maplibre `filter` expression, plus a default-case layer with the
   negated filter. Stable derived ids: `${layer.id}-dash-${value}`.
5. **Per-app render integration.** Use the helper in
   `apps/map-client/src/components/MapContainer.tsx` and
   `apps/admin-app/src/components/MapPreview.tsx` line-rendering blocks.
   **Land item 10 first** to avoid merge conflicts in these files.
6. **Legend support.** Extend the legend renderer to show one entry per
   case for dashByCategory layers.
7. Tests + story for the helper and the editor.
8. Doc note in `docs/CONFIGURATION.md` flagging the MapLibre limitation
   and the project's workaround.

**Acceptance:**
- A road layer in Mike1 can have e.g.
  interstate=solid 4px / primary=solid 2px / secondary=dashed 1.5px,
  driven by a single property.
- Saved + reloaded config produces the same render.
- Legend reflects each category's dash style.

**Files:** `schemas/config.ts`, `StyleEditor.tsx`, new utility, both
`MapContainer.tsx` and `MapPreview.tsx`, `Legend.tsx`,
`docs/CONFIGURATION.md`.

---

## Item 1 — Imagery save guardrail (demoted)

**Status:** Pending · **Wave:** D · **Complexity:** S

**Why demoted:** Investigation could not reproduce the save block.
`safeValidateMapConfig(demo)` and `safeValidateMapConfig(Mike1 v1 with
imagery)` both pass; re-saving Mike1 today returns 200. Likeliest cause was
a transient half-edited row from an older bundle. Treat this as a
guardrail, not a bug fix.

**Steps:**
1. In `apps/admin-app/src/components/ImageryEditor*.tsx`, render an
   inline warning beside any imagery row where `sourceId` is empty AND
   `tileUrlTemplate` is empty AND `collection` is empty. Disable Save
   while the row is in that state, with a Remove button to clear it.
2. In `apps/admin-app/src/pages/ConfigWizardPage.tsx:342`, prettify Zod
   error paths (`imageryLayers.0.sourceId` →
   `Imagery layer #1 → Source`).
3. **Do not** touch `ImageryLayerConfigSchema` — the rule is correct.

**Acceptance:**
- An imagery row in a half-edited state surfaces an inline error and
  blocks Save with a clear, row-specific message.
- Save errors at the wizard level use friendly field paths.

**Files:** `ImageryEditor*.tsx`, `ConfigWizardPage.tsx`, plus a small
helper in `apps/admin-app/src/utils/` to translate Zod paths.

---

## Item 2 — Search field validation pass (demoted)

**Status:** Pending · **Wave:** D · **Complexity:** S

**Why demoted:** Mike's per-layer search fields all check out — every
property exists in queryables, prefetches return 200, and the live UI
shows populated dropdowns. The defensive validation is still good UX but
isn't unblocking anything.

**Steps:**
1. In
   `packages/map-ui-lib/src/components/SearchFieldEditor/SearchFieldEditor.tsx`,
   pull `useQueryables(sourceUrl, layer.collection)` and validate the
   bound `property` exists with a compatible type. Render an inline error
   on mismatched fields and disable activation until corrected.
2. In `apps/admin-app/src/pages/ConfigWizardPage.tsx`, add a
   pre-save lint pass that lists any search fields whose property doesn't
   resolve, including a one-click "remove field" remediation.
3. **Polish:** Mike1's `globalSearch.layers[0].properties[1]` for trails
   has `property: "name"` with no `label`, producing a duplicate
   unlabeled autocomplete row. Consider de-duplicating in the editor or
   warning on missing labels.

**Acceptance:**
- Adding a search field for a non-existent property surfaces an inline
  error.
- The wizard cannot save with broken search fields.

**Files:** `SearchFieldEditor.tsx`, `ConfigWizardPage.tsx`.

---

## Cross-cutting follow-ups

These aren't items but apply across multiple worktrees — handle them
opportunistically when the relevant code is open.

- **Pretty Zod paths.** Both items 1 and 2 want a
  `prettifyZodPath(path: (string|number)[]): string` helper. Build it once
  (likely in `apps/admin-app/src/utils/`) and reuse.
- **Stale deployed bundles.** Most items rely on a redeploy to actually
  reach Mike. Track that in `feedback.md` D, not here.
- **Wizard "lint" pass.** A shared
  `lintMapConfig(config, savedSources, queryables)` in the admin app would
  serve items 1, 2, and 10's distinct-values hint. Wave D is a natural
  home for it.

---

## Loop runner notes (for the orchestrator)

- Each wave is a worktree. Branch: `ralph/fb-<n>-<slug>` (or
  `ralph/fb-8-9-legend` for the combined item).
- For each item: run its **Steps**, run `pnpm verify` from the worktree
  root, then merge into `ralph/main` per `CLAUDE.md`.
- After Wave A merges: pull the host bundle (manually, see `feedback.md`
  D) — that's the only way Mike sees the fixes. Until that's automated,
  every "verified locally" claim needs a parallel "deployed: not yet" or
  "deployed: yes after redeploy at <time>" line.
- Items 5 and 10 must NOT run in parallel — both edit
  `apps/admin-app/src/components/MapPreview.tsx` and
  `apps/map-client/src/components/MapContainer.tsx` layer-rendering
  blocks. Land 10 first.
- Items 8 and 9 land in one worktree (`Legend.tsx` + schema overlap is
  too tight to parallelise).
