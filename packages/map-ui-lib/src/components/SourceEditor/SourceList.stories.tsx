import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { OgcApiSource } from '../../types';
import { SourceList } from './SourceList';

const meta: Meta<typeof SourceList> = {
  title: 'Admin/SourceList',
  component: SourceList,
  parameters: {
    docs: {
      description: {
        component: 'Manages a list of OGC API sources with add/edit/remove controls.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SourceList>;

const sampleSources: OgcApiSource[] = [
  { id: 'tipg', url: 'http://localhost:8000', label: 'Local TiPG', tileMatrixSetId: 'WebMercatorQuad' },
  { id: 'remote', url: 'https://demo.pygeoapi.io', label: 'PyGeoAPI Demo', tileMatrixSetId: 'WebMercatorQuad' },
];

export const Default: Story = {
  render: () => {
    const [sources, setSources] = useState<OgcApiSource[]>(sampleSources);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <SourceList sources={sources} onChange={setSources} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [sources, setSources] = useState<OgcApiSource[]>([]);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <SourceList sources={sources} onChange={setSources} />
      </div>
    );
  },
};

const mixedSources: OgcApiSource[] = [
  { id: 'tipg', url: 'http://localhost:8000', label: 'Local TiPG', tileMatrixSetId: 'WebMercatorQuad', type: 'features' },
  { id: 'imagery-naip', url: 'https://example.com/naip', label: 'NAIP Imagery', tileMatrixSetId: 'WebMercatorQuad', type: 'imagery' },
  { id: 'remote', url: 'https://demo.pygeoapi.io', label: 'PyGeoAPI Demo', tileMatrixSetId: 'WebMercatorQuad', type: 'features' },
];

export const FeaturesOnly: Story = {
  render: () => {
    const [sources, setSources] = useState<OgcApiSource[]>(mixedSources);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <p className="mapui:text-xs mapui:text-slate-500 mapui:mb-2">
          Only feature sources shown (imagery source &quot;NAIP Imagery&quot; is hidden)
        </p>
        <SourceList sources={sources} onChange={setSources} sourceType="features" />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(sources, null, 2)}
        </pre>
      </div>
    );
  },
};
