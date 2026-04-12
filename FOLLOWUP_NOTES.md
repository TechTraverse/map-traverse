# Follow-up Review Notes

Reviewer notes on the fixes logged in `FOLLOWUP.md`. Each section records what
was verified, what's still broken, and any small nits surfaced during review.

---

## 1. Imagery source inspector mis-fetches `style.json` URLs as OGC API

**Reviewed:** 2026-04-11

### Verified ✅
- `detectTileSourceType()` in `packages/map-ui-lib/src/utils/ogcApi.ts:483-488`
  returns `'style'` for `style.json` URLs. The regex
  `/\/style\.json(?:$|[?#])/i` correctly handles case-insensitive match,
  trailing query string, and fragment; the branch is ordered before the
  `ogc-api` fallback.
- Regression tests at
  `packages/map-ui-lib/src/utils/__tests__/ogcApi.test.ts:140-158` cover the
  bare URL, `?key=…`, mixed-case extension, and `#fragment` cases.
- Client-side inspector `apps/admin-app/src/utils/inspectSource.ts:305-335`
  short-circuits on `'style'` with a friendly error and fires no network
  requests for that branch.
- Server-side inspector `apps/admin-app/server/inspect.ts:311-340` mirrors the
  same short-circuit.
- `apps/admin-app/server/index.ts`:
  - `POST /api/sources/test-connection` (around line 728-735) — explicit
    `'style'` rejection, no fetch.
  - `buildBasemapTileUrl` (~1247-1277) — explicit `'style'` rejection.
  - `GET /api/basemaps/:id/tiles` (~1367-1369) — explicit `'style'` rejection.
- `apps/admin-app/src/pages/SourcesPage.tsx` `handleCreateImageryBasemap` /
  `handleUpdateImageryBasemap` (~395-400, 443-448) both guard with
  `if (sourceTypeKind === 'style')` and surface the "use the Basemaps tab"
  error.

### Still broken ⚠️
1. **`SourcesPage.handleTestConnection` still fires the bogus
   `style.json/conformance` request.**
   `apps/admin-app/src/pages/SourcesPage.tsx:252-312` computes
   `sourceType = detectTileSourceType(testUrl)` at line 256, then only
   branches on `'tilejson'` and `'xyz'` (lines 262-269); the `else` at
   line 270-271 blindly hits `${testUrl}/conformance?f=json`. For a
   `style.json` URL that is exactly the original symptom. The server-side
   fallback at line 293-307 rescues the *UX* (it eventually surfaces the
   friendly error from `server/index.ts`), but only after the
   client has already made the spurious cross-origin request to
   `style.json/conformance` — i.e. the network-level bug the fix was
   supposed to eliminate is still present on this code path. The fix
   plan's verification criterion (a) — *"no network request is made to
   `…/style.json/conformance`"* — is not actually met for Test Connection.

   **Suggested fix:** add an early branch in `handleTestConnection` at the
   top of the client-side `try` block:
   ```ts
   if (sourceType === 'style') {
     setTestStatus(prev => ({ ...prev, [key]: 'error' }));
     setTestError(prev => ({
       ...prev,
       [key]: 'Style URLs belong in the Basemaps tab — use "Style URL" mode there.',
     }));
     return;
   }
   ```
   before any `fetch` fires. Skip the server-side fallback too — it only
   returns the same error.

2. **`ImageryEditor.handleCustomUrlChange` silently accepts style URLs.**
   `packages/map-ui-lib/src/components/ImageryEditor/ImageryEditor.tsx:64-99`
   treats `'style'` as the `else` branch (line 91-98) and writes the URL
   straight into `tileUrlTemplate`. The fix plan (step 5) explicitly called
   out lines 67, 148, 156 as needing a `'style'` disabled/error state, and
   the commit status line claims all call sites were audited, but this
   file was not touched. The downstream vector-tile render will fail when
   MapLibre tries to use `style.json` as a tile template.

   **Suggested fix:** before line 91, add
   ```ts
   if (urlType === 'style') {
     setTileJsonError('Style URLs belong in the Basemaps tab — use "Style URL" mode there.');
     update({ tileUrlTemplate: undefined });
     return;
   }
   ```
   and gate the `onBlur` / `onPaste` auto-resolvers at lines 148 and 156
   on the same check so they don't silently no-op on a style URL. (They
   currently only run when the URL is `'tilejson'`, so the auto-resolve is
   fine — but surfacing an inline error in the input would be the friendly
   version.)

