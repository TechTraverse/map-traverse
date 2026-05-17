---
'@ogc-maps/storybook-components': minor
---

Legend: improve outline swatches. `outline-square` and `outline-circle` now render via SVG with sharp 90° corners on the square and a slightly larger 14px footprint so the two shapes are easier to tell apart. The existing `dasharray` field on `LegendEntry` is now honored for outline shapes too, producing a dashed border (previously dashed-only worked for the `line` shape). No schema or API change.
