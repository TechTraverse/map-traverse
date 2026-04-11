---
'@ogc-maps/storybook-components': minor
---

Phase 3 — export selected + interactive results table:

- `ExportModal` gains a "Source" toggle between "All (filtered)" and
  "Selected only" when `selectionCount > 0`. New props `selectionCount`
  and `selectionLayerId` lock the layer picker to the selection layer
  while in "Selected only" mode. `ExportRequest` gains a `mode:
  'all' | 'selected'` field so consumers can route selected exports to
  the new `useExport().exportFeatures(...)` entry point and skip the
  API fetch.
- `useExport` returns a new `exportFeatures(features, collectionId,
  formatId, filename)` function that converts an in-memory feature
  array directly to the requested format.
- `ResultsDrawer` becomes interactive: hide/show columns via a column
  picker, reorder columns with per-header arrow buttons, and cycle
  ascending/descending/none sorting on any column. All three are
  controlled via new optional props (`columnOrder`,
  `onColumnOrderChange`, `hiddenColumns`, `onHiddenColumnsChange`,
  `sortBy`, `onSortChange`) and fall back to internal state when
  uncontrolled. New `ResultsDrawerSort` / `SortDirection` exports.
