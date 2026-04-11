---
"@ogc-maps/storybook-components": minor
---

Phase 5: new `SideMenuPanel` + `SideMenuToggle` components for grouping map controls into a slide-in menu. `UIConfigSchema` gains `controlLayout` (`individual` / `side-menu` / `auto`), `controlPositions` (per-control corner override), and `controlIcons` (per-control icon override by name). Exports a curated `CONTROL_ICON_MAP` / `CONTROL_ICON_NAMES` / `getControlIcon` helper. `UIConfigEditor` now renders a layout radio, per-control corner select, and per-control icon picker. Mobile-friendliness fixes: modals (`ExportModal`, `PdfExportDialog`, `ConfirmDialog`, `InfoModal`) get horizontal padding and scroll on narrow viewports.
