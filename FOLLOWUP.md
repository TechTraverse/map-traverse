# Follow-up: UI Bugs

Running log of bugs found while exercising the admin app / map client.

---

## 1. Imagery source inspector mis-fetches `style.json` URLs as OGC API ✅

**Reported:** 2026-04-11
**Status:** Fixed 2026-04-11 — `detectTileSourceType` in `packages/map-ui-lib/src/utils/ogcApi.ts` now returns a `'style'` case for URLs ending in `style.json`. Both the client-side inspector (`apps/admin-app/src/utils/inspectSource.ts`) and server-side inspector (`apps/admin-app/server/inspect.ts`) short-circuit with a friendly error pointing the user to the Basemaps tab → "Style URL" mode. `apps/admin-app/server/index.ts` (POST /api/sources/test-connection, `buildBasemapTileUrl`, GET /api/basemaps/:id/tiles) and `apps/admin-app/src/pages/SourcesPage.tsx` (create/update imagery basemap) all handle `'style'` explicitly. Regression tests added in `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts`. `pnpm verify` passes (381/381).
**Area:** `apps/admin-app` — Sources page → Imagery → New Imagery Source → "Test Connection"

### Symptoms

Creating a new Imagery source with a MapLibre style URL, e.g.

```
https://api.maptiler.com/maps/hybrid-v4/style.json
```

and clicking **Test Connection** causes the admin app to issue:

```
GET https://api.maptiler.com/maps/hybrid-v4/style.json/conformance?f=json&key=…
→ 404 Not Found
```

(plus sibling requests to `style.json?f=json` and `style.json/collections?f=json`.)
MapTiler returns 404 because `/conformance` is an OGC API Features path, not a
segment that exists under a style document URL. The UI then surfaces a generic
"HTTP 404 Not Found" and the user cannot save the source.

### Root cause

`detectTileSourceType()` in `packages/map-ui-lib/src/utils/ogcApi.ts:478` only
distinguishes three cases:

```ts
export function detectTileSourceType(url: string): 'tilejson' | 'xyz' | 'ogc-api' {
  if (/\{z\}.*\{x\}.*\{y\}/i.test(url)) return 'xyz';
  if (/tilejson\.json|tiles\.json/i.test(url)) return 'tilejson';
  return 'ogc-api';
}
```

Anything that isn't obviously XYZ or TileJSON is treated as an OGC API landing
page. A MapLibre style URL (`*/style.json`) falls into the default `ogc-api`
branch, so `inspectSourceClientSide()` in
`apps/admin-app/src/utils/inspectSource.ts:301` routes it through
`inspectOgcSourceClientSide()`, which in parallel hits:

- `fetchLanding`  → `${url}?f=json` (`inspectSource.ts:49`)
- `fetchConformance` → `${url}/conformance?f=json` (`inspectSource.ts:68`)
- `fetchCollectionsList` → `${url}/collections?f=json` (`inspectSource.ts:98`)

The server-side equivalent has the same bug in `apps/admin-app/server/inspect.ts:310`
(`inspectSource()` → `inspectOgcSource()`), so the "Proxy requests through
server" toggle would also fail.

This also means the downstream source-type dispatch (vector-tile rendering,
`imagery_source_id` basemap derivation, etc.) via `detectTileSourceType()` in
`apps/admin-app/src/pages/SourcesPage.tsx:395,437` would misclassify style URLs
even if the user manually pushed past Test Connection.

### Relevant files

- `packages/map-ui-lib/src/utils/ogcApi.ts` — `detectTileSourceType` (line 478)
- `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts` — detection tests (line 123)
- `apps/admin-app/src/utils/inspectSource.ts` — client-side inspector
- `apps/admin-app/server/inspect.ts` — server-side inspector (mirrors the client)
- `apps/admin-app/src/pages/SourcesPage.tsx` — where the imagery form calls
  Test Connection and later routes by source type
- `packages/map-ui-lib/src/components/ImageryEditor/ImageryEditor.tsx` — also
  branches on `detectTileSourceType` (lines 67, 148, 156)
- `packages/map-ui-lib/src/components/BasemapEditor/BasemapEditor.tsx` — existing
  "Style URL" basemap path, which is how style.json is currently supported

### Design question: should `style.json` even be an *imagery* source?

A MapLibre style document bundles multiple sources + layers and describes a
whole basemap, not a single raster/vector layer. Today the Basemap tab already
accepts a style URL directly (`BasemapEditor` "Style URL" mode), so using a
style URL as an Imagery source is arguably a category error.

Two reasonable fixes:

1. **Minimal fix — detect and reject.** Teach `detectTileSourceType` about
   `style.json` and have the imagery inspector short-circuit with a clear
   error like *"Style URLs belong in the Basemaps tab — use 'Style URL' mode
   there instead."* This matches the existing data flow and doesn't expand
   the imagery source model.
2. **Expand imagery sources to understand style docs.** Fetch the style JSON,
   enumerate its `sources` (raster/raster-dem/vector), and let the user pick
   one as the imagery layer. Larger change — touches the schema, editor, and
   renderer, and probably isn't what the user wanted when they reached for
   Test Connection.

Recommendation: **do fix #1 now**, leave #2 as a potential future enhancement.

### Fix plan (minimal)

1. **Extend `detectTileSourceType`** in `packages/map-ui-lib/src/utils/ogcApi.ts`
   to return a new `'style'` case when the URL path ends in `style.json`
   (case-insensitive, ignore query string). Keep the current `'tilejson' | 'xyz'
   | 'ogc-api'` cases intact; add `'style'` to the union. Update the JSDoc.
2. **Add unit tests** in
   `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts` alongside the
   existing `describe('detectTileSourceType', …)` block:
   - `style.json` URL with no query → `'style'`
   - `style.json` URL with `?key=…` → `'style'`
   - `style.json` URL with uppercase extension → `'style'`
   - existing cases still pass.
3. **Handle `'style'` in the client-side inspector**
   (`apps/admin-app/src/utils/inspectSource.ts`). In
   `inspectSourceClientSide()`, add a branch before the OGC fallback that
   returns an `InspectionResult` with `errors: ['Style URLs are not valid as
   imagery sources. Use the Basemaps tab → "Style URL" mode.']` and empty
   landing/conformance/collections. Do **not** fire any network requests for
   this case.
