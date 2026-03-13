/**
 * Client-side OGC API source inspection.
 * Mirrors server/inspect.ts logic but runs in the browser,
 * so the user can enter browser-reachable URLs (e.g. http://localhost:8000).
 */
import type {
  InspectionResult,
  CollectionMeta,
  QueryableMeta,
} from '../../server/inspect.js';

const REQUEST_TIMEOUT_MS = 10_000;
const COLLECTION_BATCH_SIZE = 5;

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
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
): Promise<InspectionResult['landing']> {
  try {
    const data = (await fetchJson(`${baseUrl}?f=json`)) as Record<
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
): Promise<{ conformance: string[] | null; error?: string }> {
  try {
    const data = (await fetchJson(`${baseUrl}/conformance?f=json`)) as Record<
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
): Promise<{ collections: RawCollection[]; error?: string }> {
  try {
    const data = (await fetchJson(`${baseUrl}/collections?f=json`)) as Record<
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
): Promise<{ count: number | null; error?: string }> {
  try {
    const url = `${baseUrl}/collections/${encodeURIComponent(collectionId)}/items?limit=0`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/geo+json' },
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
): Promise<{ queryables: QueryableMeta[] | null; error?: string }> {
  try {
    const data = (await fetchJson(
      `${baseUrl}/collections/${encodeURIComponent(collectionId)}/queryables`,
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

// --- Main client-side inspection ---

export async function inspectSourceClientSide(
  url: string,
): Promise<InspectionResult> {
  const baseUrl = stripTrailingSlash(normalizeUrl(url));
  const errors: string[] = [];

  const [landing, conformanceResult, collectionsResult] = await Promise.all([
    fetchLanding(baseUrl),
    fetchConformance(baseUrl),
    fetchCollectionsList(baseUrl),
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
          fetchItemCount(baseUrl, col.id),
          fetchQueryables(baseUrl, col.id),
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
  };
}
