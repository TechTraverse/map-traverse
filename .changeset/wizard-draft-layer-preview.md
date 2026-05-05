---
'@ogc-maps/storybook-components': minor
---

LayerList: optional controlled draft-layer props (`draftLayer`, `onDraftChange`) so consumers can render the in-progress new-layer in a live preview before "Save Layer" is clicked. Backwards-compatible — when both props are omitted, the existing internal-state behavior is preserved.