4. **Mirror the same branch in the server-side inspector**
   (`apps/admin-app/server/inspect.ts` — `inspectSource()`), so proxied
   requests don't silently fall through to `inspectOgcSource()`.
5. **Audit other call sites** of `detectTileSourceType` for the new `'style'`
   case and decide what each should do:
   - `apps/admin-app/src/pages/SourcesPage.tsx:395,437` — in
     `handleCreateImageryBasemap` / `handleUpdateImageryBasemap`, treat
     `'style'` as a user error ("Imagery source is a style document, cannot
     derive a basemap from it").
   - `packages/map-ui-lib/src/components/ImageryEditor/ImageryEditor.tsx:67,148,156`
     — skip the TileJSON fetch path for `'style'`; the editor should render a
     disabled/error state rather than trying to interpret the URL.
6. **UX touch-up:** when Test Connection is pressed on the Imagery tab with a
   style URL, surface the friendlier message from step 3 inline next to the
   URL field (the page already renders `actionError` / inspection errors —
   just make sure the new error text flows through).
7. **Verify:** `pnpm verify`. Manually reproduce the original flow in
   `pnpm --filter admin-app dev` with the MapTiler URL and confirm (a) no
   network request is made to `…/style.json/conformance`, (b) the form shows
   the explanatory error, and (c) entering the same URL in the Basemaps tab
   → "Style URL" mode still works.

### Out of scope (for this fix)

- Parsing `style.json` to extract individual sources as imagery layers
  (design option #2 above).
- Any change to how basemaps consume style URLs.

---

## 2. `ui.controlIcons` (and `controlPositions`) reject partial maps on save ✅

**Reported:** 2026-04-11
**Status:** Fixed 2026-04-11 — `z.record` → `z.partialRecord` in `packages/map-ui-lib/src/schemas/config.ts` for both fields, with regression tests in `packages/map-ui-lib/src/schemas/__tests__/config.test.ts`. `pnpm verify` passes (377/377).
**Area:** `apps/admin-app` — Config Editor → Review & Save (MapConfig validation)

### Symptoms

Saving an imported configuration whose `ui.controlIcons` only sets a subset of
controls, e.g.

```json
"controlIcons": { "showSearchPanel": "filter" }
```

fails with a wall of "Invalid input" errors — one per missing control key:

```
ui > controlIcons > showLegend         Invalid input
ui > controlIcons > showLayerPanel     Invalid input
ui > controlIcons > showMeasureTool    Invalid input
ui > controlIcons > showSelectionTool  Invalid input
ui > controlIcons > showImageryPanel   Invalid input
ui > controlIcons > showBasemapSwitcher Invalid input
ui > controlIcons > showExportButton   Invalid input
ui > controlIcons > showCompass        Invalid input
ui > controlIcons > showInfoControl    Invalid input
```

The user had only customized the icon for `showSearchPanel`, leaving every
other control on its default — a totally reasonable thing to do — but the
config refuses to validate.

### Root cause

`packages/map-ui-lib/src/schemas/config.ts:602`:

```ts
controlIcons: z.record(z.enum(ORDERABLE_CONTROLS), z.string()).optional(),
```

In **Zod 4** (repo is on `zod@^4.3.6`, see `packages/map-ui-lib/package.json`),
`z.record(keyEnum, valueSchema)` is **strict**: every key in the enum is
*required*. This is a change from Zod 3, where `z.record` was effectively a
partial mapping. So as written, the schema demands an icon override for
*every* orderable control, not just the ones the user wants to customize.
`.optional()` only makes the whole `controlIcons` field skippable — it does
nothing for the inner keys.

`controlPositions` on line 590 has the exact same shape and therefore the
exact same bug, even though no one has tripped over it yet:

```ts
controlPositions: z.record(z.enum(ORDERABLE_CONTROLS), z.enum(CONTROL_CORNERS)).optional(),
```

Also note there's a secondary clue in the error list: the user's config did
**not** mention `showInfoControl`, yet the validator complained about it
missing — confirming the schema is enumerating every enum key, not just the
ones the user wrote.

### Relevant files

- `packages/map-ui-lib/src/schemas/config.ts:590` — `controlPositions`
- `packages/map-ui-lib/src/schemas/config.ts:602` — `controlIcons`
- `packages/map-ui-lib/src/schemas/__tests__/config.test.ts` — schema tests
- `packages/map-ui-lib/package.json` — pins `zod@^4.3.6`
- Wherever `controlIcons` is consumed in the components (search for
  `CONTROL_ICON_MAP` / `controlIcons[...]`) — consumers already treat it as
  optional-per-key, so no runtime changes needed there.

### Fix plan

1. **Switch both fields to `z.partialRecord`** (Zod 4's opt-in partial-mapping
   variant, which is what `z.record` used to be in Zod 3):

   ```ts
   controlPositions: z
     .partialRecord(z.enum(ORDERABLE_CONTROLS), z.enum(CONTROL_CORNERS))
     .optional(),

   controlIcons: z
     .partialRecord(z.enum(ORDERABLE_CONTROLS), z.string())
     .optional(),
   ```

   `.optional()` stays — it still distinguishes "field omitted" from "field
   present but empty object".
2. **Grep for other `z.record(z.enum(...), …)` usages** in
   `packages/map-ui-lib/src/schemas/` and fix any that are intended to be
   partial. Likely candidates: any other record keyed by a known enum.
3. **Add regression tests** in
   `packages/map-ui-lib/src/schemas/__tests__/config.test.ts`:
   - `controlIcons: { showSearchPanel: 'filter' }` → valid.
   - `controlIcons: {}` → valid.
   - `controlIcons` omitted entirely → valid.
   - `controlIcons: { showSearchPanel: 123 }` → invalid (value-type check
     still fires).
   - Equivalent tests for `controlPositions`.
4. **Verify:** `pnpm verify`, then manually re-save the user's original
   config in the admin app and confirm the "Invalid input" wall is gone and
   the config persists.

### Notes

- No data migration needed — existing saved configs either set every key
  (still valid under partial record) or set none. The partial record is a
  strict superset of the current accepted shape.
- The default-icon fallback is already handled at render time via
  `CONTROL_ICON_MAP`, so relaxing the schema won't produce blank controls.

---

## 3. Admin app map preview ignores `controlLayout: 'side-menu' | 'auto'` ✅

**Reported:** 2026-04-11
**Status:** Fixed 2026-04-11 — `apps/admin-app/src/components/MapPreview.tsx` now derives `effectiveLayout` from `uiConfig.controlLayout` (with `auto` → `side-menu` below 768px) and renders a `SideMenuPanel` + `SideMenuToggle` branch that mirrors `apps/map-client/src/components/MapOverlay.tsx`. In side-menu mode, Legend goes top-left while Search/Layers/Measure/Select/Imagery/Basemap/Export collapse into the hamburger panel; Compass + InfoControl stay in the top-right stack. `pnpm verify` passes (381/381). The "can't exit side menu in map-client" sub-report (Part 6 of the fix plan) remains open and will be retested separately. Long-term extraction of overlay chrome into `map-ui-lib` is still recommended but out of scope here.
**Area:** `apps/admin-app` — Config Wizard → UI step → map preview (and the
standalone Config Preview page)

### Symptoms

Switching `ui.controlLayout` from `individual` → `side-menu` (or `auto`) in
the admin wizard has no visible effect on the map preview: the controls keep
rendering as the individual top-right stack of `CollapsibleControl`s. No
hamburger toggle appears, no `SideMenuPanel` slides in.

Screenshot confirms: a narrow-viewport preview still shows Search / Legend /
Layers / Measure / Select / Basemap / Export / Compass as individual buttons
stacked on the right edge.

The user also reports that in the real map client (`apps/map-client`) the
side menu *does* render — matching the `MapOverlay` implementation — but they
"couldn't exit" it. Needs a manual retry to pin down whether this is the
panel's Close button / backdrop / Escape handler, the Search → Expand modal
overlay, or something else. Logged here for follow-up but not yet diagnosed.

### Root cause (admin preview)

`apps/admin-app/src/components/MapPreview.tsx` is ~1316 lines that largely
duplicate `apps/map-client/src/components/MapOverlay.tsx` — but the
duplication predates the `controlLayout` feature. `MapPreview.tsx` contains
**zero** references to `controlLayout`, `effectiveLayout`, `SideMenuPanel`,
`SideMenuToggle`, or `side-menu`. It only implements the `individual`
branch: `resolveControlOrder(uiConfig).map(...)` wrapped in
`CollapsibleControl`s at `MapPreview.tsx:1225`.

`MapOverlay.tsx` has the correct implementation:

- `effectiveLayout` derivation: `MapOverlay.tsx:283-288`
- `side-menu` render branch (builds `SideMenuPanelItem[]`, renders
  `SideMenuToggle` + `SideMenuPanel`): `MapOverlay.tsx:483-517`
- `individual` render branch: falls through from `:517`.

The admin preview never got the same treatment, so the preview and the real
client diverge whenever `controlLayout !== 'individual'`. This is the
classic "two overlay implementations drifting" problem — and part of why
`MapPreview.tsx` is 1316 lines of hand-maintained overlay logic.

### Relevant files

- `apps/admin-app/src/components/MapPreview.tsx` — admin preview overlay (bug
  is here)
- `apps/map-client/src/components/MapOverlay.tsx` — canonical implementation
  (lines 271–517 are the reference to port)
- `packages/map-ui-lib/src/components/SideMenuPanel/SideMenuPanel.tsx` —
  `SideMenuPanel` + `SideMenuToggle`
- `packages/map-ui-lib/src/schemas/config.ts` — `controlLayout` enum
  (`individual` | `side-menu` | `auto`), default `individual`

### Fix plan

1. **Port the `effectiveLayout` derivation into `MapPreview.tsx`** — copy
   the narrow-viewport media query + `effectiveLayout` calculation from
   `MapOverlay.tsx:271-288`. The preview iframe may have its own width,
   so consider reading the preview container's width via a `ResizeObserver`
   instead of `window.matchMedia` (the map preview is usually rendered
   inside a panel that can be narrower than the viewport). Pick whichever
   matches the existing preview-sizing conventions in `MapPreview.tsx`.
2. **Add the `side-menu` render branch in `MapPreview.tsx`** that:
   - Builds `SideMenuPanelItem[]` from the same inner-content variables the
     individual branch already computes (`searchInner`, `layerInner`, etc.),
     mirroring `MapOverlay.tsx:483-492`.
   - Renders `SideMenuToggle` in the top-right stack and `SideMenuPanel`
     below the rest of the overlay, with local `sideMenuOpen` state.
3. **Make sure non-menu controls still render correctly** in side-menu mode
   — specifically Legend (top-left), Compass (top-right stack), and the Info
   control, per `MapOverlay.tsx:494-509`.
4. **Add a Storybook story / manual-test note** that toggles between
   `individual`, `side-menu`, and `auto` against a narrow wrapper so the
   preview/real-client parity is verifiable without running the admin app.
5. **Follow-up (out of scope for the bug fix, but worth a ticket):** extract
   the overlay layout logic from `MapOverlay.tsx` into a shared component /
   hook in `packages/map-ui-lib` so the admin preview can consume it
   directly instead of maintaining a 1300-line parallel implementation. This
   is the real root cause of this class of bug and will prevent the next
   drift. Needs its own scoping pass — the map-client depends on `MapRef` /
   `maplibregl` and the lib must stay framework-agnostic per
   `CLAUDE.md`, so the extraction likely produces (a) a framework-agnostic
   "overlay chrome" component tree in the lib that takes the inner panels
   as props and (b) app-side glue that wires the MapLibre imperative bits.
6. **Retry the "can't exit the side menu in map-client" report.** Likely
   paths to check first: (a) does `SideMenuPanel` close on X click /
   backdrop click / Escape (it does in code — confirm at runtime); (b) is
   the Search → Expand modal shell rendered on top of the side menu
   (`SearchPanel.tsx:123,293` wraps content in `ModalShell`), trapping the
   user? If the repro is the modal, the fix is probably to either suppress
   the Expand button inside the side-menu layout or ensure the modal's
   close affordance is reachable.
7. **Verify:** `pnpm verify`, then run `pnpm --filter admin-app dev`,
   import the user's config, flip `controlLayout` to `side-menu` and `auto`
   (narrow the window for `auto`), and confirm the hamburger toggle +
   slide-in panel behave exactly like the map client.

---

## 4. `SearchPanel` Expand button is at the top; user wants it at the bottom ✅

**Status (2026-04-11):** Fixed. `SearchPanel.tsx` splits `header` into `titleNode` (top, now only rendered when `!hideTitle` or the collapse X is needed for the modal) and `expandFooter` (a full-width, muted button rendered at the bottom of `panelBody` and of the empty-state branch). The expand affordance now sits below the last layer's inputs. No React component test harness exists in `packages/map-ui-lib` — skipped the unit test rather than introducing `@testing-library/react` for a one-shot DOM-order check. 381/381 tests pass.

---

**Reported:** 2026-04-11
**Area:** `packages/map-ui-lib` — `SearchPanel` when `expandable` is true
(visible in both the map-client side menu and the individual layout)

### Symptoms

When `SearchPanel` is rendered with `expandable` / `hideTitle`, the "Expand"
button (which opens the full All-Filters builder modal) is rendered in the
panel's header, above all the per-layer search fields. The user wants it at
the **bottom** of the panel, below the last search field, so the primary
per-field inputs are the first thing the user sees.

Screenshot 2 shows the bug clearly: inside the side menu's Search section,
there's an empty header row with just an `Expand` button floating to the
right, above "Rivers / Search by name / Mississippi / Cities / Filter
cities by population / Countries / Continent". The header row adds visual
noise *and* pushes the real controls down.

### Root cause

`packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx:81-112`
builds a `header` node containing the (optional) title plus the
`Expand` / collapse button, and then renders `{header}` at the top of
`panelBody` at `SearchPanel.tsx:126-128`:

```tsx
const panelBody = (
  <div className="mapui:flex mapui:flex-col mapui:gap-3 ...">
    {header}
    {searchableLayers.map(...)}
```

When `hideTitle` is true but `expandable` is also true, the header survives
solely to host the Expand button — which is exactly the misplaced button in
the screenshot.

### Fix plan

1. **Separate the title from the Expand affordance** in
   `SearchPanel.tsx`. The current `header` variable conflates two
   responsibilities. Split it into:
   - `titleNode` — rendered at the top only when `!hideTitle` (and contains
     the collapse X when `expanded`, since that still belongs up top for the
     modal view).
   - `expandFooter` — a full-width "Expand" button rendered at the **bottom**
     of the panel, after the `searchableLayers.map(...)` block, when
     `expandable && !expanded`.
2. **Styling:** make the footer Expand button a full-width, muted button
   (e.g. `mapui:w-full mapui:border-t mapui:border-gray-200 mapui:pt-2
   mapui:text-center mapui:text-xs mapui:text-gray-600 hover:mapui:text-blue-600`).
   It should feel like an "open the advanced builder" affordance, not a
   peer of the per-field inputs. Keep the existing `title` / `aria-label`
   for accessibility.
3. **Expanded (modal) view:** when `expanded` is true, the current top-right
   collapse X stays where it is — that one *does* belong in the header of
   the modal. Only the non-expanded panel body gets the footer treatment.
4. **Empty-state branch:** the early return at `SearchPanel.tsx:114-124`
   ("No searchable layers configured.") should also render the Expand
   footer if `expandable && !expanded`, so an empty panel still lets the
   user open the All-Filters builder. Confirm this matches desired UX — or
   omit it if the Expand button makes no sense with zero layers.
5. **Update stories + tests:**
   - `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.stories.tsx`
     — the "Expandable search panel" story currently shows the old layout;
     re-check snapshots.
   - Add a test that asserts the Expand button appears *after* the layer
     fields in DOM order when `hideTitle && expandable && !expanded`.
6. **Verify:** `pnpm verify`, then eyeball the story in Storybook and the
   map-client side menu to confirm the button sits below the last layer's
   inputs.

### Notes / UX consideration

Arguably the Expand → full-screen builder modal is redundant *inside* the
side menu (the side menu already provides the vertical space and the modal
stacks on top of it — possibly related to issue #3's "can't exit"
complaint). A cleaner fix might be to hide the Expand button entirely when
`SearchPanel` is rendered inside `SideMenuPanel`, or to route the expanded
state inline instead of via `ModalShell`. Worth a design pass once the
immediate "move to the bottom" fix is in.

---

## 5. Exported PDF is left-shifted; title pinned to left margin ✅

**Status (2026-04-11):** Fixed the three exporter bugs in `apps/map-client/src/utils/exportPdf.ts`:
1. The legend is now captured *before* the layout math runs, and `legendColumnWidth` is derived from the real `HTMLCanvasElement` (null / zero-size → treated as "no legend"). A `console.warn` replaces the silent `try { } catch {}`. No more reserved-but-empty 172pt column.
2. When no legend is captured, the map is centered on the full page (`drawX = (pageWidth - drawW) / 2`). When a legend *is* present, the map stays centered in the reduced box and the legend takes the right column.
3. The title is drawn with `{ align: 'center' }` at `drawX + drawW / 2`, so it sits directly above the map image instead of pinned to the left margin.

Dialog default tightening (wiring `hasLegend` through `PdfExportDialog`) and adding an exportPdf test harness were listed in the plan but deferred — they're workflow/testing scaffolding, not part of the left-shift fix. 381/381 tests pass.

---

**Reported:** 2026-04-11
**Area:** `apps/map-client` — Export as PDF (`exportPdf.ts`)

### Symptoms

Exporting the map to PDF via the "Export as PDF" button produces a landscape
letter PDF where:

- The title ("United States Demo") is pinned to the top-left margin.
- The map image occupies roughly the left ~70% of the printable width, with
  a large empty strip on the right side of the page.
- There is no legend rendered in that empty strip, even though the config
  has a legend and the dialog's "Include legend" checkbox is on by default.

So the page looks unbalanced: content is shoved left, blank space on the
right.

### Root cause

Three overlapping bugs in `apps/map-client/src/utils/exportPdf.ts`:

1. **Legend column is reserved unconditionally whenever the dialog box is
   checked, even if the legend can't be captured.** `PdfExportDialog.tsx:34`
   defaults `includeLegend` to `true`. The exporter at `exportPdf.ts:51`
   then computes
   `legendWidth = options.includeLegend && legendElement ? 160 : 0`,
   which reserves 160pt + 12pt gutter = **172pt of page width** for the
   legend column, shrinking `mapBoxW` on line 54. The actual legend render
   at `exportPdf.ts:70-83` is wrapped in a `try { ... } catch {}` that
   silently swallows failures. If `html2canvas` returns a degenerate /
   empty capture or the element is off-screen, the legend fails to render
   but the 172pt remains reserved, producing exactly the blank right strip
   in the screenshot.
2. **Map is centered within the reduced box, not the page.** Even when the
   legend renders successfully, `exportPdf.ts:65` does
   `drawX = mapBoxX + (mapBoxW - drawW) / 2`, with `mapBoxX = margin`. The
   map's center sits at `margin + mapBoxW/2`, which is left of the page
   centerline. That's intentional *when* a legend is drawn to the right —
   but there's no fallback when the legend is missing.
3. **Title always at the left margin.** `exportPdf.ts:48` does
   `pdf.text(options.title, margin, margin + 6)`. The title is always
   left-justified, regardless of where the map image ends up. So even if
   fixes 1 and 2 centered the map, the title would still visually detach
   from it.

### Relevant files

- `apps/map-client/src/utils/exportPdf.ts` — the exporter (all three bugs
  live here)
- `packages/map-ui-lib/src/components/PdfExportDialog/PdfExportDialog.tsx`
  — dialog defaults (`includeLegend`, `includeScaleBar`,
  `includeNorthArrow` all default to `true`)
- `apps/map-client/src/components/MapOverlay.tsx:185-190` — wires
  `legendContainerRef.current` + `scaleBarContainerRef.current` into the
  exporter
- `apps/map-client/src/components/MapOverlay.tsx:506,521` — two places the
  legend container ref is attached (side-menu layout vs individual)
- No PDF export tests exist today — this is a regression-safety hole.

### Fix plan

1. **Capture before you reserve.** Refactor `exportMapAsPdf` to capture the
   legend element *first*, then compute the layout from the real capture
   dimensions. If the capture yields no image (null, empty, zero-size, or
   throws), treat `legendWidth = 0` so the map gets the full
   `pageWidth - 2*margin`. Concretely:
   - Move the `captureElement(legendElement)` call above the map layout
     math.
   - Replace the silent `try {} catch {}` with a result that sets
     `legendImage: HTMLCanvasElement | null` and logs on failure.
   - Derive `legendWidth` from `legendImage !== null` rather than from
     `includeLegend && legendElement`.
2. **Center the map on the page, not in the reduced box.** Change `drawX`
   so that when there's no legend, the map is centered on the full page:
   `drawX = (pageWidth - drawW) / 2`. When there *is* a legend, keep the
   current behavior (map centered in `mapBoxW`, legend in the reserved
   column on the right).
3. **Keep the title with the map.** Change the title to be centered above
   the map image:

   ```ts
   const titleY = margin + 6;
   pdf.text(options.title, drawX + drawW / 2, titleY, { align: 'center' });
   ```

   (jsPDF supports `align: 'center'` on `pdf.text`.) If the title overflows
   the map width, fall back to left-aligning at `drawX`.
4. **Tighten dialog defaults.** In `PdfExportDialog.tsx:34`, default
   `includeLegend` to `true` only when a legend exists in the config (wire
   through a prop like `hasLegend: boolean` from the caller). Same
   treatment for `includeScaleBar` — see issue #6. This prevents the
   dialog from asking for features the map doesn't actually have.
5. **Add tests.** Create
   `apps/map-client/src/utils/__tests__/exportPdf.test.ts` that mocks
   `html2canvas` + `jsPDF` and asserts:
   - No legend → map is centered on the page
     (`drawX ≈ (pageWidth - drawW) / 2`).
   - Legend capture succeeds → map centered in reduced box, legend in
     right column.
   - Legend capture returns null → exporter behaves as "no legend"
     (full-width map), not "legend reserved but empty".
   - Title is centered above the map image.
6. **Verify:** `pnpm verify`, then run `pnpm dev:app`, reproduce the
   original export with the user's config (legend visible and hidden), and
   visually confirm the map is centered and the title sits above it.

### Notes

- Long-term, consider rendering the PDF layout from a declarative spec
  instead of imperative jsPDF offsets — the current file interleaves
  layout math with draw calls, which is how these off-by-172pt bugs sneak
  in.
- The same "fit-then-position" pattern is duplicated for the scale bar
  (line 93) and compass (lines 105-112) overlays; a shared helper would
  reduce the bug surface.

---

## 6. Scale bar missing from PDF; overlaps attribution on live map ✅

**Status (2026-04-11):** Fixed both sub-issues.
- **Live map overlap:** `MapOverlay.tsx:706` raised the scale bar from `bottom-2 left-2` (8px) to `bottom-6 left-2` (24px), so it sits above the MapLibre attribution line. Left attribution position unchanged (bottom-right already has `InfoPanel`/controls in some layouts, so moving attribution there risked a different collision).
- **PDF scale bar:** The old `html2canvas`-based capture branch in `exportPdf.ts` is gone. The exporter now draws a native bar via `jsPDF.rect/line/text`, using `computeMetricScale(virtualZoom, lat, maxBarPt)` from `@ogc-maps/storybook-components`. The virtual zoom = `zoom + log2(mapCanvas.width / drawW)` so the helper's "meters-per-pixel" math reports `widthPx` in PDF points for the exported image. Result: `includeScaleBar` always works, independent of `uiConfig.showScaleBar` or a DOM ref.
- **Dead wiring removed:** `scaleBarContainerRef` and the `scaleBarElement` parameter are deleted from `MapOverlay.tsx` and `exportPdf.ts`'s `ExportPdfInput` interface.

Lib helper extraction (`computeScaleBar`) was not needed — `computeMetricScale` / `computeImperialScale` / `metersPerPixel` are already exported from the package root. 381/381 tests pass. PDF exporter tests deferred (no existing harness for that file; same reasoning as issue #5).

---

**Reported:** 2026-04-11
**Area:** `apps/map-client` — live scale bar overlay and PDF export

### Symptoms

1. **Live map:** with `ui.showScaleBar` enabled, the scale bar renders in
   the bottom-left of the map, but the MapLibre `AttributionControl`
   (bottom-left, `© CARTO, © OpenStreetMap contributors`) sits in the
   exact same corner and overlaps the scale bar's label. "1000 km" is
   partly unreadable.
2. **Exported PDF:** the dialog has a "Include scale bar" checkbox,
   defaulted on, but checking it produces a PDF with no scale bar — even
   when the live map is showing one.

### Root cause

**Problem 1 — overlap:**

- `apps/map-client/src/components/MapContainer.tsx:485` —
  `<AttributionControl position="bottom-left" />` (from
  `react-map-gl/maplibre`).
- `apps/map-client/src/components/MapOverlay.tsx:704-709` — scale bar is
  rendered at `absolute bottom-2 left-2` (= 8px from both edges) when
  `uiConfig.showScaleBar` is true.

Both components are anchored in the same 8px-offset position, with no
vertical separation. The scale bar sits visually on top of the attribution
text.

**Problem 2 — PDF scale bar missing:**

- `exportPdf.ts:86-97` captures the scale bar by calling
  `captureElement(scaleBarElement)`, where `scaleBarElement` is
  `scaleBarContainerRef.current`.
- `MapOverlay.tsx:704-709` only attaches the ref *inside* the
  `uiConfig.showScaleBar && ...` conditional. So when the user's config
  has `showScaleBar = false` (the Zod default —
  `packages/map-ui-lib/src/schemas/config.ts:584`), the DOM node never
  mounts, the ref stays `null`, and the exporter's
  `if (... && scaleBarElement)` guard silently skips the capture. The
  dialog checkbox is a no-op.
- Even when the scale bar *is* visible on the live map, capturing a
  separate DOM node with `html2canvas` and compositing it on top of the
  map image is indirect and fragile (font metrics, devicePixelRatio,
  transparent background, etc.). The right abstraction is to **render a
  fresh scale bar in the PDF** from the map's current zoom + center
  latitude, using the same math `ScaleBarControl` already does.

### Relevant files

- `apps/map-client/src/components/MapContainer.tsx:485` — attribution
  control position
- `apps/map-client/src/components/MapOverlay.tsx:704-709` — live scale bar
  render + ref wiring
- `apps/map-client/src/utils/exportPdf.ts:86-97` — PDF scale bar capture
  (the silent-skip branch)
- `packages/map-ui-lib/src/components/ScaleBarControl/ScaleBarControl.tsx`
  — framework-agnostic scale bar component, including the width/label
  math (reusable from the exporter)
- `packages/map-ui-lib/src/components/ScaleBarControl/__tests__/ScaleBarControl.test.ts`
  — existing math tests to model PDF tests after
- `packages/map-ui-lib/src/schemas/config.ts:584` —
  `showScaleBar: z.boolean().default(false)`
- `packages/map-ui-lib/src/components/PdfExportDialog/PdfExportDialog.tsx:35`
  — dialog default for `includeScaleBar`

### Fix plan

**Part A — live map overlap**

1. **Move the attribution out of the scale bar's corner.** Cheapest fix:
   change `MapContainer.tsx:485` to
   `<AttributionControl position="bottom-right" compact={false} />` so the
   bottom-left belongs to the scale bar.
2. **Alternatively**, if product wants attribution to stay bottom-left for
   branding reasons, stack them vertically: render the scale bar at
   `bottom-7 left-2` (or via a flex column wrapper) so it sits above the
   attribution line. Pick one and be consistent.
3. **Coordinate display.** The coordinate display at
   `MapOverlay.tsx:712-720` uses `bottom-0 left-1/2 -translate-x-1/2`, so
   it's bottom-center and won't collide with either option. No change
   needed.

**Part B — PDF scale bar**

4. **Extract the scale bar math into a pure helper in the library.** In
   `packages/map-ui-lib/src/components/ScaleBarControl/ScaleBarControl.tsx`,
   factor out the zoom+latitude → `{ widthPx, label }` computation into a
   named export like `computeScaleBar({ zoom, latitude, maxWidthPx })`.
   The React component stays a thin wrapper. This keeps the lib
   framework-agnostic (per CLAUDE.md's "no MapLibre in lib" rule) and
   gives the PDF exporter a reusable primitive.
5. **Render the scale bar directly in the PDF.** In
   `apps/map-client/src/utils/exportPdf.ts`, replace the DOM-capture
   branch (lines 86-97) with a primitive jsPDF draw:
   - Read `map.getZoom()` and `map.getCenter().lat` — already in scope.
   - Call `computeScaleBar` to get `widthPt` + `label`.
   - Draw a rectangle (`pdf.rect(...)`) + text (`pdf.text(...)`) at
     `drawX + 8, drawY + drawH - 20` or similar.
   - Remove `scaleBarElement` from the `ExportPdfInput` interface; it's
     no longer needed.
6. **Unhook `scaleBarContainerRef`** in `MapOverlay.tsx` (delete the ref +
   its wiring on lines 171 and 706) since the exporter no longer needs
   it. Keeps state minimal.
7. **Dialog default.** In `PdfExportDialog.tsx:35`, keep `includeScaleBar`
   defaulted `true` and remove any dependency on the live map's
   `ui.showScaleBar`. After step 5 the exporter can always draw one, so a
   user who wants a scale bar on their printed PDF should not have to
   enable it on-screen first.
8. **Tests:**
   - Extend the math tests in
     `packages/map-ui-lib/src/components/ScaleBarControl/__tests__/ScaleBarControl.test.ts`
     to cover `computeScaleBar` directly.
   - Add an `exportPdf.test.ts` case (see issue #5 step 5) that asserts
     the scale bar draw calls fire with a label derived from the mocked
     zoom/latitude.
9. **Verify:**
   - `pnpm verify`.
   - Run `pnpm dev:app`, confirm attribution and scale bar no longer
     overlap in the bottom-left (or bottom-right, depending on the choice
     in step 1/2).
   - Export a PDF with the user's config at zoom 2 and confirm a readable
     scale bar appears in the lower-left of the map image with the right
     distance label.

### Notes

- Issues #5 and #6 share a root cause flavor: the PDF exporter trusts
  external DOM nodes it can't guarantee exist or capture cleanly. Both
  fixes move toward "compute then draw" instead of "capture then
  composite", which is also easier to test.
- The "can't exit the side menu in map-client" report from issue #3 may
  be related to z-index stacking in the bottom-left corner too; worth
  re-testing once this issue is fixed.

---

## 7. Expanded "All Filters" builder is too complex — replace with a simple layer/property/value panel ✅

**Status (2026-04-11):** Replaced the CQL2-flavored row editor with a flat layer → property → value panel.

- **New component** `packages/map-ui-lib/src/components/PropertyFilterPanel/PropertyFilterPanel.tsx`: controlled, takes `filters: PropertyFilter[]` + `onFiltersChange`, groups rows visually by layer, implicit equality, soft cap at 20 filters per layer. Exported from `components/index.ts`.
- **New flat rule type** `PropertyFilter = { id, layerId, property, value }` in `packages/map-ui-lib/src/utils/propertyFilters.ts`, plus `propertyFiltersToCql2(filters, layerId)` which compiles to an `and(...eq(...))` via the existing `cql2.ts` primitives. Exported from `utils/index.ts` (and therefore `@ogc-maps/storybook-components/utils`).
- **SearchPanel rewired**: `customRules`/`onCustomRulesChange` props replaced with `propertyFilters`/`onPropertyFiltersChange`. The expanded modal now renders `<PropertyFilterPanel />` instead of `<AllFiltersBuilder />`.
- **MapOverlay rewired**: local state swapped to `propertyFilters: PropertyFilter[]`. `computeMergedCql2` now calls `propertyFiltersToCql2(filters, layerId)` and `handlePropertyFiltersChange` recomputes merged CQL2 for every layer that's touched (including layers whose last rule was just removed), so clearing a filter actually drops the layer's CQL2 filter.
- **Left behind**: `AllFiltersBuilder` and the full `Cql2FilterEditor` suite remain intact for any admin/debug caller that wants the power-user surface — per the plan, no churn there.
- **Tests**: added `utils/__tests__/propertyFilters.test.ts` with 6 cases covering null-on-empty, null-on-draft rows, single-row eq, multi-row AND, and cross-layer isolation. Updated `SearchPanel.stories.tsx` to use the new prop shape. Storybook/UX storyfile for `PropertyFilterPanel` deferred — stories exist for `SearchPanel`'s expanded state already and exercise the new panel end-to-end.

387/387 tests pass.

---

**Reported:** 2026-04-11
**Area:** `packages/map-ui-lib` — `SearchPanel` expanded modal ("All Filters"
section)

### Symptoms

When the user clicks **Expand** on the SearchPanel, the modal shows an
"All Filters" builder with one section per layer. Each row exposes:

- A **Property** dropdown
- An **operator** dropdown (`equals`, `not equals`, `greater than`, …)
- A **"V"** parameterizable toggle (static vs dynamic value)
- A **Value** input
- A remove `×`

That's more machinery than the feature actually needs. The user's mental
model is: *"pick a layer, pick a property on that layer, type a value,
add another row."* They explicitly want:

- Just layer → property → value (implicitly `=`)
- The ability to add "any number (within reason)" of such rows
- Nothing else — no operators, no parameterizable values, no nested
  groups, no CQL2 surface area

Today the row editor is `FilterRuleEditor` from `Cql2FilterEditor/`, which
is the power-user CQL2 row editor. Wrong tool for this job.

### Root cause

`packages/map-ui-lib/src/components/SearchPanel/AllFiltersBuilder.tsx` (111
lines) imports the row editor directly from the full CQL2 editor suite:

```ts
import { FilterRuleEditor } from '../Cql2FilterEditor/FilterRuleEditor';
```

Each row is a `FilterRule` with shape
`{ id, property, operator, value: { kind: 'static' | ..., value } }`
(see `createEmptyRule` at `AllFiltersBuilder.tsx:12-19`). That's the CQL2
rule type — it carries operators, parameterizable values, and the rest of
the CQL2 vocabulary. Everything downstream (`FilterRuleEditor`,
`FilterValueInput`, `ParameterizableField`, `operatorOptions.ts`) is
designed for that vocabulary, so even a "simple" row inherits all of it.

Wiring into `SearchPanel`:

- `SearchPanel.tsx:79` —
  `showAllFiltersBuilder = expanded && customRules !== undefined && onCustomRulesChange !== undefined`
- `SearchPanel.tsx:280` — renders `<AllFiltersBuilder … />` inside the
  expanded modal body
- `apps/map-client/src/components/MapOverlay.tsx:292` —
  `customFilterRules` Zustand-adjacent state (`Record<string, FilterRule[]>`)
- `MapOverlay.tsx:295-306` — `computeMergedCql2` combines the
  structured-search CQL2 (`fromStructuredFilters`) with the custom rules
  (`fromFilterRuleGroup`) via `and(...)`
- `MapOverlay.tsx:321-327` — `handleCustomRulesChange` updates the state
  and pushes merged CQL2 to the layer

So the whole pipeline from SearchPanel modal → layer's `activeCql2Filters`
is routed through the CQL2 `FilterRule`/`FilterRuleGroup` types.

### Relevant files

- `packages/map-ui-lib/src/components/SearchPanel/AllFiltersBuilder.tsx`
  — today's "All Filters" section (to be replaced/superseded)
- `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx:18-28,79,280`
  — where the expanded view is assembled
- `packages/map-ui-lib/src/components/Cql2FilterEditor/FilterRuleEditor.tsx`
  — the 111-line row editor with operator + parameterizable toggle
  (keep — still valid for other callers / admin surfaces)
- `packages/map-ui-lib/src/components/Cql2FilterEditor/` — the rest of the
  CQL2 editor suite (`FilterRuleGroupEditor`, `FilterValueInput`,
  `ParameterizableField`, `operatorOptions.ts`, etc.) — unchanged
- `packages/map-ui-lib/src/utils/cql2.ts` — has the primitives the new
  panel should compile down to: `eq`, `and`, `CQL2Expression`
- `apps/map-client/src/components/MapOverlay.tsx:292,295-306,321-327,387-388`
  — the map-client wiring to update when the new shape ships
- `apps/map-client/src/hooks/useLayerQueryables.ts` (via
  `layerQueryables` at `MapOverlay.tsx:293`) — source of per-layer
  property lists for the dropdown

### Fix plan

1. **Add a new component `PropertyFilterPanel`** (name TBD — could also
   be `LayerPropertyFilterPanel` or `SimpleFilterPanel`) under
   `packages/map-ui-lib/src/components/PropertyFilterPanel/`. Structure:
   - `PropertyFilterPanel.tsx` — the component
   - `PropertyFilterPanel.stories.tsx` — Storybook stories (empty state,
     one rule, many rules, cross-layer, value edit)
   - `__tests__/PropertyFilterPanel.test.tsx` — behavior tests
   - `index.ts` — re-exports
2. **Shape of the new rule** — a flat, CQL2-free type:

   ```ts
   export interface PropertyFilter {
     id: string;
     layerId: string;
     property: string;
     value: string; // free-text; panel coerces per property type if known
   }
   ```

   No operator, no `kind: 'static'` envelope, no group structure. The
   panel keeps a flat `PropertyFilter[]` (grouped visually by layer, but
   not by type). Operator is implicitly `=` and compiled at the boundary.
3. **Component API:**

   ```ts
   export interface PropertyFilterPanelProps {
     layers: LayerConfig[];
     availableProperties?: Record<string, AvailableProperty[]>;
     filters: PropertyFilter[];
     onFiltersChange: (filters: PropertyFilter[]) => void;
     /** Soft cap — panel stops showing "Add filter" beyond this. Defaults to 20. */
     maxFilters?: number;
   }
   ```

   Controlled, like every other SearchPanel sub-component (per
   `project-conventions`).
4. **Rendering:**
   - Group by layer visually, but the underlying state is one flat array.
   - Each row: layer label (read-only, since rows are grouped under their
     layer section), property dropdown (options from
     `availableProperties[layer.id]`, falling back to "no properties
     available"), value input (text for now), remove `×`.
   - Per-layer "+ Add filter" button at the bottom of each section.
   - Soft cap via `maxFilters` (default 20) — once hit, hide the add
     button and show a muted "Up to N filters" note.
   - Empty state per-layer: "No filters added for this layer." (mirrors
     the current UX wording at `AllFiltersBuilder.tsx`).
5. **Compile to CQL2 at the call site, not inside the panel.** The panel
   stays pure (CQL2-free, per the "no MapLibre in lib" spirit — keeps the
   lib tree light). Add a small exporter alongside `cql2.ts`, e.g.
   `utils/propertyFilters.ts`:

   ```ts
   import { eq, and } from './cql2';
   export function toCql2(
     filters: PropertyFilter[],
     layerId: string
   ): CQL2Expression | null {
     const perLayer = filters.filter(f => f.layerId === layerId && f.property && f.value);
     if (perLayer.length === 0) return null;
     return perLayer.map(f => eq(f.property, f.value)).reduce((acc, cur) => and(acc, cur))!;
   }
   ```

   Re-use existing `eq` / `and` from
   `packages/map-ui-lib/src/utils/cql2.ts` — do not write a parallel
   combinator.
6. **Replace `AllFiltersBuilder` inside `SearchPanel`.** In
   `SearchPanel.tsx`:
   - Replace `customRules` / `onCustomRulesChange` props with
     `propertyFilters` / `onPropertyFiltersChange` (plus a
     deprecated-but-accepted fallback of the old props, if we need a
     migration window — otherwise just swap them and update callers).
   - Replace the `<AllFiltersBuilder … />` render at `SearchPanel.tsx:280`
     with `<PropertyFilterPanel … />`.
   - Keep the Expand/collapse modal behavior intact — the outer layout
     doesn't change.
7. **Update `MapOverlay.tsx` to the new shape:**
   - Swap `customFilterRules: Record<string, FilterRule[]>` for
     `propertyFilters: PropertyFilter[]` (flat, no per-layer map).
   - `computeMergedCql2(layerId, structured, propertyFilters)` calls
     `toCql2(propertyFilters, layerId)` instead of
     `fromFilterRuleGroup(...)`.
   - `handleCustomRulesChange` becomes `handlePropertyFiltersChange`.
   - Remove the `FilterRule`/`FilterRuleGroup` imports that are no longer
     needed here.
8. **Leave `AllFiltersBuilder` and the `Cql2FilterEditor` suite in
   place.** They still make sense for any admin/debug surface that wants
   the full CQL2 editor. Just stop routing the user-facing SearchPanel
   through them. If no caller remains, mark `AllFiltersBuilder` with a
   deprecation note and delete in a follow-up — don't churn right now.
9. **Stories / tests:**
   - `PropertyFilterPanel.stories.tsx`: empty, one filter, many filters,
     cap reached, layer with no queryables, multi-layer.
   - `PropertyFilterPanel.test.tsx`: add/remove a filter, edit property,
     edit value, soft cap, empty-state, `toCql2` round-trip.
   - Update `SearchPanel.stories.tsx` ("Expandable search panel" story at
     line 613/627) to use the new prop shape.
10. **Verify:** `pnpm verify`, open Storybook
    (`pnpm storybook`), exercise the new panel, then `pnpm dev:app` and
    confirm the expanded SearchPanel modal now shows a layer → property
    → value UI and applying filters actually narrows vector-tile layers
    the same way the old builder did.

### Notes / open questions

- **Value typing.** For now the value is a free-text input coerced to
  string. Future enhancement: look at `availableProperties[layerId]` for
  the property's type hint and render a number / date / enum picker when
  applicable. Scope creep — do it in a follow-up.
- **Implicit `=` only.** The user's ask is an equality filter. If it
  turns out they do want `!=` / ranges, they can add one more field to
  the `PropertyFilter` type later without changing the panel's shape
  significantly. Keep the door open, don't build it yet.
- **Soft cap rationale.** User said "any number (within reason)".
  20 is a guess — pick whatever the layer's queryable count suggests, or
  surface as a prop for the caller to tune.
- **Related to issues #3/#4.** The Expand-modal stack is part of the
  same SearchPanel expanded flow that issue #4 is reworking (moving the
  Expand button to the bottom) and issue #3 is suspicious of (the "can't
  exit side menu" report). Ship #7 after #4 so the new panel renders
  under the fixed Expand affordance, and re-test the side-menu case
  afterwards.
