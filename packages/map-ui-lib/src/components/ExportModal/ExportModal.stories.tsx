import type { Meta, StoryObj } from '@storybook/react';
import { ExportModal } from './ExportModal';
import type { ExportModalProps } from './ExportModal';

const sampleLayers = [
  { id: 'countries', label: 'Countries', collection: 'ne_110m_admin_0_countries' },
  { id: 'rivers', label: 'Rivers', collection: 'ne_110m_rivers_lake_centerlines' },
  { id: 'cities', label: 'Populated Places', collection: 'ne_110m_populated_places' },
];

const sampleFormats = [
  { id: 'csv', label: 'CSV', extension: '.csv', description: 'Comma-separated values' },
  { id: 'geojson', label: 'GeoJSON', extension: '.geojson', description: 'GeoJSON format' },
  { id: 'kml', label: 'KML', extension: '.kml', description: 'Google Earth' },
  { id: 'shapefile', label: 'Shapefile', extension: '.zip', description: 'Esri Shapefile' },
  { id: 'flatgeobuf', label: 'FlatGeobuf', extension: '.fgb', description: 'FlatGeobuf' },
  { id: 'geopackage', label: 'GeoPackage', extension: '.gpkg', description: 'OGC GeoPackage' },
];

const meta: Meta<ExportModalProps> = {
  title: 'Components/ExportModal',
  component: ExportModal,
  parameters: {
    docs: {
      description: {
        component:
          'Modal dialog for exporting layer data in multiple geospatial formats. Supports layer selection, format selection, and optional CQL2 filter application.',
      },
    },
  },
  argTypes: {
    onExport: { action: 'export' },
    onClose: { action: 'close' },
  },
};

export default meta;

type Story = StoryObj<ExportModalProps>;

export const Default: Story = {
  args: {
    open: true,
    layers: sampleLayers,
    availableFormats: sampleFormats,
    hasActiveFilter: () => false,
  },
};

export const SingleLayer: Story = {
  args: {
    open: true,
    layers: [sampleLayers[0]],
    availableFormats: sampleFormats,
    hasActiveFilter: () => false,
  },
};

export const WithFilters: Story = {
  args: {
    open: true,
    layers: sampleLayers,
    availableFormats: sampleFormats,
    hasActiveFilter: (layerId: string) => layerId === 'countries',
  },
};

export const Loading: Story = {
  args: {
    open: true,
    layers: sampleLayers,
    availableFormats: sampleFormats,
    hasActiveFilter: () => false,
    loading: true,
    progress: 'Fetching features... (500 of 2000)',
  },
};

export const ErrorState: Story = {
  args: {
    open: true,
    layers: sampleLayers,
    availableFormats: sampleFormats,
    hasActiveFilter: () => false,
    error: 'Failed to fetch features: Network error',
  },
};

export const WithSelection: Story = {
  args: {
    open: true,
    layers: sampleLayers,
    availableFormats: sampleFormats,
    hasActiveFilter: () => false,
    selectionCount: 12,
    selectionLayerId: 'countries',
  },
};