### Nits
- `SourcesPage.handleTestConnection`'s `catch {}` at line 289-291 swallows
  the client-side failure entirely, which is how the original bug slipped
  past review: the exporter doesn't know *why* the client attempt failed,
  so a future regression on the client branch would manifest silently as
  "works via server-side fallback" again. Consider logging the swallowed
  error.
- `ConfigWizardPage` (line ~805-823) branches on `detectTileSourceType`
  only for `'tilejson'`/`'xyz'` when deciding whether to auto-add an
  imagery layer. `'style'` falls through to "skip auto-add," which is
  probably the right behavior, but the union widening means it's
  implicitly-not-explicitly handled — worth a one-line comment or an
  explicit `if (urlType === 'style') return;` for future-proofing.

---

## 2. `ui.controlIcons` / `controlPositions` partial-record fix

**Reviewed:** 2026-04-11

### Verified ✅
- Both fields use `z.partialRecord(z.enum(ORDERABLE_CONTROLS), …)` at
  `packages/map-ui-lib/src/schemas/config.ts:590` and `:602`. `.optional()`
  is preserved on both.
- No other `z.record(z.enum(...), …)` usages remain in
  `packages/map-ui-lib/src/schemas/` — grep is clean.
- Regression tests at
  `packages/map-ui-lib/src/schemas/__tests__/config.test.ts:338-402` cover:
  single-key accepted, empty object accepted, omitted → undefined,
  non-string value rejected, unknown-key rejected, controlPositions
  single-key accepted, empty controlPositions accepted, invalid corner
  value rejected. The user's exact symptom config
  `{ controlIcons: { showSearchPanel: 'filter' } }` is the first test.
- Consumers access the fields through optional chaining only, so the
  relaxed shape cannot produce runtime surprises:
  - `apps/map-client/src/components/MapOverlay.tsx:485` —
    `uiConfig.controlIcons?.[k]`
  - `apps/admin-app/src/components/MapPreview.tsx:1062` —
    `uiConfig.controlIcons?.[k]`
  - `packages/map-ui-lib/src/components/UIConfigEditor/UIConfigEditor.tsx:346,376`
    — `value.controlIcons?.[...]`.
- `UIConfigEditor` `handleCornerChange` / `handleIconChange` (lines 144-164)
  build a partial map from scratch each edit and reset to `undefined`
  when the map is empty — matches the new schema shape.

### Still broken
None. The fix is minimal, targeted, and fully covered by tests.

### Nits
- `UIConfigEditor.tsx:145,156` casts the accumulator as
  `Record<OrderableControlKey, ControlCorner>` /
  `Record<OrderableControlKey, string>`, which is now technically a lie —
  the schema type is `Partial<Record<…>>`. It's a local mutable variable
  that never escapes the handler, so it's harmless, but tightening the
  cast to `Partial<Record<OrderableControlKey, ControlCorner>>` would
  match the real type and avoid misleading IntelliSense for anyone
  touching this file next.
- No test asserts that *multiple* non-contiguous keys are accepted (e.g.
  `{ showSearchPanel: 'filter', showLegend: 'list' }`). Practically
  covered by the single-key case, since strict-record rejection would
  fail identically, but a two-key test would be a one-line addition if
  someone wants belt-and-braces coverage.
- The user's original error wall mentioned `showInfoControl` as one of
  the "Invalid input" errors, confirming that key is in
  `ORDERABLE_CONTROLS` at `config.ts:551` — good, the enum hasn't drifted
  from what the user was hitting.

