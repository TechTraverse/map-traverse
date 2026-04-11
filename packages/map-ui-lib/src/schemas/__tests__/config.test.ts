import { describe, it, expect } from 'vitest';
import {
  LayerConfigSchema,
  FilterRuleSchema,
  FilterRuleGroupSchema,
  FilterRuleValueSchema,
  Cql2FilterConfigSchema,
  InfoConfigSchema,
  MapConfigSchema,
  ViewConfigSchema,
} from '../config';

const baseMapConfig = {
  sources: [{ id: 'src-1', url: 'https://example.com/ogc' }],
  layers: [
    {
      id: 'layer-1',
      sourceId: 'src-1',
      collection: 'my-collection',
      label: 'Test Layer',
      dataMode: 'vector-tiles' as const,
    },
  ],
  basemaps: [{ id: 'osm', label: 'OSM', url: 'https://example.com/style.json' }],
  initialView: { latitude: 0, longitude: 0, zoom: 2 },
};

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

describe('CQL2 Filter Schemas', () => {
  describe('FilterRuleValueSchema', () => {
    it('accepts static', () => {
      const input = { kind: 'static', value: 'hello' };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('static');
    });

    it('accepts parameter', () => {
      const input = { kind: 'parameter', name: 'foo', label: 'Foo', inputType: 'text' };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('parameter');
    });

    it('accepts relativeDate', () => {
      const input = {
        kind: 'relativeDate',
        direction: 'past',
        offset: { kind: 'static', value: 5 },
        unit: 'days',
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('relativeDate');
    });

    it('accepts dateRange', () => {
      const input = {
        kind: 'dateRange',
        start: {
          kind: 'relativeDate',
          direction: 'past',
          offset: { kind: 'static', value: 30 },
          unit: 'days',
        },
        end: { kind: 'static', value: '2026-01-01' },
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('dateRange');
    });

    it('accepts computedRange', () => {
      const input = {
        kind: 'computedRange',
        baseParam: 'price',
        baseLabel: 'Price',
        offsetType: 'percentage',
        offsetAmount: { kind: 'static', value: 20 },
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('computedRange');
    });

    it('rejects unknown kind', () => {
      const input = { kind: 'unknown' };
      expect(() => FilterRuleValueSchema.parse(input)).toThrow();
    });
  });

  describe('FilterRuleSchema', () => {
    it('accepts valid rule', () => {
      const input = {
        id: 'r1',
        property: 'name',
        operator: '=',
        value: { kind: 'static', value: 'test' },
      };
      const result = FilterRuleSchema.parse(input);
      expect(result.id).toBe('r1');
      expect(result.property).toBe('name');
    });

    it('rejects missing property', () => {
      const input = {
        id: 'r1',
        operator: '=',
        value: { kind: 'static', value: 'test' },
      };
      expect(() => FilterRuleSchema.parse(input)).toThrow();
    });
  });

  describe('FilterRuleGroupSchema', () => {
    it('accepts nested groups', () => {
      const input = {
        id: 'g1',
        combinator: 'and',
        rules: [
          {
            id: 'r1',
            property: 'name',
            operator: '=',
            value: { kind: 'static', value: 'test' },
          },
          {
            id: 'g2',
            combinator: 'or',
            rules: [
              {
                id: 'r2',
                property: 'age',
                operator: '>',
                value: { kind: 'static', value: 18 },
              },
            ],
          },
        ],
      };
      const result = FilterRuleGroupSchema.parse(input);
      expect(result.combinator).toBe('and');
      expect(result.rules).toHaveLength(2);
    });

    it('accepts sortby and limit', () => {
      const input = {
        id: 'g1',
        combinator: 'and',
        rules: [
          {
            id: 'r1',
            property: 'name',
            operator: '=',
            value: { kind: 'static', value: 'test' },
          },
        ],
        sortby: [
          { property: 'name', direction: 'asc' },
          { property: 'date', direction: 'desc' },
        ],
        limit: 50,
      };
      const result = FilterRuleGroupSchema.parse(input);
      expect(result.sortby).toHaveLength(2);
      expect(result.limit).toBe(50);
    });
  });

  describe('LayerConfigSchema with cql2Filter', () => {
    it('accepts cql2Filter', () => {
      const input = {
        id: 'layer-1',
        sourceId: 'source-1',
        collection: 'my-collection',
        label: 'Test Layer',
        dataMode: 'vector-tiles',
        cql2Filter: {
          id: 'g1',
          combinator: 'and',
          rules: [
            {
              id: 'r1',
              property: 'status',
              operator: '=',
              value: { kind: 'static', value: 'active' },
            },
          ],
        },
      };
      const result = LayerConfigSchema.parse(input);
      expect(result.cql2Filter).toBeDefined();
      expect(result.cql2Filter!.id).toBe('g1');
    });
  });
});

describe('ViewConfigSchema', () => {
  const base = { latitude: 0, longitude: 0, zoom: 10, pitch: 0, bearing: 0 };

  it('parses without minZoom/maxZoom (backward compat)', () => {
    const result = ViewConfigSchema.parse(base);
    expect(result.minZoom).toBeUndefined();
    expect(result.maxZoom).toBeUndefined();
  });

  it('parses with valid minZoom only', () => {
    const result = ViewConfigSchema.parse({ ...base, minZoom: 2 });
    expect(result.minZoom).toBe(2);
    expect(result.maxZoom).toBeUndefined();
  });

  it('parses with valid maxZoom only', () => {
    const result = ViewConfigSchema.parse({ ...base, maxZoom: 18 });
    expect(result.maxZoom).toBe(18);
    expect(result.minZoom).toBeUndefined();
  });

  it('parses with valid minZoom and maxZoom', () => {
    const result = ViewConfigSchema.parse({ ...base, minZoom: 2, maxZoom: 18 });
    expect(result.minZoom).toBe(2);
    expect(result.maxZoom).toBe(18);
  });

  it('rejects minZoom > maxZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: 18, maxZoom: 2 })).toThrow();
  });

  it('rejects zoom below minZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, zoom: 1, minZoom: 5 })).toThrow();
  });

  it('rejects zoom above maxZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, zoom: 20, maxZoom: 15 })).toThrow();
  });

  it('rejects minZoom out of range', () => {
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: -1 })).toThrow();
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: 25 })).toThrow();
  });

  it('rejects maxZoom out of range', () => {
    expect(() => ViewConfigSchema.parse({ ...base, maxZoom: -1 })).toThrow();
    expect(() => ViewConfigSchema.parse({ ...base, maxZoom: 25 })).toThrow();
  });
});

describe('InfoConfigSchema', () => {
  it('parses a MapConfig without an info field (back-compat)', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.info).toBeUndefined();
  });

  it('populates defaults from empty input', () => {
    const result = InfoConfigSchema.parse({});
    expect(result).toEqual({
      enabled: false,
      markdown: '',
      position: 'top-right',
    });
  });

  it('rejects an invalid position', () => {
    expect(() => InfoConfigSchema.parse({ position: 'invalid' })).toThrow();
  });

  it('round-trips a fully populated info object', () => {
    const input = {
      enabled: true,
      title: 'About this map',
      markdown: '# Hello\n\nThis is a map.',
      position: 'bottom-left' as const,
    };
    const result = InfoConfigSchema.parse(input);
    expect(result).toEqual(input);
  });
});
