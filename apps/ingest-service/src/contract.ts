/**
 * Runtime guards for the cross-service contract. The admin-app mocks the sidecar
 * in its route tests; `assertIngestResponse` is the single source of truth for
 * the success shape, exercised both by the always-on `contract.test.ts` and by
 * the live `ingest.integration.test.ts`, so the mock can't drift from reality.
 */
import type { IngestResponse, NeedsLayerResponse } from './types.js';

export function isIngestResponse(v: unknown): v is IngestResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.table === 'string' &&
    o.schema === 'uploads' &&
    typeof o.format === 'string' &&
    (typeof o.geometryType === 'string' || o.geometryType === null) &&
    typeof o.srid === 'number' &&
    typeof o.featureCount === 'number' &&
    typeof o.crsAssumed === 'boolean' &&
    (o.bbox === null || (Array.isArray(o.bbox) && o.bbox.length === 4 && o.bbox.every(n => typeof n === 'number')))
  );
}

export function assertIngestResponse(v: unknown): asserts v is IngestResponse {
  if (!isIngestResponse(v)) {
    throw new Error(`Response does not satisfy IngestResponse: ${JSON.stringify(v)}`);
  }
}

export function isNeedsLayerResponse(v: unknown): v is NeedsLayerResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.needsLayer === true &&
    typeof o.error === 'string' &&
    Array.isArray(o.layers) &&
    o.layers.every(l => typeof l === 'object' && l !== null && typeof (l as { name?: unknown }).name === 'string')
  );
}
