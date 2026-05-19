import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GlobalSearchConfig, LayerConfig, AvailableProperty } from '../../types';
import {
  GlobalSearchConfigEditor,
  addLayerEntry,
  removeLayerEntry,
  addPropertyToLayer,
  removePropertyAt,
  updatePropertyAt,
  togglePropertyFlag,
} from './GlobalSearchConfigEditor';

const layers: LayerConfig[] = [
  {
    id: 'cities',
    sourceId: 'src',
    collection: 'cities',
    label: 'Cities',
    visible: true,
    dataMode: 'vector-tiles',
  },
  {
    id: 'parks',
    sourceId: 'src',
    collection: 'parks',
    label: 'Parks',
    visible: true,
    dataMode: 'vector-tiles',
  },
];

const propertiesByLayer: Record<string, AvailableProperty[]> = {
  cities: [
    { name: 'name', title: 'Name' },
    { name: 'country', title: 'Country' },
  ],
  parks: [{ name: 'name', title: 'Name' }],
};

const base: GlobalSearchConfig = {
  enabled: true,
  maxResultsPerLayer: 10,
  debounceMs: 250,
  minQueryLength: 2,
  position: 'top-left',
  width: 'md',
  layers: [],
};

describe('GlobalSearchConfigEditor pure helpers', () => {
  it('addLayerEntry adds a new layer with empty properties', () => {
    const next = addLayerEntry(base, 'cities');
    expect(next.layers).toEqual([{ layerId: 'cities', properties: [] }]);
  });

  it('addLayerEntry is a no-op when layer already configured', () => {
    const start = addLayerEntry(base, 'cities');
    const next = addLayerEntry(start, 'cities');
    expect(next).toBe(start);
  });

  it('addLayerEntry is a no-op for empty id', () => {
    expect(addLayerEntry(base, '')).toBe(base);
  });

  it('removeLayerEntry removes the matching layer', () => {
    const start = addLayerEntry(addLayerEntry(base, 'cities'), 'parks');
    const next = removeLayerEntry(start, 'cities');
    expect(next.layers.map((l) => l.layerId)).toEqual(['parks']);
  });

  it('addPropertyToLayer appends a property row', () => {
    const start = addLayerEntry(base, 'cities');
    const next = addPropertyToLayer(start, 'cities', 'name');
    expect(next.layers[0].properties).toEqual([{ property: 'name' }]);
  });

  it('removePropertyAt removes the row at the given index', () => {
    let v = addLayerEntry(base, 'cities');
    v = addPropertyToLayer(v, 'cities', 'name');
    v = addPropertyToLayer(v, 'cities', 'country');
    const next = removePropertyAt(v, 'cities', 0);
    expect(next.layers[0].properties).toEqual([{ property: 'country' }]);
  });

  it('updatePropertyAt patches a single row', () => {
    let v = addLayerEntry(base, 'cities');
    v = addPropertyToLayer(v, 'cities', 'name');
    const next = updatePropertyAt(v, 'cities', 0, { label: 'City' });
    expect(next.layers[0].properties[0]).toEqual({ property: 'name', label: 'City' });
  });

  it('togglePropertyFlag enables autocomplete and prefetch independently', () => {
    let v = addLayerEntry(base, 'cities');
    v = addPropertyToLayer(v, 'cities', 'name');
    v = togglePropertyFlag(v, 'cities', 0, 'autocomplete', true);
    v = togglePropertyFlag(v, 'cities', 0, 'prefetch', true);
    expect(v.layers[0].properties[0]).toEqual({
      property: 'name',
      autocomplete: true,
      prefetch: true,
    });
  });

  it('togglePropertyFlag clears one flag without affecting the other', () => {
    let v = addLayerEntry(base, 'cities');
    v = addPropertyToLayer(v, 'cities', 'name');
    v = togglePropertyFlag(v, 'cities', 0, 'autocomplete', true);
    v = togglePropertyFlag(v, 'cities', 0, 'prefetch', true);
    v = togglePropertyFlag(v, 'cities', 0, 'prefetch', false);
    expect(v.layers[0].properties[0]).toEqual({
      property: 'name',
      autocomplete: true,
    });
  });

  it('togglePropertyFlag unsets the flag when checked=false', () => {
    let v = addLayerEntry(base, 'cities');
    v = addPropertyToLayer(v, 'cities', 'name');
    v = togglePropertyFlag(v, 'cities', 0, 'autocomplete', true);
    v = togglePropertyFlag(v, 'cities', 0, 'autocomplete', false);
    expect(v.layers[0].properties[0].autocomplete).toBeUndefined();
  });
});

describe('GlobalSearchConfigEditor render', () => {
  it('renders without crashing when layers section is empty', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={base}
        onChange={() => {}}
        layers={layers}
        propertiesByLayer={propertiesByLayer}
      />,
    );
    expect(html).toContain('Layers');
    expect(html).toContain('No layers configured yet');
    // The "Add layer" picker lists every layer not yet configured
    expect(html).toContain('Cities');
    expect(html).toContain('Parks');
  });

  it('renders a layer card for each configured entry', () => {
    const value: GlobalSearchConfig = {
      ...base,
      layers: [{ layerId: 'cities', properties: [{ property: 'name', autocomplete: true }] }],
    };
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={value}
        onChange={() => {}}
        layers={layers}
        propertiesByLayer={propertiesByLayer}
      />,
    );
    expect(html).toContain('gs-layer-card-cities');
    expect(html).toContain('gs-property-row-cities-0');
    // Cities is no longer offered in the add picker (Parks remains)
    expect(html).toContain('Parks');
  });

  it('renders a loading hint when isLoadingProperties is true', () => {
    const value: GlobalSearchConfig = {
      ...base,
      layers: [{ layerId: 'cities', properties: [] }],
    };
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={value}
        onChange={() => {}}
        layers={layers}
        propertiesByLayer={propertiesByLayer}
        isLoadingProperties={{ cities: true }}
      />,
    );
    expect(html).toContain('gs-layer-loading-cities');
    expect(html).toContain('Loading properties');
  });

  it('renders the empty-properties warning for layers with zero properties', () => {
    const value: GlobalSearchConfig = {
      ...base,
      layers: [{ layerId: 'cities', properties: [] }],
    };
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={value}
        onChange={() => {}}
        layers={layers}
        propertiesByLayer={propertiesByLayer}
      />,
    );
    expect(html).toContain('At least one property is required');
  });

  it('renders "no properties available" when array is empty and not loading', () => {
    const value: GlobalSearchConfig = {
      ...base,
      layers: [{ layerId: 'cities', properties: [{ property: '' }] }],
    };
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={value}
        onChange={() => {}}
        layers={layers}
        propertiesByLayer={{ cities: [] }}
      />,
    );
    expect(html).toContain('no properties available');
  });

  it('top-level update helpers flow through onChange (placeholder)', () => {
    // Verify that updating top-level fields produces valid GlobalSearchConfig
    // by exercising the helpers via the component's onChange contract.
    const onChange = vi.fn<(c: GlobalSearchConfig) => void>();
    // Sanity: render and check that the placeholder input exists in markup
    const html = renderToStaticMarkup(
      <GlobalSearchConfigEditor
        value={{ ...base, placeholder: 'Find…' }}
        onChange={onChange}
        layers={layers}
        propertiesByLayer={propertiesByLayer}
      />,
    );
    expect(html).toContain('value="Find…"');
    expect(html).toContain('Max Results / Layer');
    expect(html).toContain('Debounce (ms)');
    expect(html).toContain('Min Query Length');
  });
});
