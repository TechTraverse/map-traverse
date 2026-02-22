// OGC API utility functions - pure fetch functions with no React dependencies
import type { CQL2Expression } from './cql2';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single OGC API collection. */
export interface OgcCollection {
  id: string;
  title?: string;
  description?: string;
  links: Array<{ href: string; rel: string; type?: string; title?: string }>;
  extent?: {
    spatial?: { bbox?: number[][]; crs?: string };
    temporal?: { interval?: Array<[string | null, string | null]> };
  };
  itemType?: string;
}

/** The OGC API /collections response. */
export interface OgcCollectionsResponse {
  collections: OgcCollection[];
  links: Array<{ href: string; rel: string; type?: string }>;
}

/** A GeoJSON Feature. */
export interface GeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry: Record<string, unknown>;
  properties: Record<string, unknown> | null;
}

/** A GeoJSON FeatureCollection with optional OGC numberMatched / numberReturned. */
export interface OgcFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  numberMatched?: number;
  numberReturned?: number;
  links?: Array<{ href: string; rel: string; type?: string }>;
}

/** A single queryable property definition (OGC API schemajson format). */
export interface QueryableProperty {
  name?: string;
  type?: string;
  $ref?: string;
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

/** OGC API queryables response (schemajson format). */
export interface OgcQueryables {
  $id?: string;
  $schema?: string;
  type: string;
  title?: string;
  properties: Record<string, QueryableProperty>;
}

/** OGC API conformance response. */
export interface OgcConformance {
  conformsTo: string[];
}

/** TileJSON response for a vector tile layer. */
export interface TileJson {
  tilejson: string;
  tiles: string[];
  name?: string;
  description?: string;
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  vector_layers?: Array<{
    id: string;
    description?: string;
    fields?: Record<string, string>;
  }>;
}

/** Options for fetchFeatures. */
export interface FetchFeaturesOptions {
  bbox?: [number, number, number, number];
  limit?: number;
  offset?: number;
  properties?: string[];
  datetime?: string;
  /** @deprecated Use cql2Filter instead. Simple key-value equality filters. */
  filter?: Record<string, string | number>;
  /** CQL2 JSON filter expression. When provided, takes precedence over filter. */
  cql2Filter?: CQL2Expression;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OGC API request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the list of collections from an OGC API endpoint.
 */
export async function fetchCollections(baseUrl: string): Promise<OgcCollection[]> {
  const url = `${stripTrailingSlash(baseUrl)}/collections?f=json`;
  const data = await fetchJson<OgcCollectionsResponse>(url);
  return data.collections;
}

/**
 * Fetch GeoJSON features from an OGC API collection.
 */
export async function fetchFeatures(
  baseUrl: string,
  collection: string,
  options: FetchFeaturesOptions = {},
): Promise<OgcFeatureCollection> {
  const base = stripTrailingSlash(baseUrl);
  const params = new URLSearchParams({ f: 'geojson' });

  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.offset != null) params.set('offset', String(options.offset));
  if (options.bbox) params.set('bbox', options.bbox.join(','));
  if (options.properties?.length) params.set('properties', options.properties.join(','));
  if (options.datetime) params.set('datetime', options.datetime);
  if (options.cql2Filter) {
    params.set('filter-lang', 'cql2-json');
    params.set('filter', JSON.stringify(options.cql2Filter));
  } else if (options.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      params.set(key, String(value));
    }
  }

  const url = `${base}/collections/${encodeURIComponent(collection)}/items?${params}`;
  return fetchJson<OgcFeatureCollection>(url);
}

/**
 * Fetch queryable properties for a collection.
 */
export async function fetchQueryables(
  baseUrl: string,
  collection: string,
): Promise<OgcQueryables> {
  const base = stripTrailingSlash(baseUrl);
  const url = `${base}/collections/${encodeURIComponent(collection)}/queryables?f=schemajson`;
  return fetchJson<OgcQueryables>(url);
}

/**
 * Fetch metadata for a single OGC API collection.
 */
export async function fetchCollectionDetail(
  baseUrl: string,
  collectionId: string,
): Promise<OgcCollection> {
  const base = stripTrailingSlash(baseUrl);
  const url = `${base}/collections/${encodeURIComponent(collectionId)}?f=json`;
  return fetchJson<OgcCollection>(url);
}

