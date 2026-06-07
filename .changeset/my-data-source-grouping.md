---
"@ogc-maps/storybook-components": minor
---

LayerEditor/LayerList: add an optional `availableSourceGroups` prop so the source
picker can group choices (e.g. "My Data" vs "External Sources") with `<optgroup>`
headers. Backward-compatible — omitting it preserves the existing flat list. Also
exports the new `buildSourceOptionGroups` helper and `SourceGroup`/
`SourceOptionGroup` types.
