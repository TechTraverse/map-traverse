# Hooks & Utilities Reference

All hooks and utility functions are exported from the `hooks` sub-path:

```ts
import { useOgcCollections, useOgcFeatures, fetchCollections, ... } from '@ogc-maps/storybook-components/hooks';
```

---

## Hooks

### `useOgcCollections`

Fetches the list of collections from an OGC API server.

**Signature:**

```ts
function useOgcCollections(baseUrl: string | null): UseOgcCollectionsResult
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `baseUrl` | `string \| null` | Base URL of the OGC API server. Pass `null` to skip fetching. |

**Return type:**

```ts
interface UseOgcCollectionsResult {
  collections: OgcCollection[];
  loading: boolean;
  error: Error | null;
}
```

**Behavior:**

- Fetches `GET {baseUrl}/collections?f=json` on mount and whenever `baseUrl` changes.
- Cancels the in-flight request if `baseUrl` changes or the component unmounts.
- Returns `loading: true` during the fetch; resets to `false` on success or failure.

**Example:**

```tsx
import { useOgcCollections } from '@ogc-maps/storybook-components/hooks';

function CollectionList() {
  const { collections, loading, error } = useOgcCollections('http://localhost:8000');

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>Error: {error.message}</p>;

  return (
    <ul>
      {collections.map((col) => (
        <li key={col.id}>{col.title ?? col.id}</li>
      ))}
    </ul>
  );
}
```

---

### `useOgcFeatures`

Fetches GeoJSON features from an OGC API collection with optional filtering and pagination.

**Signature:**

```ts
function useOgcFeatures(
  baseUrl: string | null,
  collection: string | null,
  options?: FetchFeaturesOptions
): UseOgcFeaturesResult
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `baseUrl` | `string \| null` | Base URL of the OGC API server. |
| `collection` | `string \| null` | Collection ID (e.g., `public.countries`). |
| `options` | `FetchFeaturesOptions` | Optional query parameters (see below). |

**`FetchFeaturesOptions`:**

| Option | Type | Description |
|---|---|---|
| `bbox` | `[number, number, number, number]` | Bounding box filter `[minLng, minLat, maxLng, maxLat]` |
| `limit` | `number` | Max features to return (default: server default) |
| `offset` | `number` | Pagination offset |
| `properties` | `string[]` | Property names to include in the response |
| `datetime` | `string` | Datetime filter (ISO 8601) |
| `filter` | `Record<string, string \| number>` | Arbitrary property equality filters |

**Return type:**

```ts
interface UseOgcFeaturesResult {
  features: GeoJsonFeature[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean; // true when more pages are available
}
```

**Pagination:**

`hasMore` is `true` when:
- The server returns `numberMatched` and `offset + features.length < numberMatched`, or
- No `numberMatched` is returned and the response contains exactly `limit` features (heuristic).

**Example:**

```tsx
import { useState } from 'react';
import { useOgcFeatures } from '@ogc-maps/storybook-components/hooks';

function FeatureList() {
  const [offset, setOffset] = useState(0);

  const { features, loading, error, hasMore } = useOgcFeatures(
    'http://localhost:8000',
    'public.countries',
    { limit: 10, offset, filter: { continent: 'Europe' } }
  );

  return (
    <div>
      {loading && <p>Loading…</p>}
      {error   && <p>Error: {error.message}</p>}
      <ul>
        {features.map((f, i) => (
          <li key={f.id ?? i}>{String(f.properties?.name ?? f.id)}</li>
        ))}
      </ul>
      {hasMore && (
        <button onClick={() => setOffset((o) => o + 10)}>Load more</button>
      )}
    </div>
  );
}
```

---

### `useCsvExport`

Exports features from an OGC API collection to a CSV file, paginating automatically.

**Signature:**

```ts
function useCsvExport(options: UseCsvExportOptions): UseCsvExportResult
```

**`UseCsvExportOptions`:**

| Option | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Base URL of the OGC API server (required) |
| `limit` | `number` | Max features to fetch in total (default: `1000`) |
| `csvOptions` | `CsvExportOptions` | Optional CSV formatting options (see below) |

**`UseCsvExportResult`:**

| Field | Type | Description |
|---|---|---|
| `exportCsv` | `(collectionId: string, filename?: string) => Promise<void>` | Async function that fetches and downloads the CSV |
| `loading` | `boolean` | `true` while the export is in progress |
| `error` | `Error \| null` | Set if the fetch or conversion fails |

**Behavior:**

- Paginates through OGC API features in batches up to 1000 until `limit` features are collected or the collection is exhausted.
- Converts features to CSV using `featuresToCsv` and triggers a browser download via `downloadCsv`.
- `filename` defaults to `{collectionId}.csv` if not provided.

**Example:**

```tsx
import { ExportButton } from '@ogc-maps/storybook-components/components/ExportButton';
import { useCsvExport } from '@ogc-maps/storybook-components/hooks';

function App() {
  const { exportCsv, loading, error } = useCsvExport({
    baseUrl: 'http://localhost:8000',
    limit: 500,
  });

  const layers = [
    { id: 'countries', label: 'Countries', collection: 'public.ne_110m_admin_0_countries' },
  ];

  return (
    <>
      {error && <p>Export failed: {error.message}</p>}
      <ExportButton
        layers={layers}
        onExport={(layer) => exportCsv(layer.collection, `${layer.label}.csv`)}
        loading={loading}
      />
    </>
  );
}
```

