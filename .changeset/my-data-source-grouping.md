---
"@ogc-maps/storybook-components": minor
---

LayerEditor/LayerList: add optional `availableSourceGroups` and `collectionFilter`
props so the source/collection picker can group choices (e.g. "My Data" vs
"External Sources") and narrow collections per source. Both are backward-
compatible — omitting them preserves the existing flat list. Also exports the new
`buildSourceOptionGroups` helper and `SourceGroup`/`SourceOptionGroup` types.
