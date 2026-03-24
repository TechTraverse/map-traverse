import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ImageryEditor } from './ImageryEditor';
import type { ImageryLayerConfig, OgcApiSource } from '../../types';

const MOCK_SOURCES: OgcApiSource[] = [
  { id: 'noaa-imagery', url: 'https://fire.data.nesdis.noaa.gov/api/ogc/imagery', label: 'NOAA Fire Imagery', tileMatrixSetId: 'WebMercatorQuad', type: 'imagery' },
  { id: 'local-tipg', url: 'http://localhost:8000', label: 'Local tipg', tileMatrixSetId: 'WebMercatorQuad', type: 'features' },
];

const DEFAULT_LAYER: ImageryLayerConfig = {
  id: 'geocolor',
  sourceId: 'noaa-imagery',
  collection: 'GOESEastCONUSGeoColor',
  label: 'GOES East GeoColor',
  visible: false,
  opacity: 1,
  exclusive: true,
  tileSize: 256,
};

const meta: Meta<typeof ImageryEditor> = {
  title: 'Admin/ImageryEditor',
  component: ImageryEditor,
};
export default meta;
type Story = StoryObj<typeof ImageryEditor>;

function ImageryEditorDemo() {
  const [layer, setLayer] = useState(DEFAULT_LAYER);
  return (
    <div style={{ maxWidth: 500 }}>
      <ImageryEditor value={layer} onChange={setLayer} availableSources={MOCK_SOURCES} />
      <pre style={{ marginTop: 16, fontSize: 12, background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
        {JSON.stringify(layer, null, 2)}
      </pre>
    </div>
  );
}

export const Default: Story = {
  render: () => <ImageryEditorDemo />,
};
