# PLAN.md — Remaining Work (Prioritized)

## Loop protocol

This plan is designed to be executed by a looping agent, one task per iteration.

**Each iteration:**
1. Read this file. Find the first task with `[ ]` (unchecked).
2. Execute that task. Follow the **Changes** and **Verification** sections exactly.
3. Run `pnpm verify` (build + test). If it fails, fix the failure before proceeding.
4. Mark the task `[x]` in this file.
5. If the task produced review notes (Task 1), append any "Still broken" findings as new checked-off sub-bullets under the task describing what was found — then create a new task at the appropriate priority position with `[ ]` for the fix work.
6. Commit all changes (code + this file + any notes files) with a descriptive message.
7. Stop the iteration. The next loop picks up the next unchecked task.

**Done condition:** All tasks are `[x]`. Report summary to the user.

---

## Context

Phases 1–5 landed on `ralph/main` (reviewed in `NOTES.md`). UI-bug fixes (`FOLLOWUP.md` items 1–7) shipped on top. Review in `FOLLOWUP_NOTES.md` caught regressions in items 1, 2, 3; items 4–7 are unreviewed.

---

## Tasks

### [x] Task 1 — Review unreviewed follow-up fixes (items 4–7)

**Type:** Read-only review. No code changes — only write `FOLLOWUP_NOTES.md` entries.

**Why first:** Items 4–7 are marked ✅ Fixed but have no reviewer entry in `FOLLOWUP_NOTES.md`. Reviewing before writing code gives a complete bug list. If any are broken, insert a new `[ ]` task below this one for the fix.

**Steps:** For each item, walk the code and append a section to `FOLLOWUP_NOTES.md` (Verified ✅ / Still broken / Nits) matching the format of existing §1–3.

- **1a. Item 4 — SearchPanel Expand button at bottom.** Read `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx` and the stories file. Confirm the `titleNode` / `expandFooter` split. Verify the empty-state branch renders the footer when `expandable && !expanded`. Check the modal-expanded collapse X still lives at the top.
- **1b. Item 5 — PDF export left-shift.** Walk `apps/map-client/src/utils/exportPdf.ts`. Confirm: (a) legend capture is before layout math; (b) `legendColumnWidth` is derived from real canvas width; (c) null/zero legend → `drawX = (pageWidth - drawW) / 2`; (d) title drawn with `{ align: 'center' }`.
- **1c. Item 6 — Scale bar overlap and PDF rendering.** Check `apps/map-client/src/components/MapOverlay.tsx` for the `bottom-6 left-2` move. Check `exportPdf.ts` for native `jsPDF.rect/line/text` draw + `computeMetricScale` wiring. Verify `scaleBarContainerRef` and `scaleBarElement` are fully deleted from `MapOverlay.tsx` and the `ExportPdfInput` interface.
- **1d. Item 7 — PropertyFilterPanel replacement.** Check `packages/map-ui-lib/src/components/PropertyFilterPanel/PropertyFilterPanel.tsx`, `packages/map-ui-lib/src/utils/propertyFilters.ts`, `SearchPanel` prop swap (`customRules` → `propertyFilters`), `MapOverlay` rewire (flat array, `computeMergedCql2`, clear-filter on removal). Walk the 6 test cases in `packages/map-ui-lib/src/utils/__tests__/propertyFilters.test.ts`.

**Output:** `FOLLOWUP_NOTES.md` gains §4, §5, §6, §7. If any section has "Still broken" entries, insert a new `[ ]` task immediately after this one with the fix details.

**Verification:** `pnpm verify` (no code changes, but confirm build is still green before committing the notes).

---

### [x] Task 2 — Fix style-URL spurious network request

**Source:** FOLLOWUP_NOTES.md §1 regression.

**Why:** User-facing network bug — highest-impact known regression. `handleTestConnection` still fires a bogus `style.json/conformance` request. `ImageryEditor` silently accepts style URLs.

**Changes:**

**File 1: `apps/admin-app/src/pages/SourcesPage.tsx`**
In `handleTestConnection` (~line 252–312), add an early `if (sourceType === 'style')` branch at the top of the client-side `try` block, *before* any `fetch`:
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
Also: in the `catch` block (~line 289–291), add `console.error('Client-side test connection failed:', err);` so failures aren't silently swallowed.

**File 2: `packages/map-ui-lib/src/components/ImageryEditor/ImageryEditor.tsx`**
In `handleCustomUrlChange` (~line 64–99), add before the `else` branch (~line 91):
```ts
if (urlType === 'style') {
  setTileJsonError('Style URLs belong in the Basemaps tab — use "Style URL" mode there.');
  update({ tileUrlTemplate: undefined });
  return;
}
```
Also check lines ~148 and ~156 (`onBlur`/`onPaste` auto-resolvers) — confirm they already skip `'style'` (they only run for `'tilejson'`). If they don't, add the same guard.

