import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerEditor } from '../LayerEditor';
import type { LayerConfig, OgcApiSource } from '../../../types';

const sources: OgcApiSource[] = [
  { id: 'tipg-local', url: 'http://localhost/ogc/', label: 'My Data', tileMatrixSetId: 'WebMercatorQuad' },
  { id: 'remote', url: 'http://example/ogc/', label: 'County GIS', tileMatrixSetId: 'WebMercatorQuad' },
];

const layer: LayerConfig = {
  id: 'parcels',
  sourceId: 'tipg-local',
  collection: 'uploads.parcels',
  label: 'Parcels',
  visible: true,
  dataMode: 'vector-tiles',
};

describe('LayerEditor source grouping', () => {
  it('renders optgroups when availableSourceGroups is provided', () => {
    const html = renderToStaticMarkup(
      <LayerEditor
        value={layer}
        onChange={() => {}}
        availableSources={sources}
        availableSourceGroups={[
          { id: 'my-data', label: 'My Data', sourceIds: ['tipg-local'] },
          { id: 'external', label: 'External Sources', sourceIds: ['remote'] },
        ]}
      />,
    );
    expect(html).toContain('<optgroup label="My Data">');
    expect(html).toContain('<optgroup label="External Sources">');
  });

  it('renders a flat source list (no optgroups) when groups are omitted', () => {
    const html = renderToStaticMarkup(
      <LayerEditor value={layer} onChange={() => {}} availableSources={sources} />,
    );
    expect(html).not.toContain('<optgroup');
    expect(html).toContain('County GIS');
  });
});
