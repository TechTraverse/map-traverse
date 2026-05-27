/**
 * Client-side source inspection.
 * Mirrors server/inspect.ts logic but runs in the browser,
 * so the user can enter browser-reachable URLs (e.g. http://localhost:8000).
 * Supports OGC API, TileJSON, and XYZ tile sources.
 */
import type {
  InspectionResult,
  CollectionMeta,
  QueryableMeta,
} from '../../server/inspect.js';
import { appendAuth, authHeaders, stripTrailingSlash, detectTileSourceType } from '@ogc-maps/storybook-components/utils';
import type { SourceAuth } from '@ogc-maps/storybook-components/types';

const REQUEST_TIMEOUT_MS = 10_000;
const COLLECTION_BATCH_SIZE = 5;

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

async function fetchJson(url: string, auth?: SourceAuth): Promise<unknown> {
  const res = await fetch(appendAuth(url, auth), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/json', ...authHeaders(auth) },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return 'Request timed out';
    }
    return err.message;
  }
  return String(err);
}

// --- Inspection steps ---

async function fetchLanding(
  baseUrl: string,
  auth?: SourceAuth,
): Promise<InspectionResult['landing']> {
  try {
    const data = (await fetchJson(`${baseUrl}?f=json`, auth)) as Record<
      string,
      unknown
    >;
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      description:
        typeof data.description === 'string' ? data.description : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchConformance(
  baseUrl: string,
  auth?: SourceAuth,
): Promise<{ conformance: string[] | null; error?: string }> {
  try {
    const data = (await fetchJson(`${baseUrl}/conformance?f=json`, auth)) as Record<
      string,
      unknown
    >;
    const conformsTo = data.conformsTo;
    if (Array.isArray(conformsTo)) {
      return { conformance: conformsTo as string[] };
    }
    return {
      conformance: null,
      error: 'Unexpected conformance response format',
    };
  } catch (err) {
    return { conformance: null, error: errorMessage(err) };
  }
}

interface RawCollection {
  id: string;
  title?: string;
  description?: string;
  extent?: CollectionMeta['extent'];
  itemType?: string;
}

async function fetchCollectionsList(
  baseUrl: string,
  auth?: SourceAuth,
): Promise<{ collections: RawCollection[]; error?: string }> {
  try {
    const data = (await fetchJson(`${baseUrl}/collections?f=json`, auth)) as Record<
      string,
      unknown
    >;
    const collections = data.collections;
    if (!Array.isArray(collections)) {
      return {
        collections: [],
        error: 'Unexpected collections response format',
      };
    }
    return {
      collections: collections.map((c: Record<string, unknown>) => ({
        id: String(c.id ?? ''),
        title: typeof c.title === 'string' ? c.title : undefined,
        description:
          typeof c.description === 'string' ? c.description : undefined,
        extent: c.extent as CollectionMeta['extent'],
        itemType: typeof c.itemType === 'string' ? c.itemType : undefined,
      })),
    };
  } catch (err) {
    return { collections: [], error: errorMessage(err) };
  }
}

async function fetchItemCount(
  baseUrl: string,
  collectionId: string,
  auth?: SourceAuth,
): Promise<{ count: number | null; error?: string }> {
  try {
    const url = `${baseUrl}/collections/${encodeURIComponent(collectionId)}/items?limit=0`;
    const res = await fetch(appendAuth(url, auth), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/geo+json', ...authHeaders(auth) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as Record<string, unknown>;
    const count = data.numberMatched ?? data.numberReturned;
    if (typeof count === 'number') {
      return { count };
    }
    return { count: null };
  } catch (err) {
    return { count: null, error: errorMessage(err) };
  }
}

async function fetchQueryables(
  baseUrl: string,
  collectionId: string,
  auth?: SourceAuth,
): Promise<{ queryables: QueryableMeta[] | null; error?: string }> {
  try {
    const data = (await fetchJson(
      `${baseUrl}/collections/${encodeURIComponent(collectionId)}/queryables`,
      auth,
    )) as Record<string, unknown>;
    const properties = data.properties;
    if (!properties || typeof properties !== 'object') {
      return { queryables: null };
    }
    const result: QueryableMeta[] = [];
    for (const [name, prop] of Object.entries(
      properties as Record<string, Record<string, unknown>>,
    )) {
      result.push({
        name,
        type: typeof prop.type === 'string' ? prop.type : undefined,
        title: typeof prop.title === 'string' ? prop.title : undefined,
        description:
          typeof prop.description === 'string' ? prop.description : undefined,
        format: typeof prop.format === 'string' ? prop.format : undefined,
        enum: Array.isArray(prop.enum) ? (prop.enum as string[]) : undefined,
        minimum: typeof prop.minimum === 'number' ? prop.minimum : undefined,
        maximum: typeof prop.maximum === 'number' ? prop.maximum : undefined,
      });
    }
    return { queryables: result };
  } catch (err) {
    return { queryables: null, error: errorMessage(err) };
  }
}

async function discoverRefreshUrl(
  baseUrl: string,
  auth?: SourceAuth,
): Promise<string | undefined> {
  try {
    const spec = (await fetchJson(`${baseUrl}/openapi.json`, auth)) as {
      paths?: Record<string, unknown>;
    };
    const paths = spec.paths;
    if (paths && typeof paths === 'object' && ('/refresh' in paths || '/refresh/' in paths)) {
      return `${baseUrl}/refresh`;
    }
  } catch {
    // OpenAPI spec unavailable or unparseable — no refresh endpoint
  }
  return undefined;
}

// --- Main client-side inspection ---

async function inspectOgcSourceClientSide(
  url: string,
  auth?: SourceAuth,
): Promise<InspectionResult> {
  const baseUrl = stripTrailingSlash(normalizeUrl(url));
  const errors: string[] = [];

  const [landing, conformanceResult, collectionsResult, refreshUrl] = await Promise.all([
    fetchLanding(baseUrl, auth),
    fetchConformance(baseUrl, auth),
    fetchCollectionsList(baseUrl, auth),
    discoverRefreshUrl(baseUrl, auth),
  ]);

  if (collectionsResult.error) {
    errors.push(`Collections: ${collectionsResult.error}`);
  }

  const collections: CollectionMeta[] = [];
  const rawCollections = collectionsResult.collections;

  for (let i = 0; i < rawCollections.length; i += COLLECTION_BATCH_SIZE) {
    const batch = rawCollections.slice(i, i + COLLECTION_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (col) => {
        const [countResult, queryablesResult] = await Promise.all([
          fetchItemCount(baseUrl, col.id, auth),
          fetchQueryables(baseUrl, col.id, auth),
        ]);
        const meta: CollectionMeta = {
          id: col.id,
          title: col.title,
          description: col.description,
          itemCount: countResult.count,
          extent: col.extent,
          itemType: col.itemType,
          queryables: queryablesResult.queryables,
        };
        if (countResult.error) meta.itemCountError = countResult.error;
        if (queryablesResult.error)
          meta.queryablesError = queryablesResult.error;
        return meta;
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        collections.push(result.value);
      } else {
        errors.push(`Collection batch error: ${errorMessage(result.reason)}`);
      }
    }
  }

  return {
    landing,
    conformance: conformanceResult.conformance,
    conformanceError: conformanceResult.error,
    collections,
    inspectedAt: new Date().toISOString(),
    errors,
    refreshUrl,
  };
}

async function inspectTileJsonSourceClientSide(
  url: string,
  auth?: SourceAuth,
): Promise<InspectionResult> {
  const normalizedUrl = normalizeUrl(url);
  try {
    const data = (await fetchJson(normalizedUrl, auth)) as Record<string, unknown>;
    const tiles = data.tiles;
    if (!Array.isArray(tiles) || tiles.length === 0) {
      return {
        landing: null,
        conformance: null,
        collections: [],
        inspectedAt: new Date().toISOString(),
        errors: ['Invalid TileJSON: missing tiles array'],
      };
    }
    return {
      landing: {
        title: typeof data.name === 'string' ? data.name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
      },
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [],
      tileJson: {
        tilejson: typeof data.tilejson === 'string' ? data.tilejson : '',
        tiles: tiles as string[],
        name: typeof data.name === 'string' ? data.name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        minzoom: typeof data.minzoom === 'number' ? data.minzoom : undefined,
        maxzoom: typeof data.maxzoom === 'number' ? data.maxzoom : undefined,
        bounds: Array.isArray(data.bounds) ? data.bounds as [number, number, number, number] : undefined,
        center: Array.isArray(data.center) ? data.center as [number, number, number] : undefined,
      },
    };
  } catch (err) {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [`TileJSON fetch failed: ${errorMessage(err)}`],
    };
  }
}

export async function inspectSourceClientSide(
  url: string,
  auth?: SourceAuth,
): Promise<InspectionResult> {
  const sourceType = detectTileSourceType(url);

  if (sourceType === 'tilejson') {
    return inspectTileJsonSourceClientSide(url, auth);
  }

  if (sourceType === 'xyz') {
    // XYZ tile URLs have no metadata to inspect
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [],
    };
  }

  if (sourceType === 'style') {
    return {
      landing: null,
      conformance: null,
      collections: [],
      inspectedAt: new Date().toISOString(),
      errors: [
        'Style URLs are not valid as imagery sources. Use the Basemaps tab → "Style URL" mode instead.',
      ],
    };
  }

  return inspectOgcSourceClientSide(url, auth);
}
