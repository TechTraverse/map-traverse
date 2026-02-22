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
| `cql2Filter` | `CQL2Expression` | CQL2 JSON filter expression. When provided, takes precedence over `filter` |

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
| `exportCsv` | `(collectionId: string, filename?: string, cql2Filter?: CQL2Expression) => Promise<void>` | Async function that fetches and downloads the CSV; pass a CQL2 filter to export only filtered features |
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

### `fetchDistinctValues`

```ts
async function fetchDistinctValues(
  baseUrl: string,
  collection: string,
  property: string,
  options?: { query?: string; limit?: number }
): Promise<string[]>
```

Fetches distinct non-null string values for a property in an OGC API collection. When `query` is provided, filters values using a CQL2 `like` expression (`%query%`). Useful for populating autocomplete dropdowns.

| Option | Type | Description |
|---|---|---|
| `query` | `string` | Substring to filter values by (case-insensitive via `like`) |
| `limit` | `number` | Max values to return (default: 50) |

```ts
import { fetchDistinctValues } from '@ogc-maps/storybook-components/hooks';

const continents = await fetchDistinctValues('http://localhost:8000', 'public.countries', 'continent');
// → ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']

const matching = await fetchDistinctValues(
  'http://localhost:8000', 'public.countries', 'name', { query: 'Ger' }
);
// → ['Germany']
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

### `getCql2FilteredVectorTileUrl`

```ts
function getCql2FilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  cql2Filter?: CQL2Expression | null,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Builds a MapLibre-compatible tile URL template with a CQL2 JSON filter applied via `filter-lang=cql2-json` query parameters. When `cql2Filter` is null/undefined, returns a plain tile URL without filter parameters.

**Important:** When using this with react-map-gl, also change the React `key` and MapLibre Source `id` whenever the filter changes — MapLibre does not re-fetch tiles when the `tiles` prop updates on an existing Source.

```ts
import { getCql2FilteredVectorTileUrl } from '@ogc-maps/storybook-components/hooks';

const url = getCql2FilteredVectorTileUrl(
  'http://localhost:8000',
  'public.countries',
  { op: '=', args: [{ property: 'continent' }, 'Europe'] }
);
// → '.../tiles/WebMercatorQuad/{z}/{x}/{y}?filter-lang=cql2-json&filter=...'
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

## CQL2 Builder Functions

The library provides a full set of CQL2 JSON builder functions for constructing OGC Common Query Language 2 filter expressions. All functions return `CQL2Expression` objects suitable for JSON serialization.

```ts
import { eq, and, between, like, fromStructuredFilters } from '@ogc-maps/storybook-components/hooks';
```

### Comparison Operators

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `eq` | `(property, value) → CQL2Expression` | `=` | Equal to |
| `neq` | `(property, value) → CQL2Expression` | `<>` | Not equal to |
| `gt` | `(property, value) → CQL2Expression` | `>` | Greater than |
| `gte` | `(property, value) → CQL2Expression` | `>=` | Greater than or equal |
| `lt` | `(property, value) → CQL2Expression` | `<` | Less than |
| `lte` | `(property, value) → CQL2Expression` | `<=` | Less than or equal |

`value` accepts `string | number | boolean | CQL2Date | CQL2Timestamp` (comparison operators that involve ordering accept `number | CQL2Date | CQL2Timestamp`).

### Range / Membership

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `between` | `(property, lower, upper) → CQL2Expression` | `between` | Value in numeric range |
| `inList` | `(property, values[]) → CQL2Expression` | `in` | Value in a list |
| `like` | `(property, pattern) → CQL2Expression` | `like` | Pattern match (`%` wildcard) |
| `isNull` | `(property) → CQL2Expression` | `isNull` | Property is null |

### Logical Operators

| Function | Signature | Returns | Description |
|---|---|---|---|
| `and` | `(...expressions) → CQL2Expression \| null` | Combined or single expression, `null` if empty | Combines with AND; filters out null/undefined |
| `or` | `(...expressions) → CQL2Expression \| null` | Combined or single expression, `null` if empty | Combines with OR; filters out null/undefined |
| `not` | `(expression) → CQL2Expression` | Negated expression | Logical NOT |

### Temporal Operators

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `tAfter` | `(property, dateOrTimestamp) → CQL2Expression` | `t_after` | Property is after the given date/timestamp |
| `tBefore` | `(property, dateOrTimestamp) → CQL2Expression` | `t_before` | Property is before the given date/timestamp |
| `tDuring` | `(property, start, end) → CQL2Expression` | `t_during` | Property falls within a temporal interval |

Date/timestamp values use `CQL2Date` (`{ date: "2024-01-01" }`) or `CQL2Timestamp` (`{ timestamp: "2024-01-01T00:00:00Z" }`).

### Conversion Helpers

#### `fromStructuredFilters`

```ts
function fromStructuredFilters(
  filters: Record<string, SearchFilterValue>,
  fields: SearchField[]
): CQL2Expression | null
```

High-level converter that transforms a `SearchFilterValues` record (as produced by `SearchPanel`) into a CQL2 expression. Uses the `fields` config array to determine the correct operator per field type. Returns `null` if no active filters remain.

```ts
import { fromStructuredFilters } from '@ogc-maps/storybook-components/hooks';

