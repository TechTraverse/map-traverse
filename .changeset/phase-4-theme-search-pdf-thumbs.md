---
'@ogc-maps/storybook-components': minor
---

Phase 4 — color themes, expanded search, PDF export, and imagery thumbnails:

- **Color themes for StyleEditor**: `StyleEditor` accepts optional
  `themes` (an array of named color palettes) and exposes a theme picker
  that fills in stroke/fill colors from the chosen palette in one click.
- **Expanded SearchPanel**: `SearchPanel` gains optional `expandable`,
  `expanded`, and `onExpandedChange` props. When expanded, the panel
  renders inside a centered modal and shows a new `AllFiltersBuilder`
  section for ad-hoc per-layer `FilterRule` construction. New optional
  props: `availableProperties`, `customRules`, `onCustomRulesChange`.
- **PdfExportDialog**: new library component — a form-only modal for
  title, filename, and include-toggles (legend / scale bar / north
  arrow). Library stays framework-agnostic; jsPDF/html2canvas rendering
  is left to the consuming app. Gated in the client via the new
  `UIConfigSchema.showExportPdf` flag.
- **Imagery thumbnails**: `ImageryLayerConfigSchema` gains an optional
  `thumbnailUrl`. `ImageryPanel` renders the preview next to each layer
  (or a placeholder block when absent), and `ImageryEditor` exposes a
  Thumbnail URL field.
