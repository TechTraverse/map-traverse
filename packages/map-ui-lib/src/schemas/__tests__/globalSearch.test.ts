import { describe, it, expect } from 'vitest';
import {
  GlobalSearchConfigSchema,
  GlobalSearchLayerConfigSchema,
  GlobalSearchPropertySchema,
  MapConfigSchema,
  UIConfigSchema,
} from '../config';

const baseMapConfig = {
  sources: [
    {
      id: 'src-1',
      url: 'https://example.com/ogc',
    },
  ],
  layers: [
    {
      id: 'layer-1',
      sourceId: 'src-1',
      collection: 'my-collection',
      label: 'Test Layer',
      dataMode: 'vector-tiles' as const,
    },
  ],
  basemaps: [
    {
      id: 'osm',
      label: 'OSM',
      url: 'https://example.com/style.json',
    },
  ],
  initialView: {
    latitude: 0,
    longitude: 0,
    zoom: 2,
  },
};

describe('GlobalSearchConfigSchema', () => {
  it('populates defaults from empty input', () => {
    const result = GlobalSearchConfigSchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.maxResultsPerLayer).toBe(10);
    expect(result.debounceMs).toBe(250);
    expect(result.minQueryLength).toBe(2);
    expect(result.position).toBe('top-left');
    expect(result.width).toBe('md');
    expect(result.layers).toEqual([]);
  });

  it('accepts every position and width preset', () => {
    for (const position of [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const) {
      expect(GlobalSearchConfigSchema.parse({ position }).position).toBe(position);
    }
    for (const width of ['sm', 'md', 'lg'] as const) {
      expect(GlobalSearchConfigSchema.parse({ width }).width).toBe(width);
    }
  });

  it('rejects an unknown position value', () => {
    expect(() => GlobalSearchConfigSchema.parse({ position: 'middle' })).toThrow();
  });

  it('accepts a fully populated config', () => {
    const result = GlobalSearchConfigSchema.parse({
      enabled: true,
      placeholder: 'Search everything',
      maxResultsPerLayer: 5,
      debounceMs: 100,
      minQueryLength: 3,
      layers: [
        {
          layerId: 'layer-1',
          properties: [{ property: 'name', label: 'Name', autocomplete: true }],
        },
      ],
    });
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0].properties[0].property).toBe('name');
  });
});

describe('GlobalSearchLayerConfigSchema', () => {
  it('rejects an empty properties array', () => {
    expect(() =>
      GlobalSearchLayerConfigSchema.parse({ layerId: 'layer-1', properties: [] }),
    ).toThrow();
  });

  it('accepts at least one property', () => {
    const result = GlobalSearchLayerConfigSchema.parse({
      layerId: 'layer-1',
      properties: [{ property: 'name' }],
    });
    expect(result.properties).toHaveLength(1);
  });
});

describe('GlobalSearchPropertySchema', () => {
  it('accepts undefined autocomplete and prefetch', () => {
    const result = GlobalSearchPropertySchema.parse({ property: 'name' });
    expect(result.property).toBe('name');
    expect(result.autocomplete).toBeUndefined();
    expect(result.prefetch).toBeUndefined();
  });

  it('rejects an empty property string', () => {
    expect(() => GlobalSearchPropertySchema.parse({ property: '' })).toThrow();
  });
});

describe('MapConfigSchema with globalSearch', () => {
  it('validates a config WITHOUT a globalSearch block (back-compat)', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.globalSearch).toBeUndefined();
  });

  it('validates a config WITH a populated globalSearch block', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      globalSearch: {
        enabled: true,
        layers: [
          {
            layerId: 'layer-1',
            properties: [{ property: 'name', autocomplete: true }],
          },
        ],
      },
    });
    expect(result.globalSearch).toBeDefined();
    expect(result.globalSearch!.layers).toHaveLength(1);
    expect(result.globalSearch!.maxResultsPerLayer).toBe(10);
  });
});

describe('UIConfigSchema.showGlobalSearch', () => {
  it('defaults showGlobalSearch to false', () => {
    const result = UIConfigSchema.parse({});
    expect(result.showGlobalSearch).toBe(false);
  });
});
