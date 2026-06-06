import { describe, it, expect } from 'vitest';
import { isIngestResponse, isNeedsLayerResponse, assertIngestResponse } from './contract.js';
import type { IngestResponse, NeedsLayerResponse } from './types.js';

const valid: IngestResponse = {
  table: 'parcels',
  schema: 'uploads',
  geometryType: 'MULTIPOLYGON',
  srid: 4326,
  featureCount: 42,
  bbox: [-180, -90, 180, 90],
  crsAssumed: false,
};

describe('IngestResponse contract', () => {
  it('accepts a well-formed response', () => {
    expect(isIngestResponse(valid)).toBe(true);
    expect(() => assertIngestResponse(valid)).not.toThrow();
  });

  it('accepts null geometryType and null bbox', () => {
    expect(isIngestResponse({ ...valid, geometryType: null, bbox: null })).toBe(true);
  });

  it('rejects wrong schema, missing fields, and bad bbox', () => {
    expect(isIngestResponse({ ...valid, schema: 'public' })).toBe(false);
    expect(isIngestResponse({ ...valid, srid: '4326' })).toBe(false);
    expect(isIngestResponse({ ...valid, bbox: [1, 2, 3] })).toBe(false);
    expect(isIngestResponse({ ...valid, crsAssumed: undefined })).toBe(false);
    expect(isIngestResponse(null)).toBe(false);
  });
});

describe('NeedsLayerResponse contract', () => {
  it('accepts a multi-layer response', () => {
    const r: NeedsLayerResponse = {
      error: 'pick a layer',
      needsLayer: true,
      layers: [{ name: 'roads' }, { name: 'rivers', geometryType: 'LINESTRING' }],
    };
    expect(isNeedsLayerResponse(r)).toBe(true);
  });

  it('rejects non-multi-layer payloads', () => {
    expect(isNeedsLayerResponse({ error: 'x' })).toBe(false);
    expect(isNeedsLayerResponse({ ...valid })).toBe(false);
  });
});
