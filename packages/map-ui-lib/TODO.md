# map-ui-lib - Future Features

## Completed Features

### Search Component ✅
- [x] Full-text search across OGC collections (SearchPanel)
- [x] Autocomplete with `fetchDistinctValues` support
- [x] Configurable search providers (text, number, datetime, select field types)
- [x] Filter-to-CQL2 conversion via `fromStructuredFilters`
- [x] Debounced search (in client app via `useAutocompleteSuggestions`)

### URL Router Integration ✅
- [x] Shareable URLs with view state and active filters (nuqs in client app)
- [x] Query parameter validation
- [ ] Deep linking for feature detail panels
- [ ] Bookmark support for saved views

### Filter Builder ✅
- [x] SearchPanel with visual filter builder UI
- [x] CQL2 expression builder functions

## Planned Features

### Advanced Layer Controls
- [ ] Opacity sliders
- [ ] Layer styling editor
- [ ] Time slider for temporal data

### Performance
- [ ] Virtualized layer lists for large configs
- [ ] Lazy loading for Storybook assets

## Notes
- Keep library MapLibre-agnostic
- Maintain lightweight bundle size
- Prioritize TypeScript experience
