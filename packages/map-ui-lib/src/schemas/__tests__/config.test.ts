import { describe, it, expect } from 'vitest';
import { LayerConfigSchema } from '../config';

describe('LayerConfigSchema backward-compat preprocess', () => {
  const base = {
    id: 'test-layer',
    sourceId: 'source-1',
    collection: 'my-collection',
    label: 'Test Layer',
    dataMode: 'vector-tiles' as const,
  };

  it('migrates style → styles on parse', () => {
    const input = {
      ...base,
      style: {
        type: 'fill',
        paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.5 },
      },
    };
    const result = LayerConfigSchema.parse(input);
    expect((result as any).style).toBeUndefined();
    expect(result.styles).toHaveLength(1);
    expect(result.styles![0].type).toBe('fill');
  });

  it('passes through already-migrated styles untouched', () => {
    const input = {
      ...base,
      styles: [
        { type: 'fill', paint: { 'fill-color': '#0000ff', 'fill-opacity': 1 } },
        { type: 'circle', paint: { 'circle-color': '#ff0000', 'circle-radius': 5, 'circle-opacity': 1 } },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles).toHaveLength(2);
  });

  it('handles style: undefined → styles: undefined', () => {
    const input = { ...base, style: undefined };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles).toBeUndefined();
  });

  it('parses geometryFilter on style entries', () => {
    const input = {
      ...base,
      styles: [
        {
          type: 'fill',
          paint: { 'fill-color': '#0000ff', 'fill-opacity': 1 },
          geometryFilter: ['Polygon', 'MultiPolygon'],
        },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles![0].geometryFilter).toEqual(['Polygon', 'MultiPolygon']);
  });
});