---

## Utility Functions

These are pure async functions with no React dependencies. They can be used server-side, in Zustand actions, or anywhere outside a component.

### `fetchCollections`

```ts
async function fetchCollections(baseUrl: string): Promise<OgcCollection[]>
```

Fetches `GET {baseUrl}/collections?f=json` and returns the `collections` array.

```ts
import { fetchCollections } from '@ogc-maps/storybook-components/hooks';

const collections = await fetchCollections('http://localhost:8000');
```

---

### `fetchFeatures`

```ts
async function fetchFeatures(
  baseUrl: string,
  collection: string,
  options?: FetchFeaturesOptions
): Promise<OgcFeatureCollection>
```

Fetches features from `GET {baseUrl}/collections/{collection}/items` with query parameters derived from `options`.

```ts
import { fetchFeatures } from '@ogc-maps/storybook-components/hooks';

const data = await fetchFeatures('http://localhost:8000', 'public.countries', {
  limit: 5,
  filter: { continent: 'Asia' },
});
console.log(data.features);
```

---

### `fetchQueryables`

```ts
async function fetchQueryables(
  baseUrl: string,
  collection: string
): Promise<OgcQueryables>
```

Fetches the queryable schema for a collection from `GET {baseUrl}/collections/{collection}/queryables?f=json`. Used internally by `SearchPanel` to populate dynamic select options.

```ts
import { fetchQueryables } from '@ogc-maps/storybook-components/hooks';

const queryables = await fetchQueryables('http://localhost:8000', 'public.countries');
// queryables.properties['continent'].enum → ['Africa', 'Asia', ...]
```

---

### `getTileJsonUrl`

```ts
function getTileJsonUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Returns the TileJSON URL for a collection's vector tiles. Use this with MapLibre's `addSource` to register a tile source via metadata URL.

```ts
import { getTileJsonUrl } from '@ogc-maps/storybook-components/hooks';

const url = getTileJsonUrl('http://localhost:8000', 'public.countries');
// → 'http://localhost:8000/collections/public.countries/tiles/WebMercatorQuad/tilejson.json'
```

---

### `getVectorTileUrl`

```ts
function getVectorTileUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Returns a MapLibre-compatible tile URL template with `{z}/{x}/{y}` placeholders.

```ts
import { getVectorTileUrl } from '@ogc-maps/storybook-components/hooks';

const tileUrl = getVectorTileUrl('http://localhost:8000', 'public.countries');
// → 'http://localhost:8000/collections/public.countries/tiles/WebMercatorQuad/{z}/{x}/{y}'
```

---

### `getFilteredVectorTileUrl`

```ts
function getFilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  filter?: Record<string, string | number>,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Same as `getVectorTileUrl` but appends property filter query parameters. When `filter` is empty or undefined, returns a plain tile URL.

```ts
import { getFilteredVectorTileUrl } from '@ogc-maps/storybook-components/hooks';

const url = getFilteredVectorTileUrl(
  'http://localhost:8000',
  'public.countries',
  { continent: 'Europe' }
);
// → '.../tiles/WebMercatorQuad/{z}/{x}/{y}?continent=Europe'
```

---

### `featuresToCsv`

```ts
function featuresToCsv(features: GeoJsonFeature[], options?: CsvExportOptions): string
```

Converts an array of GeoJSON features to a CSV string.

**`CsvExportOptions`:**

| Option | Type | Description |
|---|---|---|
| `fields` | `string[]` | Property keys to include as columns; auto-discovers all keys if omitted |
| `includeGeometry` | `boolean` | Append a `geometry` column with serialised GeoJSON geometry (default: `false`) |
| `delimiter` | `string` | Column delimiter (default: `','`) |

**Behavior:**

- Returns an empty string when `features` is empty.
- Auto-discovers property keys from all features when `fields` is not specified.
- Properly escapes values containing quotes, the delimiter, or newlines using RFC 4180 quoting.

```ts
import { featuresToCsv } from '@ogc-maps/storybook-components/hooks';

const csv = featuresToCsv(features, { fields: ['name', 'continent'], delimiter: ';' });
```

---

### `downloadCsv`

```ts
function downloadCsv(csv: string, filename: string): void
```

Creates a `Blob` from a CSV string and triggers a browser file download.

```ts
import { downloadCsv } from '@ogc-maps/storybook-components/hooks';

downloadCsv(csv, 'countries.csv');
```

---

## Types

These types are re-exported from the `hooks` sub-path for convenience:

```ts
import type {
  // OGC API response types
  OgcCollection,
  OgcCollectionsResponse,
  GeoJsonFeature,
  OgcFeatureCollection,
  OgcQueryables,
  QueryableProperty,
  FetchFeaturesOptions,
  // Config types
  OgcApiSource,
  LayerConfig,
  MapConfig,
  UIConfig,
  ViewConfig,
  StyleConfig,
  FilterConfig,
  LegendConfig,
  SearchConfig,
  SearchField,
  // CSV export
  CsvExportOptions,
} from '@ogc-maps/storybook-components/hooks';
```
