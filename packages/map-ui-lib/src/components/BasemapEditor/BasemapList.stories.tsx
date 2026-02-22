import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { BasemapConfig } from '../../types';
import { BasemapList } from './BasemapList';

const meta: Meta<typeof BasemapList> = {
  title: 'Admin/BasemapList',
  component: BasemapList,
  parameters: {
    docs: {
      description: {
        component: 'Manages a list of basemaps with add/edit/remove controls.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof BasemapList>;

const sampleBasemaps: BasemapConfig[] = [
  {
    id: 'positron',
    label: 'Positron',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'dark-matter',
    label: 'Dark Matter',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
];

export const Default: Story = {
  render: () => {
    const [basemaps, setBasemaps] = useState<BasemapConfig[]>(sampleBasemaps);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <BasemapList basemaps={basemaps} onChange={setBasemaps} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [basemaps, setBasemaps] = useState<BasemapConfig[]>([]);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <BasemapList basemaps={basemaps} onChange={setBasemaps} />
      </div>
    );
  },
};
