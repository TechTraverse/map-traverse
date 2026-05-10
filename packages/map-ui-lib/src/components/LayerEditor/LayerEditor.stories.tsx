import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LayerConfig, OgcApiSource } from '../../types';
import { LayerEditor } from './LayerEditor';

const meta: Meta<typeof LayerEditor> = {
  title: 'Admin/LayerEditor',
  component: LayerEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Composite layer editor with style, legend, and search field sub-editors in collapsible sections.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof LayerEditor>;

const sampleSources: OgcApiSource[] = [
  { id: 'tipg', url: 'http://localhost:8000', label: 'Local TiPG', tileMatrixSetId: 'WebMercatorQuad' },
  { id: 'remote', url: 'https://demo.pygeoapi.io', label: 'PyGeoAPI Demo', tileMatrixSetId: 'WebMercatorQuad' },
];

const sampleLayer: LayerConfig = {
  id: 'countries',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
};

export const Default: Story = {
  render: () => {
    const [layer, setLayer] = useState<LayerConfig>(sampleLayer);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerEditor value={layer} onChange={setLayer} availableSources={sampleSources} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(layer, null, 2)}
        </pre>
      </div>
    );
  },
};

export const NewLayer: Story = {
  render: () => {
    const [layer, setLayer] = useState<LayerConfig>({
      id: '',
      sourceId: '',
      collection: '',
      label: '',
      visible: true,
      dataMode: 'vector-tiles',
    });
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerEditor value={layer} onChange={setLayer} availableSources={sampleSources} />
      </div>
    );
  },
};

export const LineWithLabels: Story = {
  render: () => {
    const [layer, setLayer] = useState<LayerConfig>({
      id: 'roads',
      sourceId: 'tipg',
      collection: 'ne_10m_roads',
      label: 'Roads',
      visible: true,
      dataMode: 'vector-tiles',
      styles: [
        { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 } },
        {
          type: 'symbol',
          paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
          layout: { 'text-field': '{name}', 'text-size': 12, 'symbol-placement': 'line' },
        },
      ],
    });
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerEditor value={layer} onChange={setLayer} availableSources={sampleSources} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(layer, null, 2)}
        </pre>
      </div>
    );
  },
};

export const PolygonWithLabels: Story = {
  render: () => {
    const [layer, setLayer] = useState<LayerConfig>({
      id: 'towns',
      sourceId: 'tipg',
      collection: 'ne_110m_admin_0_countries',
      label: 'Towns',
      visible: true,
      dataMode: 'vector-tiles',
      styles: [
        {
          type: 'fill',
          paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6, 'fill-outline-color': 'transparent', 'fill-antialias': true },
        },
        {
          type: 'symbol',
          paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
          layout: { 'text-field': '{name}', 'text-size': 12, 'symbol-placement': 'point' },
        },
      ],
    });
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerEditor value={layer} onChange={setLayer} availableSources={sampleSources} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(layer, null, 2)}
        </pre>
      </div>
    );
  },
};

export const SymbolLayer: Story = {
  render: () => {
    const [layer, setLayer] = useState<LayerConfig>({
      id: 'cities',
      sourceId: 'tipg',
      collection: 'ne_110m_populated_places',
      label: 'Cities',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'symbol',
        paint: { 'text-color': '#1a1a2e', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
        layout: { 'text-field': '{name}', 'text-size': 12 },
      },
    });
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <LayerEditor value={layer} onChange={setLayer} availableSources={sampleSources} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(layer, null, 2)}
        </pre>
      </div>
    );
  },
};