---

## 3. Admin `MapPreview` `controlLayout: 'side-menu' | 'auto'`

**Reviewed:** 2026-04-11

(The "can't exit side menu in map-client" sub-report was explicitly
deferred by the fix status line and is **not** re-evaluated here.)

### Verified ✅
- `effectiveLayout` derivation exists at
  `apps/admin-app/src/components/MapPreview.tsx:254-270`: a
  `matchMedia('(max-width: 767px)')` listener drives `isNarrowViewport`,
  then `uiConfig?.controlLayout === 'auto' ? (narrow ? 'side-menu' :
  'individual') : (uiConfig?.controlLayout ?? 'individual')`.
- Side-menu branch at `MapPreview.tsx:1060-1232` builds a
  `SideMenuPanelItem[]` with Search / Layers / Measure / Select /
  Imagery / Basemap / Export entries, guarded by the relevant `showX`
  flags.
- `SideMenuToggle` and `SideMenuPanel` are rendered at `1205` / `1225`
  with `sideMenuOpen` (declared at `:253`) wired to both open and
  close.
- Legend is placed top-left at `1216-1224`; Compass and `InfoControl`
  (top-right) stay in the top-right column at `1206-1214`, matching
  `MapOverlay.tsx:498-508`.
- The individual branch at `MapPreview.tsx:1235` is now gated on
  `effectiveLayout === 'individual'`, so it doesn't double-render on
  top of the side-menu chrome.

### Still broken ⚠️
1. **Side-menu `Export` item drops `showExportPdf`.**
   `MapOverlay.tsx:464-482` builds `exportInner` as a column containing
   *both* `showExportButton` (CSV/shapefile) *and* `showExportPdf`
   (Export as PDF) — either or both can be enabled, and the panel
   renders a single "Export" entry covering whichever are on. The admin
   preview at `MapPreview.tsx:1188-1201` only checks
   `uiConfig.showExportButton` and emits a single `ExportButton`; a
   grep for `showExportPdf` in `MapPreview.tsx` returns **zero hits** —
   it's not wired into the preview at all, in either layout. So
   toggling "Export as PDF" in the admin wizard has no visible effect
   on the preview, in either individual or side-menu mode. This is the
   same class of "two overlays drift" bug that Task 3 was supposed to
   close.

   The status line for Task 3 explicitly promises the side-menu items
   mirror `MapOverlay.tsx:483-517`, but they don't — the mirror is
   incomplete. Either the fix plan's "canonical implementation" port
   missed this flag, or `showExportPdf` was added to `MapOverlay`
   after Task 3 shipped and `MapPreview` was never brought along. Grep
   `packages/map-ui-lib/src/schemas/config.ts` for `showExportPdf` to
   confirm the flag exists in the schema, then port the same
   `showExportButton || showExportPdf ? <flex column of both>` pattern
   from `MapOverlay.tsx:464-482` into `MapPreview.tsx`.

   **Severity:** admin-only; the admin wizard can still save a config
   and the real client honors it. But the preview is now actively
   misleading — a user who toggles the PDF export flag sees no change
   and assumes it's broken.

2. **`effectiveLayout` uses the window viewport, not the preview
   container.** The fix plan explicitly noted: *"The preview iframe
   may have its own width, so consider reading the preview
   container's width via a `ResizeObserver` instead of
   `window.matchMedia`."* The shipped code takes the simpler
   `matchMedia` path. Functional impact: if a user shrinks the admin
   wizard's preview panel to narrower than 768px while the overall
   browser window is wider than 768px, `auto` stays on `individual`
   when the preview's actual width would warrant `side-menu`. The
   preview and the real client can therefore disagree on narrow
   previews. This is a design trade-off the plan flagged, not a pure
   oversight — noting it so there's a record if someone trips over it.

