import type { Meta, StoryObj } from '@storybook/react';
import { ConfigPreview } from './ConfigPreview';

const meta: Meta<typeof ConfigPreview> = {
  title: 'Admin/ConfigPreview',
  component: ConfigPreview,
  parameters: {
    docs: {
      description: {
        component:
          'JSON viewer with MapConfig validation status badge. Lists Zod validation errors if invalid.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ConfigPreview>;

const validConfig = {
  sources: [
    {
      id: 'tipg',
      url: 'http://localhost:8000',
      label: 'Local TiPG',
      tileMatrixSetId: 'WebMercatorQuad',
    },
  ],
  layers: [
    {
      id: 'countries',
      sourceId: 'tipg',
      collection: 'ne_110m_admin_0_countries',
      label: 'Countries',
      visible: true,
      dataMode: 'vector-tiles',
      style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
    },
  ],
  basemaps: [
    {
      id: 'positron',
      label: 'Positron',
      url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    },
  ],
  ui: {
    showLayerPanel: true,
    showLegend: true,
    showBasemapSwitcher: true,
    showSearchPanel: false,
    showCoordinateDisplay: true,
    showFeatureDetail: true,
    showFeatureTooltip: true,
    showExportButton: true,
  },
  initialView: {
    latitude: 51.505,
    longitude: -0.09,
    zoom: 13,
    pitch: 0,
    bearing: 0,
  },
};

export const ValidConfig: Story = {
  args: {
    config: validConfig,
  },
};

export const InvalidConfig: Story = {
  args: {
    config: {
      sources: [],
      layers: [],
      basemaps: [],
    },
  },
};

export const PartialConfig: Story = {
  args: {
    config: {
      sources: [{ id: 'tipg', url: 'not-a-url' }],
      layers: [],
      basemaps: [{ id: 'osm', label: 'OSM', url: 'https://valid-url.com/style.json' }],
      initialView: { latitude: 0, longitude: 0, zoom: 2, pitch: 0, bearing: 0 },
    },
  },
};
