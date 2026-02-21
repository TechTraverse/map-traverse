// OGC API utility functions - pure fetch functions with no React dependencies

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
}

/** OGC API queryables response (schemajson format). */
export interface OgcQueryables {
  $id?: string;
  $schema?: string;
  type: string;
  title?: string;
  properties: Record<string, QueryableProperty>;
}

/** Options for fetchFeatures. */
export interface FetchFeaturesOptions {
  bbox?: [number, number, number, number];
  limit?: number;
  offset?: number;
  properties?: string[];
  datetime?: string;
  filter?: Record<string, string | number>;
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
  if (options.filter) {
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
