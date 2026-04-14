import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { BasemapConfig } from '../../types';
import { BasemapEditor } from './BasemapEditor';

const meta: Meta<typeof BasemapEditor> = {
  title: 'Admin/BasemapEditor',
  component: BasemapEditor,
  parameters: {
    docs: {
      description: {
        component: 'Controlled form for editing a single basemap configuration.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof BasemapEditor>;

export const Default: Story = {
  render: () => {
    const [basemap, setBasemap] = useState<BasemapConfig>({
      id: 'osm',
      label: 'OpenStreetMap',
      url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <BasemapEditor value={basemap} onChange={setBasemap} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(basemap, null, 2)}
        </pre>
      </div>
    );
  },
};
