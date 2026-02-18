# Configuration Reference

The `MapConfig` object is the single source of truth for your map. It is defined as a Zod schema in `packages/map-ui-lib/src/schemas/config.ts` and all types are inferred from it.

## Import Paths

```ts
// Types only
import type { MapConfig, LayerConfig, ... } from '@ogc-maps/storybook-components/types';

// Schemas + validation utilities
import { MapConfigSchema, validateMapConfig, safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';
```

---

## MapConfig (root)

| Field | Type | Required | Description |
|---|---|---|---|
| `sources` | `OgcApiSource[]` | Yes (min 1) | OGC API data sources |
| `layers` | `LayerConfig[]` | Yes | Map layers (can be empty) |
| `basemaps` | `BasemapConfig[]` | Yes (min 1) | Background map styles |
| `ui` | `UIConfig` | No (has defaults) | UI panel visibility flags |
| `initialView` | `ViewConfig` | Yes | Starting camera position |

---

## OgcApiSource

Describes an OGC API Features/Tiles server.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier (referenced by `LayerConfig.sourceId`) |
| `url` | `string` (URL) | Yes | Base URL of the OGC API server |
| `label` | `string` | No | Human-readable name |
| `tileMatrixSetId` | `string` | No | Tile matrix set; default `"WebMercatorQuad"` |

```ts
{
  id: 'tipg-local',
  url: 'http://localhost:8000',
  label: 'Local tipg',
  tileMatrixSetId: 'WebMercatorQuad',
}
```

---

## LayerConfig

Defines a single map layer.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier |
| `sourceId` | `string` | Yes | References an `OgcApiSource.id` |
| `collection` | `string` | Yes | OGC API collection name (e.g., `public.countries`) |
| `label` | `string` | Yes | Display name in UI |
| `visible` | `boolean` | No (default `true`) | Initial visibility |
| `dataMode` | `"vector-tiles" \| "geojson"` | Yes | How the layer fetches data |
| `style` | `StyleConfig` | No | Visual style (fill/line/circle) |
| `legend` | `LegendConfig` | No | Legend entries (auto-derived from style if omitted) |
| `filters` | `FilterConfig` | No | Initial/static filter state |
| `search` | `SearchConfig` | No | Search fields for the SearchPanel |

---

## StyleConfig

A discriminated union on `type`. The `paint` properties follow MapLibre GL JS conventions.

### Fill Style

```ts
{
  type: 'fill',
  paint: {
    'fill-color': '#4a90d9',     // default: '#000000'
    'fill-opacity': 0.6,          // default: 1, range: 0–1
    'fill-outline-color': '#2c5f8a', // optional
  }
}
```

| Paint Property | Type | Default | Description |
|---|---|---|---|
| `fill-color` | `string` | `'#000000'` | Fill color (CSS color or hex) |
| `fill-opacity` | `number` (0–1) | `1` | Fill transparency |
| `fill-outline-color` | `string` | — | Outline color (optional) |

### Line Style

```ts
{
  type: 'line',
  paint: {
    'line-color': '#00bcd4',
    'line-width': 2,
    'line-opacity': 0.8,
    'line-dasharray': [2, 4], // optional
  }
}
```

| Paint Property | Type | Default | Description |
|---|---|---|---|
| `line-color` | `string` | `'#000000'` | Line color |
| `line-width` | `number` (≥0) | `1` | Line width in pixels |
| `line-opacity` | `number` (0–1) | `1` | Line transparency |
| `line-dasharray` | `number[]` | — | Dash pattern (e.g., `[2, 4]`) |

### Circle Style

```ts
{
  type: 'circle',
  paint: {
    'circle-color': '#e74c3c',
    'circle-radius': 5,
    'circle-opacity': 0.9,
    'circle-stroke-color': '#ffffff', // optional
    'circle-stroke-width': 1,          // optional
  }
}
```

| Paint Property | Type | Default | Description |
|---|---|---|---|
| `circle-color` | `string` | `'#000000'` | Circle fill color |
| `circle-radius` | `number` (≥0) | `5` | Radius in pixels |
| `circle-opacity` | `number` (0–1) | `1` | Circle transparency |
| `circle-stroke-color` | `string` | — | Stroke color (optional) |
| `circle-stroke-width` | `number` (≥0) | — | Stroke width (optional) |

---

## LegendConfig

Explicit legend entries for a layer. If omitted and `style` is set, entries are auto-derived.

