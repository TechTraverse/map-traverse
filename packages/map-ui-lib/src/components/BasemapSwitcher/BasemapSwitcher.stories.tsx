import type { Meta, StoryObj } from '@storybook/react';
import { BasemapSwitcher } from './BasemapSwitcher';
import type { BasemapConfig } from '../../types';

const sampleBasemaps: BasemapConfig[] = [
  {
    id: 'osm-standard',
    label: 'OpenStreetMap',
    url: 'https://demotiles.maplibre.org/style.json',
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://basemaps.example.com/dark/style.json',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://basemaps.example.com/satellite/style.json',
  },
];

const basemapsWithThumbnails: BasemapConfig[] = [
  {
    id: 'osm-standard',
    label: 'OpenStreetMap',
    url: 'https://demotiles.maplibre.org/style.json',
    thumbnail: 'https://placehold.co/64x48/e2e8f0/475569?text=OSM',
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://basemaps.example.com/dark/style.json',
    thumbnail: 'https://placehold.co/64x48/1e293b/94a3b8?text=Dark',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://basemaps.example.com/satellite/style.json',
    thumbnail: 'https://placehold.co/64x48/166534/86efac?text=Sat',
  },
];

const meta: Meta<typeof BasemapSwitcher> = {
  title: 'Components/BasemapSwitcher',
  component: BasemapSwitcher,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onSelect: { action: 'selected' },
  },
};

export default meta;
type Story = StoryObj<typeof BasemapSwitcher>;

export const Default: Story = {
  args: {
    basemaps: sampleBasemaps,
    activeBasemapId: 'osm-standard',
  },
};

export const WithThumbnails: Story = {
  args: {
    basemaps: basemapsWithThumbnails,
    activeBasemapId: 'dark',
  },
};

export const SingleBasemap: Story = {
  args: {
    basemaps: [sampleBasemaps[0]],
    activeBasemapId: 'osm-standard',
  },
};
