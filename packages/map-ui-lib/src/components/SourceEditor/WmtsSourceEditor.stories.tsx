import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { WmtsSource } from '../../types';
import { WmtsSourceEditor } from './WmtsSourceEditor';

const meta: Meta<typeof WmtsSourceEditor> = {
  title: 'Admin/WmtsSourceEditor',
  component: WmtsSourceEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Controlled form for editing a single WMTS source. Click "Fetch Layers" to load a GetCapabilities document and populate the dropdowns.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof WmtsSourceEditor>;

const defaultSource: WmtsSource = {
  id: 'nasa-gibs',
  sourceType: 'wmts',
  capabilitiesUrl:
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml',
  layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  style: 'default',
  format: 'image/jpeg',
  tileMatrixSet: 'GoogleMapsCompatible_Level9',
  tileSize: 256,
  label: 'NASA GIBS — MODIS Terra True Color',
};

export const Default: Story = {
  render: () => {
    const [source, setSource] = useState<WmtsSource>(defaultSource);
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <WmtsSourceEditor value={source} onChange={setSource} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(source, null, 2)}
        </pre>
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [source, setSource] = useState<WmtsSource>({
      id: '',
      sourceType: 'wmts',
      capabilitiesUrl: '',
      layer: '',
      style: 'default',
      format: 'image/png',
      tileMatrixSet: 'WebMercatorQuad',
      tileSize: 256,
    });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <WmtsSourceEditor value={source} onChange={setSource} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(source, null, 2)}
        </pre>
      </div>
    );
  },
};