**Verification:** `pnpm verify`.

---

### [x] Task 3 — Fix MapPreview `showExportPdf` + add controlLayout test

**Source:** FOLLOWUP_NOTES.md §3 regression + §3 missing test coverage.

**Why:** Admin preview ignores `showExportPdf` — toggling the flag has no visible effect. Same file needs a controlLayout regression test.

**Changes:**

**File 1: `apps/admin-app/src/components/MapPreview.tsx`**
At ~line 1188–1201, port the export pattern from `apps/map-client/src/components/MapOverlay.tsx:464-482`. Build an `exportInner` node:
```tsx
const exportInner = (uiConfig.showExportButton || uiConfig.showExportPdf) ? (
  <div className="mapui:flex mapui:flex-col mapui:gap-2">
    {uiConfig.showExportButton && <ExportButton ... />}
    {uiConfig.showExportPdf && <PdfExportButton ... />}
  </div>
) : null;
```
Use `exportInner` in both the side-menu `SideMenuPanelItem` list and the individual layout branch. Read `MapOverlay.tsx:464-482` for the exact pattern — match it.

**File 2: `apps/admin-app/src/components/__tests__/MapPreview.controlLayout.test.tsx`** (new)
If the admin-app has a test setup (check for existing `__tests__/` dirs or `vitest`/`jest` config), add a test that:
- Renders `MapPreview` with `controlLayout: 'individual'` — asserts no `SideMenuToggle` present.
- Renders with `controlLayout: 'side-menu'` — asserts `SideMenuToggle` present.
- Renders with `showExportPdf: true` — asserts the PDF export affordance renders.

If no test infrastructure exists in `apps/admin-app`, skip the test file and note it in the commit message.

**Verification:** `pnpm verify`.

---

### [x] Task 4 — Nits: type casts, style fallthrough, multi-key test

**Source:** FOLLOWUP_NOTES.md §2 nit, §1 nit.

**Why:** Small correctness/clarity fixes. Three unrelated changes in three files.

**Changes:**

**File 1: `packages/map-ui-lib/src/components/UIConfigEditor/UIConfigEditor.tsx`**
At ~line 145: change `as Record<OrderableControlKey, ControlCorner>` → `as Partial<Record<OrderableControlKey, ControlCorner>>`.
At ~line 156: change `as Record<OrderableControlKey, string>` → `as Partial<Record<OrderableControlKey, string>>`.

**File 2: `packages/map-ui-lib/src/schemas/__tests__/config.test.ts`**
Add a test case for multi-key `controlIcons`:
```ts
it('accepts multiple controlIcons keys', () => {
  const result = parseMapConfig({ ...minimalValid, ui: { controlIcons: { showSearchPanel: 'filter', showLegend: 'list' } } });
  expect(result.success).toBe(true);
});
```
Match the existing test style — read the file first to see the exact patterns used.

**File 3: `apps/admin-app/src/pages/ConfigWizardPage.tsx`**
At ~line 805–823, where `detectTileSourceType` is checked for `'tilejson'`/`'xyz'`, add an explicit early return:
```ts
if (urlType === 'style') return; // style URLs handled by Basemaps tab
```

**Verification:** `pnpm verify`.

---

### [x] Task 5 — Diagnose "can't exit side menu" in map-client

**Source:** FOLLOWUP.md §3 Part 6, deferred.

**Why:** User-facing UX bug. Runs after Tasks 2–4 so the test environment reflects all prior fixes.

**Type:** Diagnostic — read code first, then fix if the cause is clear.

**Steps:**

1. Read `packages/map-ui-lib/src/components/SideMenuPanel/SideMenuPanel.tsx` — confirm X button, backdrop click, and Escape key handlers exist and fire `onClose`.
2. Read `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx` — check whether the Expand button's `ModalShell` renders *on top of* the `SideMenuPanel`, potentially trapping focus/clicks. Look for z-index conflicts.
3. Read `apps/map-client/src/components/MapOverlay.tsx` — check how `sideMenuOpen` state interacts with the SearchPanel's `expanded` state. Can both be true simultaneously? If so, does closing the modal also close the side menu, or vice versa?
4. If the root cause is clear from code reading: fix it. Likely fix: suppress the Expand button when `SearchPanel` is rendered inside `SideMenuPanel` (add a `hideExpandButton` prop or check context), OR render expanded content inline instead of via `ModalShell` when inside the side menu.
5. If the root cause is NOT clear from code reading: document findings in `FOLLOWUP_NOTES.md` under a new "§3 addendum" and mark this task done. The fix becomes a separate task requiring runtime debugging.

**Verification:** `pnpm verify`. If a fix was applied, note in the commit message what the root cause was.

