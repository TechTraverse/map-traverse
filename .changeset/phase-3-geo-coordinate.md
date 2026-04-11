---
'@ogc-maps/storybook-components': minor
---

Phase 3 geo + coordinate additions (Chunks 3B, 3C):

- `utils/geo.ts` exports a new `zoomToFeature(geometry, options)` helper that
  returns a `ZoomToFeatureInstruction` — either `fitBounds` (for polygon/line
  geometries, with a `maxZoom` cap so small polygons don't snap to max zoom) or
  `flyTo` (for point/zero-area geometries, respecting layer `minZoom`/`maxZoom`
  and an optional `pointZoom` preference). Exported constants:
  `DEFAULT_POINT_ZOOM`, `DEFAULT_POLYGON_MAX_ZOOM`.
- `LayerConfigSchema` accepts an optional `zoomToLevel` override used as the
  preferred zoom when fitting to point features.
- `CoordinateDisplay` gains `onNavigate`, `isExpanded`, and `onToggleExpand`
  props. When `onNavigate` is provided, clicking the readout expands an inline
  lat/lng input form that accepts decimal degrees, DDM, or DMS (with optional
  N/S/E/W) via the newly exported `parseCoordinate` helper.
