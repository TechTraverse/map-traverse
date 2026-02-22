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