```ts
{
  entries: [
    { label: 'Countries', color: '#4a90d9', shape: 'square' },
    { label: 'Capitals',  color: '#e74c3c', shape: 'circle' },
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | `LegendEntry[]` | Yes (min 1) | List of legend items |

**LegendEntry:**

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Display text |
| `color` | `string` | Yes | Swatch color (CSS color or hex) |
| `shape` | `"circle" \| "line" \| "square"` | No | Swatch shape; defaults to `"square"` |

---

## SearchConfig

Configures the search/filter fields shown in `SearchPanel` for a layer.

```ts
{
  fields: [
    { property: 'name',      label: 'Name',      type: 'text',     placeholder: 'Search...' },
    { property: 'continent', label: 'Continent', type: 'select',   options: ['Africa', 'Asia'] },
    { property: 'pop',       label: 'Population',type: 'number' },
    { property: 'created_at',label: 'Created',   type: 'datetime' },
  ]
}
```

**SearchField:**

| Field | Type | Required | Description |
|---|---|---|---|
| `property` | `string` | Yes | OGC API property name |
| `label` | `string` | Yes | Display label |
| `type` | `"text" \| "number" \| "select" \| "datetime"` | Yes | Input type |
| `options` | `string[]` | No | For `select` — static option list. If omitted, fetched from API queryables |
| `placeholder` | `string` | No | Input placeholder text |

---

## FilterConfig

Initial or static filter state for a layer (separate from SearchPanel runtime filters).

```ts
{
  properties: { continent: 'Asia', active: true },
  bbox: [-10, 35, 40, 70],    // [minLng, minLat, maxLng, maxLat]
  datetime: '2024-01-01T00:00:00Z',
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `properties` | `Record<string, string \| number \| boolean \| string[]>` | No | Property filters |
| `bbox` | `[number, number, number, number]` | No | Bounding box filter |
| `datetime` | `string` | No | Datetime filter (ISO 8601) |

---

## BasemapConfig

A background map style.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier |
| `label` | `string` | Yes | Display name |
| `url` | `string` (URL) | Yes | MapLibre style JSON URL |
| `thumbnail` | `string` (URL) | No | Preview image URL |

```ts
{
  id: 'carto-positron',
  label: 'CARTO Positron',
  url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  thumbnail: 'https://example.com/positron-thumb.png',
}
```

---

## UIConfig

Controls which UI panels are visible. All fields default to shown, except `showSearchPanel`.

| Field | Type | Default | Description |
|---|---|---|---|
| `showLayerPanel` | `boolean` | `true` | Show/hide `LayerPanel` |
| `showLegend` | `boolean` | `true` | Show/hide `Legend` |
| `showBasemapSwitcher` | `boolean` | `true` | Show/hide `BasemapSwitcher` |
| `showSearchPanel` | `boolean` | `false` | Show/hide `SearchPanel` |
| `showCoordinateDisplay` | `boolean` | `true` | Show/hide `CoordinateDisplay` |

---

## ViewConfig

Initial camera position for the map.

| Field | Type | Required | Range | Description |
|---|---|---|---|---|
| `latitude` | `number` | Yes | -90 to 90 | Center latitude |
| `longitude` | `number` | Yes | -180 to 180 | Center longitude |
| `zoom` | `number` | Yes | 0 to 24 | Zoom level |
| `pitch` | `number` | No (default `0`) | 0 to 85 | Tilt angle in degrees |
| `bearing` | `number` | No (default `0`) | -180 to 180 | Rotation in degrees |

---

## Validation

### `validateMapConfig(config: unknown): MapConfig`

Parses and validates a config, throwing a `ZodError` if invalid.

```ts
import { validateMapConfig } from '@ogc-maps/storybook-components/schemas';

try {
  const config = validateMapConfig(rawConfig);
  // config is fully typed as MapConfig
} catch (err) {
  // err is a ZodError with detailed issue list
}
```

### `safeValidateMapConfig(config: unknown): SafeParseReturnType<MapConfig>`

Returns a result object instead of throwing.

```ts
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';

const result = safeValidateMapConfig(rawConfig);

if (result.success) {
  console.log(result.data); // MapConfig
} else {
  console.error(result.error.issues); // ZodIssue[]
}
```

---

## Full Example

Based on the reference app (`apps/client-map-app/src/config/map-config.ts`):

```ts
import type { MapConfig } from '@ogc-maps/storybook-components/types';

export const mapConfig: MapConfig = {
  sources: [
    {
      id: 'tipg-local',
      url: 'http://localhost:8000',
      label: 'Local tipg (Natural Earth)',
      tileMatrixSetId: 'WebMercatorQuad',
    },
  ],
  layers: [
    {
      id: 'countries',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_admin_0_countries',
      label: 'Countries',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'fill',
        paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6, 'fill-outline-color': '#2c5f8a' },
      },
      legend: {
        entries: [{ label: 'Countries', color: '#4a90d9', shape: 'square' }],
      },
      search: {
        fields: [
          { property: 'name',      label: 'Country Name', type: 'text',     placeholder: 'Enter country name...' },
          { property: 'continent', label: 'Continent',    type: 'select',   options: ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'] },
          { property: 'created_at',label: 'Created At',   type: 'datetime' },
        ],
      },
    },
    {
      id: 'cities',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_populated_places',
      label: 'Cities',
      visible: true,
      dataMode: 'geojson',
      style: {
        type: 'circle',
        paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 },
      },
      legend: {
        entries: [{ label: 'Cities', color: '#e74c3c', shape: 'circle' }],
      },
    },
    {
      id: 'rivers',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_rivers_lake_centerlines',
      label: 'Rivers',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'line',
        paint: { 'line-color': '#00bcd4', 'line-width': 2, 'line-opacity': 0.8 },
      },
      legend: {
        entries: [{ label: 'Rivers', color: '#00bcd4', shape: 'line' }],
      },
    },
  ],
  basemaps: [
    { id: 'carto-positron',    label: 'CARTO Positron',    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
    { id: 'carto-dark-matter', label: 'CARTO Dark Matter', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  ],
  ui: {
    showLayerPanel: true,
    showLegend: true,
    showBasemapSwitcher: true,
    showSearchPanel: true,
    showCoordinateDisplay: true,
  },
  initialView: { latitude: 0, longitude: 0, zoom: 2, pitch: 0, bearing: 0 },
};
```