const cql2 = fromStructuredFilters(
  { continent: 'Europe', pop: { min: 1000000, max: 50000000 } },
  layer.search.fields
);
// → { op: 'and', args: [{ op: '=', args: [{ property: 'continent' }, 'Europe'] }, { op: 'between', args: [{ property: 'pop' }, 1000000, 50000000] }] }
```

#### `fromSimpleFilters`

```ts
function fromSimpleFilters(filters: Record<string, string | number>): CQL2Expression | null
```

Converts a simple key-value record to CQL2 equality expressions combined with AND. Returns `null` if the record is empty.

#### `serializeCql2`

```ts
function serializeCql2(expr: CQL2Expression): string
```

Serializes a CQL2 expression to a JSON string for use as a query parameter.

### Usage Examples

```ts
import { eq, gt, like, and, or, between, tDuring } from '@ogc-maps/storybook-components/hooks';

// Simple equality
const filter1 = eq('continent', 'Europe');

// Numeric range
const filter2 = between('population', 1_000_000, 50_000_000);

// Pattern matching
const filter3 = like('name', '%land%');

// Temporal range
const filter4 = tDuring('created_at', { timestamp: '2024-01-01T00:00:00Z' }, { timestamp: '2024-12-31T23:59:59Z' });

// Combine with logical operators
const combined = and(filter1, filter2, or(filter3, filter4));
// → { op: 'and', args: [filter1, filter2, { op: 'or', args: [filter3, filter4] }] }
```

---

## CQL2 Types

```ts
import type {
  CQL2Expression,
  CQL2PropertyRef,
  CQL2Date,
  CQL2Timestamp,
  CQL2Interval,
} from '@ogc-maps/storybook-components/hooks';
```

| Type | Shape | Description |
|---|---|---|
| `CQL2Expression` | `{ op: string; args: unknown[] }` | A CQL2 expression node |
| `CQL2PropertyRef` | `{ property: string }` | A reference to a feature property |
| `CQL2Date` | `{ date: string }` | ISO 8601 date literal (`"YYYY-MM-DD"`) |
| `CQL2Timestamp` | `{ timestamp: string }` | ISO 8601 timestamp literal (`"YYYY-MM-DDTHH:MM:SSZ"`) |
| `CQL2Interval` | `{ interval: [string, string] }` | Temporal interval with start/end strings |

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
  // Search field sub-types
  TextSearchField,
  NumberSearchField,
  DatetimeSearchField,
  SelectSearchField,
  SearchFilterValue,
  SearchFilterValues,
  // CQL2 filter
  CQL2Expression,
  CQL2PropertyRef,
  CQL2Date,
  CQL2Timestamp,
  CQL2Interval,
  // CSV export
  CsvExportOptions,
} from '@ogc-maps/storybook-components/hooks';
```