---

### [x] Task 6 — Schema-qualify bare table queries

**Source:** NOTES.md Phase 1A follow-up.

**Why:** Defense-in-depth. 25+ bare-name queries rely on `search_path`. No behavior change.

**Changes:**

Grep `apps/admin-app/server/` for these patterns (case-insensitive):
- `FROM map_configs`, `FROM ogc_sources`, `FROM config_versions`, `FROM site_settings`
- `INTO map_configs`, `INTO ogc_sources`, `INTO config_versions`, `INTO site_settings`
- `UPDATE map_configs`, `UPDATE ogc_sources`, `UPDATE config_versions`, `UPDATE site_settings`
- `DELETE FROM map_configs`, etc.
- `JOIN` references to these tables

Replace each bare name with the schema-qualified version: `map_admin.map_configs`, `map_admin.ogc_sources`, `map_admin.config_versions`, `map_admin.site_settings`.

Files: `apps/admin-app/server/index.ts`, `apps/admin-app/server/inspect.ts`. Check `db.ts` too — the `CREATE TABLE` statements should already be qualified (verify, don't assume).

**Verification:** `pnpm verify`.

---

### [x] Task 7 — Add StyleEditor theme-dropdown story

**Source:** NOTES.md Phase 4A gap.

**Why:** Low effort, fills a Storybook discoverability gap.

**Changes:**

**File: `packages/map-ui-lib/src/components/StyleEditor/StyleEditor.stories.tsx`** (or similar — glob for `StyleEditor*.stories.*` first).

Add a story variant that:
- Passes `theme` and `onThemeChange` props so the theme dropdown is visible.
- Uses `useState` in the story to make the dropdown interactive.
- Shows at least two themes switching (e.g., default → ocean).

Match the existing story patterns in the file.

**Verification:** `pnpm verify`. Optionally `pnpm storybook` to visually confirm.

---

### [x] Task 8 — Complete mobile friendliness audit

**Source:** NOTES.md Phase 5E remainder.

**Why:** Largest scope, lowest urgency. Phase 5E shipped 5 fixes but skipped admin app, touch targets, and most lib components.

**Steps:**

1. **Admin app audit:** Read through `apps/admin-app/src/pages/ConfigWizardPage.tsx` and key admin components. Look for hardcoded widths, missing responsive classes, elements that would overflow at 375px. Fix any clear issues.
2. **Touch-target audit:** Grep `packages/map-ui-lib/src/components/` for small buttons (icon-only, no padding). Check: `CollapsibleControl`, `SearchPanel` icon buttons, `ResultsDrawer` sort/column arrows. If any are clearly < 44x44px, bump padding or `min-w`/`min-h`.
3. **Hardcoded-width grep:** Run `rg '(min-w-\[|max-w-\[|w-\[)' packages/map-ui-lib/src/components/` and review each hit. Replace pixel widths with responsive alternatives where it makes sense.
4. **Spot-check untouched components:** Read through `SearchPanel`, `LayerPanel`, `ImageryPanel`, `MeasurePanel`, `SelectionPanel`, `ResultsDrawer` for obvious mobile issues. Only fix clear problems — don't refactor for hypotheticals.
5. **Write audit output:** Create `.agent/notes/mobile-audit-2026-04.md` with: (a) file-by-file list of fixes made, (b) list of components reviewed and intentionally left alone with one-line reasoning.

**Verification:** `pnpm verify`.

---

## Tracked notes (no action required)

- **Tooltip-suppression gate (Phase 2C):** Keys on `selectedFeatures.length === 0` as proxy for "detail panel not open." Works today. Could drift if selection stops auto-opening the detail panel. No action unless that decoupling is planned.

---

## Critical files

| Task | Files |
|------|-------|
| 2 | `apps/admin-app/src/pages/SourcesPage.tsx`, `packages/map-ui-lib/src/components/ImageryEditor/ImageryEditor.tsx` |
| 3 | `apps/admin-app/src/components/MapPreview.tsx`, `apps/map-client/src/components/MapOverlay.tsx` (reference) |
| 4 | `packages/map-ui-lib/src/components/UIConfigEditor/UIConfigEditor.tsx`, `packages/map-ui-lib/src/schemas/__tests__/config.test.ts`, `apps/admin-app/src/pages/ConfigWizardPage.tsx` |
| 5 | `packages/map-ui-lib/src/components/SideMenuPanel/SideMenuPanel.tsx`, `packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx`, `apps/map-client/src/components/MapOverlay.tsx` |
| 6 | `apps/admin-app/server/index.ts`, `apps/admin-app/server/inspect.ts` |
| 7 | `packages/map-ui-lib/src/components/StyleEditor/StyleEditor.stories.tsx` |