/**
 * Fetch the OGC API conformance declaration to discover server capabilities.
 */
export async function fetchConformance(baseUrl: string): Promise<OgcConformance> {
  const url = `${stripTrailingSlash(baseUrl)}/conformance?f=json`;
  return fetchJson<OgcConformance>(url);
}

/**
 * Fetch the TileJSON document for a collection's vector tiles.
 */
export async function fetchTileJson(
  baseUrl: string,
  collection: string,
  tileMatrixSetId: string = 'WebMercatorQuad',
): Promise<TileJson> {
  const url = getTileJsonUrl(baseUrl, collection, tileMatrixSetId);
  return fetchJson<TileJson>(url);
}

/**
 * Fetch the total feature count for a collection (optionally filtered).
 * Uses limit=0 and reads `numberMatched` from the response.
 * Returns null if the server does not report numberMatched.
 */
export async function fetchFeatureCount(
  baseUrl: string,
  collection: string,
  options: Omit<FetchFeaturesOptions, 'limit' | 'offset' | 'properties'> = {},
): Promise<number | null> {
  const data = await fetchFeatures(baseUrl, collection, {
    ...options,
    limit: 0,
  });
  return data.numberMatched ?? null;
}

/**
 * Build the TileJSON URL for a collection's vector tiles.
 */
export function getTileJsonUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId: string = 'WebMercatorQuad',
): string {
  const base = stripTrailingSlash(baseUrl);
  return `${base}/collections/${encodeURIComponent(collection)}/tiles/${encodeURIComponent(tileMatrixSetId)}/tilejson.json`;
}

/**
 * Build the vector tile URL template for a collection.
 * Returns a URL with `{z}/{x}/{y}` placeholders suitable for MapLibre.
 */
export function getVectorTileUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId: string = 'WebMercatorQuad',
): string {
  const base = stripTrailingSlash(baseUrl);
  return `${base}/collections/${encodeURIComponent(collection)}/tiles/${encodeURIComponent(tileMatrixSetId)}/{z}/{x}/{y}`;
}

/**
 * Build a vector tile URL template with optional property filters applied as query parameters.
 * Returns a URL with `{z}/{x}/{y}` placeholders suitable for MapLibre.
 */
export function getFilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  filter?: Record<string, string | number>,
  tileMatrixSetId: string = 'WebMercatorQuad',
): string {
  const base = stripTrailingSlash(baseUrl);
  const tileUrl = `${base}/collections/${encodeURIComponent(collection)}/tiles/${encodeURIComponent(tileMatrixSetId)}/{z}/{x}/{y}`;
  if (!filter || Object.keys(filter).length === 0) return tileUrl;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    params.set(key, String(value));
  }
  return `${tileUrl}?${params}`;
}

/**
 * Fetch distinct non-null string values for a property in an OGC API collection.
 * Optionally filters by a substring query using a CQL2 `like` filter.
 */
export async function fetchDistinctValues(
  baseUrl: string,
  collection: string,
  property: string,
  options?: { query?: string; limit?: number },
): Promise<string[]> {
  const cql2Filter: CQL2Expression | undefined =
    options?.query
      ? { op: 'like', args: [{ property }, `%${options.query}%`] }
      : undefined;

  const data = await fetchFeatures(baseUrl, collection, {
    properties: [property],
    limit: options?.limit ?? 50,
    cql2Filter,
  });

  const seen = new Set<string>();
  for (const feature of data.features) {
    const val = feature.properties?.[property];
    if (val != null && typeof val === 'string') {
      seen.add(val);
    }
  }
  return Array.from(seen).sort();
}

/**
 * Build a vector tile URL template with a CQL2 JSON filter applied.
 * Returns a URL with `{z}/{x}/{y}` placeholders suitable for MapLibre.
 */
export function getCql2FilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  cql2Filter?: CQL2Expression | null,
  tileMatrixSetId: string = 'WebMercatorQuad',
): string {
  const base = stripTrailingSlash(baseUrl);
  const tileUrl = `${base}/collections/${encodeURIComponent(collection)}/tiles/${encodeURIComponent(tileMatrixSetId)}/{z}/{x}/{y}`;
  if (!cql2Filter) return tileUrl;

  const params = new URLSearchParams({
    'filter-lang': 'cql2-json',
    filter: JSON.stringify(cql2Filter),
  });
  return `${tileUrl}?${params}`;
}
