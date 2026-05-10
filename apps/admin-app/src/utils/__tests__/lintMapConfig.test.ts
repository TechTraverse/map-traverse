import { describe, it, expect } from 'vitest';
import { lintMapConfig, isSearchFieldTypeCompatible } from '../lintMapConfig';
import type { ImageryLayerConfig, LayerConfig, SearchField, AvailableProperty, GlobalSearchConfig } from '@ogc-maps/storybook-components';

const baseImagery: ImageryLayerConfig = {
  id: 'i1',
  sourceId: '',
  collection: '',
  label: 'Untitled',
  visible: false,
  opacity: 1,
  exclusive: false,
  tileSize: 256,
};

describe('isSearchFieldTypeCompatible', () => {
  const ap = (type: string, format?: string, name = 'p'): AvailableProperty => ({ name, type, format });
  const f = (type: SearchField['type'], property = 'p'): SearchField => {
    if (type === 'text') return { type, property, label: '', autocomplete: false };
    if (type === 'number') return { type, property, label: '', inputMode: 'input', operator: 'eq' };
    if (type === 'datetime') return { type, property, label: '', range: false };
    return { type, property, label: '' };
  };

  it('text fields accept string + unknown but not number/boolean', () => {
    expect(isSearchFieldTypeCompatible(f('text'), ap('string'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('text'), ap(''))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('text'), ap('number'))).toBe(false);
    expect(isSearchFieldTypeCompatible(f('text'), ap('boolean'))).toBe(false);
  });

  it('number fields require number/integer', () => {
    expect(isSearchFieldTypeCompatible(f('number'), ap('number'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('number'), ap('integer'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('number'), ap('string'))).toBe(false);
  });

  it('datetime fields accept date/date-time format strings', () => {
    expect(isSearchFieldTypeCompatible(f('datetime'), ap('string', 'date-time'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('datetime'), ap('string', 'date'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('datetime'), ap('string', '', 'created_date'))).toBe(true);
    expect(isSearchFieldTypeCompatible(f('datetime'), ap('string', '', 'name'))).toBe(false);
    expect(isSearchFieldTypeCompatible(f('datetime'), ap('number'))).toBe(false);
  });
});

describe('lintMapConfig', () => {
  const empty = {
    layers: [] as LayerConfig[],
    imageryLayers: [] as ImageryLayerConfig[],
    globalSearch: undefined,
    queryablesByLayer: {},
  };

  it('returns no issues for an empty config', () => {
    expect(lintMapConfig(empty)).toEqual([]);
  });

  it('flags an incomplete imagery row', () => {
    const issues = lintMapConfig({ ...empty, imageryLayers: [{ ...baseImagery }] });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].remediation).toEqual({ kind: 'remove-imagery-row', index: 0 });
  });

  it('does not flag an imagery row with a tile URL', () => {
    const issues = lintMapConfig({
      ...empty,
      imageryLayers: [{ ...baseImagery, tileUrlTemplate: 'https://example.com/{z}/{x}/{y}.png' }],
    });
    expect(issues).toHaveLength(0);
  });

  it('flags a search field with a non-existent property', () => {
    const layer: LayerConfig = {
      id: 'roads',
      label: 'Roads',
      sourceId: 's1',
      collection: 'roads',
      styles: [],
      search: { fields: [{ type: 'text', property: 'no_such_field', label: 'X', autocomplete: false }] },
    } as unknown as LayerConfig;
    const issues = lintMapConfig({
      ...empty,
      layers: [layer],
      queryablesByLayer: { roads: [{ name: 'name', type: 'string' }] },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/no_such_field/);
    expect(issues[0].remediation).toEqual({ kind: 'remove-search-field', layerId: 'roads', index: 0 });
  });

  it('flags a search field whose type is incompatible with the queryable', () => {
    const layer: LayerConfig = {
      id: 'roads',
      label: 'Roads',
      sourceId: 's1',
      collection: 'roads',
      styles: [],
      search: { fields: [{ type: 'number', property: 'name', label: 'Name', inputMode: 'input', operator: 'eq' }] },
    } as unknown as LayerConfig;
    const issues = lintMapConfig({
      ...empty,
      layers: [layer],
      queryablesByLayer: { roads: [{ name: 'name', type: 'string' }] },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/incompatible/);
  });

  it('skips search-field validation for loading layers', () => {
    const layer: LayerConfig = {
      id: 'roads',
      label: 'Roads',
      sourceId: 's1',
      collection: 'roads',
      styles: [],
      search: { fields: [{ type: 'text', property: 'name', label: 'Name', autocomplete: false }] },
    } as unknown as LayerConfig;
    const issues = lintMapConfig({
      ...empty,
      layers: [layer],
      queryablesByLayer: {},
      queryablesLoading: { roads: true },
    });
    expect(issues).toHaveLength(0);
  });

  it('warns on duplicate global-search properties + missing labels', () => {
    const globalSearch: GlobalSearchConfig = {
      enabled: true,
      maxResultsPerLayer: 10,
      debounceMs: 250,
      minQueryLength: 2,
      layers: [{
        layerId: 'trails',
        properties: [
          { property: 'name', label: 'Trail name' },
          { property: 'name' }, // duplicate AND no label
        ],
      }],
    } as GlobalSearchConfig;
    const issues = lintMapConfig({ ...empty, globalSearch });
    // 1 duplicate warning + 1 missing-label warning
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(issues.some((i) => i.message.includes('more than once'))).toBe(true);
    expect(issues.some((i) => i.message.includes('no label'))).toBe(true);
  });
});
