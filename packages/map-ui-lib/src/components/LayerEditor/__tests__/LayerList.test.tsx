import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerList } from '../LayerList';
import type { LayerConfig, OgcApiSource } from '../../../types';

const sources: OgcApiSource[] = [
  { id: 'tipg', url: 'http://localhost:8000', label: 'TiPG', tileMatrixSetId: 'WebMercatorQuad' },
];

const sampleLayers: LayerConfig[] = [
  {
    id: 'countries',
    sourceId: 'tipg',
    collection: 'ne_110m_admin_0_countries',
    label: 'Countries',
    visible: true,
    dataMode: 'vector-tiles',
  },
];

describe('LayerList controlled-draft mode', () => {
  it('does not render the New Layer form when draftLayer is null and onDraftChange is provided', () => {
    const html = renderToStaticMarkup(
      <LayerList
        layers={sampleLayers}
        onChange={() => {}}
        availableSources={sources}
        draftLayer={null}
        onDraftChange={() => {}}
      />,
    );
    // The new-layer form has a unique "New Layer" h4 header inside the indigo container.
    expect(html).not.toContain('>New Layer<');
  });

  it('renders the New Layer form when draftLayer is provided', () => {
    const draft: LayerConfig = {
      id: 'parcels',
      sourceId: 'tipg',
      collection: 'parcels',
      label: 'Parcels',
      visible: true,
      dataMode: 'vector-tiles',
    };
    const html = renderToStaticMarkup(
      <LayerList
        layers={sampleLayers}
        onChange={() => {}}
        availableSources={sources}
        draftLayer={draft}
        onDraftChange={() => {}}
      />,
    );
    expect(html).toContain('>New Layer<');
  });

  it('preserves uncontrolled behavior when neither prop is supplied', () => {
    const html = renderToStaticMarkup(
      <LayerList
        layers={sampleLayers}
        onChange={() => {}}
        availableSources={sources}
      />,
    );
    // Initial render: addingNew is false in uncontrolled mode, so no draft form.
    expect(html).not.toContain('>New Layer<');
    // The "+ Add Layer" button is still present.
    expect(html).toContain('+ Add Layer');
  });
});
