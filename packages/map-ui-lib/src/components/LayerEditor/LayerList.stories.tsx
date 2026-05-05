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
  {
    id: 'cities',
    sourceId: 'tipg',
    collection: 'ne_110m_populated_places',
    label: 'Cities',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 4 } },
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

const manyLayers: LayerConfig[] = [
  {
    id: 'countries',
    sourceId: 'tipg',
    collection: 'ne_110m_admin_0_countries',
    label: 'Countries',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.4 } },
  },
  {
    id: 'lakes',
    sourceId: 'tipg',
    collection: 'ne_110m_lakes',
    label: 'Lakes',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'fill', paint: { 'fill-color': '#3498db', 'fill-opacity': 0.7 } },
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
  {
    id: 'roads',
    sourceId: 'tipg',
    collection: 'ne_110m_roads',
    label: 'Roads',
    visible: false,
    dataMode: 'vector-tiles',
    style: { type: 'line', paint: { 'line-color': '#7f8c8d', 'line-width': 1, 'line-opacity': 0.8 } },
  },
  {
    id: 'cities',
    sourceId: 'tipg',
    collection: 'ne_110m_populated_places',
    label: 'Cities',
    visible: true,
    dataMode: 'vector-tiles',
    style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 4 } },
  },
  {
    id: 'airports',
    sourceId: 'tipg',
    collection: 'ne_10m_airports',
    label: 'Airports',
    visible: true,
    dataMode: 'geojson',
    style: { type: 'circle', paint: { 'circle-color': '#f39c12', 'circle-radius': 5 } },
  },
];

export const ManyLayers: Story = {
  render: () => {
    const [layers, setLayers] = useState<LayerConfig[]>(manyLayers);
    return (
      <div className="mapui:flex mapui:gap-6 mapui:p-4">
        <div className="mapui:w-96">
          <LayerList layers={layers} onChange={setLayers} availableSources={sampleSources} />
        </div>
        <div className="mapui:flex-1">
          <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:text-slate-500">
            Current order (index 0 = bottom of map):
          </p>
          <pre className="mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs mapui:text-slate-700">
            {layers.map((l, i) => `${i}: ${l.id} (${l.label})`).join('\n')}
          </pre>
        </div>
      </div>
    );
  },
};

export const ControlledDraft: Story = {
  render: () => {
    const [layers, setLayers] = useState<LayerConfig[]>(sampleLayers);
    const [draft, setDraft] = useState<LayerConfig | null>(null);
    return (
      <div className="mapui:flex mapui:gap-6 mapui:p-4">
        <div className="mapui:w-[28rem]">
          <LayerList
            layers={layers}
            onChange={setLayers}
            availableSources={sampleSources}
            draftLayer={draft}
            onDraftChange={setDraft}
          />
        </div>
        <div className="mapui:flex-1">
          <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:text-slate-500">
            Live draft (visible to consumer before "Save Layer"):
          </p>
          <pre className="mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs mapui:text-slate-700">
            {draft ? JSON.stringify(draft, null, 2) : 'null'}
          </pre>
          <p className="mapui:mt-3 mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:text-slate-500">
            Committed layers:
          </p>
          <pre className="mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs mapui:text-slate-700">
            {layers.map((l, i) => `${i}: ${l.id} (${l.label})`).join('\n')}
          </pre>
        </div>
      </div>
    );
  },
};
