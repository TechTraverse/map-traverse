import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LayerConfig, OgcApiSource } from '../../types';
import { LayerList } from './LayerList';

const meta: Meta<typeof LayerList> = {
  title: 'Admin/LayerList',
  component: LayerList,
  parameters: {
    docs: {
      description: {
        component: 'Manages a list of layers with add/edit/remove controls.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof LayerList>;

const sampleSources: OgcApiSource[] = [
  { id: 'tipg', url: 'http://localhost:8000', label: 'Local TiPG', tileMatrixSetId: 'WebMercatorQuad' },
];

const sampleLayers: LayerConfig[] = [
  {
    id: 'countries',
    sourceId: 'tipg',
    collection: 'ne_110m_admin_0_countries',
    label: 'Countries',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
  },
  {
    id: 'rivers',
    sourceId: 'tipg',
    collection: 'ne_110m_rivers_lake_centerlines',
    label: 'Rivers',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 } },
  },
];

export const Default: Story = {
  render: () => {
    const [layers, setLayers] = useState<LayerConfig[]>(sampleLayers);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerList layers={layers} onChange={setLayers} availableSources={sampleSources} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [layers, setLayers] = useState<LayerConfig[]>([]);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerList layers={layers} onChange={setLayers} availableSources={sampleSources} />
      </div>
    );
  },
};