### Missing test/Storybook coverage
- The fix plan step 4 asked for a Storybook story or manual-test note
  toggling `individual` / `side-menu` / `auto` against a narrow
  wrapper. No such story or test was added — `MapPreview.tsx` has no
  `.stories.tsx` or `__tests__` file anywhere in
  `apps/admin-app/src/components/`. The regression surface from the
  next drift between `MapOverlay` and `MapPreview` therefore stays
  wide open. (Same class of issue flagged by Task 3's own "out of
  scope" note about extracting the overlay into the lib.)

---

## 4. SearchPanel Expand button at bottom

**Reviewed:** 2026-04-11

### Verified ✅
- `titleNode` / `expandFooter` split exists at
  `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx:82-115`.
  `titleNode` (lines 82-103) handles the header row with optional collapse X;
  `expandFooter` (lines 105-115) renders the "Expand" button at the bottom.
- The `showExpandButton` guard at line 78 (`expandable && !expanded`) ensures
  the footer only appears when the panel is expandable and not yet expanded.
- Empty-state branch at line 117-128 renders `expandFooter` after the "No
  searchable layers" message — the expand button is reachable even when there
  are no layers, which is correct since the expanded modal hosts the
  PropertyFilterPanel that works independently of search fields.
- Collapse X button in `titleNode` (line 89-101) is gated on
  `showCollapseButton` (`expandable && expanded`) — it correctly renders at
  the top of the modal shell, matching the expected UX of X-to-close at top,
  Expand at bottom.
- `ModalShell` (lines 305-318) renders backdrop-click-to-close via
  `e.target === e.currentTarget` check. Escape key is not handled — this is
  a minor usability gap but not a regression from the fix plan which didn't
  specify keyboard dismissal.
- Stories file confirms the split:
  `SearchPanel.stories.tsx:618-626` (`Expandable` story with `expandable: true`)
  and `:629-638` (`ExpandedWithAllFilters` with `expanded: true`).

### Still broken
None. The fix correctly moves the Expand button to the footer and keeps the
collapse X at the top.

### Nits
- `ModalShell` does not handle Escape key to close. A `useEffect` with a
  `keydown` listener for `Escape` calling `onClose` would complete the
  keyboard accessibility story. Low priority — not a regression.
- The orphaned `AllFiltersBuilder.tsx` file
  (`packages/map-ui-lib/src/components/SearchPanel/AllFiltersBuilder.tsx`)
  is still on disk. It is not imported anywhere (confirmed via grep) but
  references the old `customRules` / `FilterRule` types. Dead code — can
  be deleted in a cleanup pass.

---

## 5. PDF export left-shift

**Reviewed:** 2026-04-11

### Verified ✅
- Legend capture happens *before* layout math:
  `apps/map-client/src/utils/exportPdf.ts:49-59` captures legend,
  lines 62+ derive `legendColumnWidth` from the capture result.
- `legendColumnWidth` is `legendCanvas ? 160 : 0` (line 62). When the capture
  fails or returns a zero-size canvas, `legendCanvas` is set to `null` at
  lines 53-54, so the column width correctly falls to zero. No blindly-reserved
  column.
- Null/zero legend path at lines 80-82:
  `drawX = (pageWidth - drawW) / 2` — map is centered on the full page width.
  With a legend, `drawX = mapBoxX + (mapBoxW - drawW) / 2` — centered within
  the reduced map box.
- Title drawn at line 89 with `{ align: 'center' }`, positioned at
  `drawX + drawW / 2` — correctly centered above the map image regardless
  of legend presence.
- Scale bar is drawn natively via `jsPDF.rect/line/text` at lines 105-133
  using `computeMetricScale`. The virtual-zoom correction at line 111
  (`zoom + Math.log2(mapCanvas.width / drawW)`) converts screen pixels to PDF
  points so the bar length is physically accurate.
- `scaleBarContainerRef` and `scaleBarElement` are fully removed from
  `MapOverlay.tsx` and the `ExportPdfInput` interface — grep across
  `apps/map-client/src/` returns zero hits.

### Still broken
None. The fix cleanly eliminates the left-shift and the scale-bar overlay
issues.

### Nits
- The `legendColumnWidth` is a fixed 160pt regardless of the actual legend
  canvas width. This works well for short legends but will clip or waste
  space for very wide/narrow legends. Acceptable trade-off for a PDF
  export, but worth noting for any future refinement pass.

---

## 6. Scale bar overlap and PDF rendering

**Reviewed:** 2026-04-11

### Verified ✅
- `apps/map-client/src/components/MapOverlay.tsx:710` positions the scale bar
  at `bottom-6 left-2`, raised above the MapLibre attribution line (previously
  overlapped at `bottom-0`).
- `apps/map-client/src/utils/exportPdf.ts:105-133` draws the scale bar
  natively in the PDF using `jsPDF.rect`, `jsPDF.line`, and `jsPDF.text`.
  The `computeMetricScale` helper (from `@ogc-maps/storybook-components`) is
  properly wired at line 112.
- `scaleBarContainerRef` and `scaleBarElement` are fully deleted:
  - Grep for either symbol across the entire repo returns hits only in
    documentation files (`PLAN.md`, `FOLLOWUP.md`, `NOTES.md`) — zero
    code references.
  - The `ExportPdfInput` interface at `exportPdf.ts:9-14` has no scale-bar
    field; it only takes `legendElement` and `compassElement`.
- The `computeMetricScale` function is exported from
  `packages/map-ui-lib/src/components/ScaleBarControl/` and re-exported at
  `packages/map-ui-lib/src/components/index.ts` — properly available to the
  app layer.

### Still broken
None. The scale bar no longer overlaps attribution, and the PDF renders it
natively without html2canvas capture.

### Nits
None.

---

## 7. PropertyFilterPanel replacement

**Reviewed:** 2026-04-11

### Verified ✅
- `PropertyFilterPanel` at
  `packages/map-ui-lib/src/components/PropertyFilterPanel/PropertyFilterPanel.tsx`
  is a clean flat panel: layer → property dropdown → value input, implicit
  equality, no operator picker. Fully controlled via `filters` /
  `onFiltersChange` props.
- `PropertyFilter` type at
  `packages/map-ui-lib/src/utils/propertyFilters.ts:8-13` is a simple
  `{ id, layerId, property, value }` shape with `propertyFiltersToCql2`
  compiler at lines 21-30.
- SearchPanel prop swap: the old `customRules` prop is gone from
  `SearchPanel.tsx`. Replaced by `propertyFilters` (line 28) and
  `onPropertyFiltersChange` (line 30). The `showAllFiltersBuilder` flag
  at line 80 gates on `propertyFilters !== undefined`.
- MapOverlay rewire at
  `apps/map-client/src/components/MapOverlay.tsx:291` — flat
  `useState<PropertyFilter[]>([])` state. `computeMergedCql2` (lines 294-303)
  calls `propertyFiltersToCql2(flatFilters, layerId)` and `and()`s it with
  the structured filter CQL2. `handlePropertyFiltersChange` (lines 316-331)
  tracks touched layer IDs from both old and new filter arrays and recomputes
  CQL2 for each — correctly handles clearing a filter from a layer.
- All 6 test cases in
  `packages/map-ui-lib/src/utils/__tests__/propertyFilters.test.ts` pass
  (verified structure): null for no match, null for empty list, skip empty
  property/value, single-row bare eq, multi-row AND, cross-layer isolation.
- Stories: `SearchPanel.stories.tsx:618-638` has `Expandable` and
  `ExpandedWithAllFilters` stories with `propertyFilters` / `availableProperties`
  wired up.

### Still broken
None. The replacement is clean, fully tested, and correctly wired.

### Nits
- The orphaned `AllFiltersBuilder.tsx` file
  (`packages/map-ui-lib/src/components/SearchPanel/AllFiltersBuilder.tsx`)
  still exists on disk. Not imported anywhere (grep confirmed). References
  the old `customRules` / `FilterRule` / `FilterRuleGroup` types. Should be
  deleted in a cleanup pass to avoid confusion. (Same note as §4.)

---
