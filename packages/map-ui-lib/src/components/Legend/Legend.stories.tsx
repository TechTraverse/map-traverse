import type { Meta, StoryObj } from '@storybook/react';
import { Legend } from './Legend';
import type { LayerConfig } from '../../types';

const countriesLayer: LayerConfig = {
  id: 'countries',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
  legend: {
    entries: [
      { label: 'Countries', color: '#4a90d9', shape: 'square' },
    ],
  },
};

const riversLayer: LayerConfig = {
  id: 'rivers',
  sourceId: 'naturalearth',
  collection: 'ne_110m_rivers_lake_centerlines',
  label: 'Rivers',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'line', paint: { 'line-color': '#2196f3', 'line-width': 2, 'line-opacity': 1 } },
  legend: {
    entries: [
      { label: 'Rivers', color: '#2196f3', shape: 'line' },
    ],
  },
};

const placesLayer: LayerConfig = {
  id: 'places',
  sourceId: 'naturalearth',
  collection: 'ne_110m_populated_places',
  label: 'Populated Places',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 1 } },
  legend: {
    entries: [
      { label: 'Populated Places', color: '#e74c3c', shape: 'circle' },
    ],
  },
};

const countriesAutoLayer: LayerConfig = {
  id: 'countries-auto',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#27ae60', 'fill-opacity': 0.5 } },
};

const riversAutoLayer: LayerConfig = {
  id: 'rivers-auto',
  sourceId: 'naturalearth',
  collection: 'ne_110m_rivers_lake_centerlines',
  label: 'Rivers',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'line', paint: { 'line-color': '#3498db', 'line-width': 2, 'line-opacity': 1 } },
};

const placesAutoLayer: LayerConfig = {
  id: 'places-auto',
  sourceId: 'naturalearth',
  collection: 'ne_110m_populated_places',
  label: 'Populated Places',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e67e22', 'circle-radius': 4, 'circle-opacity': 1 } },
};

const multiEntryLayer: LayerConfig = {
  id: 'land-use',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Land Use',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.7 } },
  legend: {
    entries: [
      { label: 'Forest', color: '#27ae60', shape: 'square' },
      { label: 'Agriculture', color: '#f1c40f', shape: 'square' },
      { label: 'Urban', color: '#95a5a6', shape: 'square' },
    ],
  },
};

const noStyleLayer: LayerConfig = {
  id: 'unstyled',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Unstyled Layer',
  visible: true,
  dataMode: 'vector-tiles',
};

const meta: Meta<typeof Legend> = {
  title: 'Components/Legend',
  component: Legend,
  parameters: {
    docs: {
      description: {
        component:
          'Displays legend entries for visible map layers. Supports explicit legend configuration and auto-derivation from layer styles.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Legend>;

/** Default legend with explicit legend entries for all layer types. */
export const Default: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer],
    visibleLayerIds: ['countries', 'rivers', 'places'],
  },
};

/** Legend entries auto-derived from layer style paint properties. */
export const AutoDerived: Story = {
  args: {
    layers: [countriesAutoLayer, riversAutoLayer, placesAutoLayer],
    visibleLayerIds: ['countries-auto', 'rivers-auto', 'places-auto'],
  },
};

/** Mix of explicit legend entries, auto-derived entries, multi-entry legends, and unstyled layers. */
export const MixedLegends: Story = {
  args: {
    layers: [countriesLayer, riversAutoLayer, multiEntryLayer, noStyleLayer],
    visibleLayerIds: ['countries', 'rivers-auto', 'land-use', 'unstyled'],
  },
};

/** No visible layers — component returns null. */
export const NoVisibleLayers: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer],
    visibleLayerIds: [],
  },
};
