---
'@ogc-maps/storybook-components': minor
---

Phase 2 UI additions:

- Add `ScaleBarControl` component with Web Mercator `metersPerPixel`,
  `computeMetricScale`, and `computeImperialScale` helpers.
- Extend `UIConfig` with `showScaleBar`, `legendOrder`, and
  `coordinateFormat` (`decimal-degrees` | `ddm` | `dms`).
- `Legend` accepts a `legendOrder` prop for explicit layer ordering.
- `CoordinateDisplay` exports `formatDDM` and defaults now include DDM.
- `UIConfigEditor` gains a Legend Order reorder UI and a Coordinate
  Format dropdown (gated on `showCoordinateDisplay`).
