import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
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

const noLegendLayer: LayerConfig = {
  id: 'unstyled',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Unstyled Layer (No Legend)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#27ae60', 'fill-opacity': 0.5 } },
};

const categoricalLayer: LayerConfig = {
  id: 'countries-by-region',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries by Region',
  visible: true,
  dataMode: 'vector-tiles',
  style: {
    type: 'fill',
    paint: {
      'fill-color': [
        'match',
        ['get', 'REGION_UN'],
        'Europe', '#4a90d9',
        'Africa', '#e74c3c',
        'Americas', '#2ecc71',
        'Asia', '#f39c12',
        'Oceania', '#9b59b6',
        '#95a5a6',
      ],
      'fill-opacity': 0.7,
    },
  },
  legend: {
    displayMode: 'categorical',
    entries: [
      { label: 'Europe', color: '#4a90d9', shape: 'square' },
      { label: 'Africa', color: '#e74c3c', shape: 'square' },
      { label: 'Americas', color: '#2ecc71', shape: 'square' },
      { label: 'Asia', color: '#f39c12', shape: 'square' },
      { label: 'Oceania', color: '#9b59b6', shape: 'square' },
      { label: 'Other', color: '#95a5a6', shape: 'square' },
    ],
  },
};

const categoricalWithLabelsLayer: LayerConfig = {
  ...categoricalLayer,
  id: 'countries-by-region-labels',
  label: 'Regions (Labels Visible)',
  legend: {
    ...categoricalLayer.legend!,
    showLabelsCollapsed: true,
  },
};

const gradientLayer: LayerConfig = {
  id: 'population-density',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Population Density',
  visible: true,
  dataMode: 'vector-tiles',
  style: {
    type: 'fill',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'POP_EST'],
        0, '#ffffcc',
        1000000, '#a1dab4',
        10000000, '#41b6c4',
        100000000, '#2c7fb8',
        1000000000, '#253494',
      ],
      'fill-opacity': 0.8,
    },
  },
  legend: {
    displayMode: 'gradient',
    gradientProperty: 'POP_EST',
    entries: [
      { label: '0', color: '#ffffcc', shape: 'square' },
      { label: '1M', color: '#a1dab4', shape: 'square' },
      { label: '10M', color: '#41b6c4', shape: 'square' },
      { label: '100M', color: '#2c7fb8', shape: 'square' },
      { label: '1B', color: '#253494', shape: 'square' },
    ],
  },
};

const expressionWithOverrideLayer: LayerConfig = {
  id: 'countries-override',
  sourceId: 'naturalearth',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries (Manual Legend)',
  visible: true,
  dataMode: 'vector-tiles',
  style: {
    type: 'fill',
    paint: {
      'fill-color': [
        'match',
        ['get', 'REGION_UN'],
        'Europe', '#4a90d9',
        'Africa', '#e74c3c',
        '#95a5a6',
      ],
      'fill-opacity': 0.7,
    },
  },
  legend: {
    entries: [
      { label: 'European Countries', color: '#4a90d9', shape: 'square' },
      { label: 'African Countries', color: '#e74c3c', shape: 'square' },
      { label: 'Other', color: '#95a5a6', shape: 'square' },
    ],
  },
};

const meta: Meta<typeof Legend> = {
  title: 'Components/Legend',
  component: Legend,
  parameters: {
    docs: {
      description: {
        component:
          'Displays legend entries for visible map layers. Only layers with explicit legend configuration are shown. Supports simple, categorical (segmented color bar), and gradient (smooth color bar) display modes.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Legend>;

/** Default legend with simple entries for all layer types. */
export const Default: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer],
    visibleLayerIds: ['countries', 'rivers', 'places'],
  },
};

/** Layers without legend config do not appear. The noLegendLayer is visible but has no legend. */
export const NoLegendConfig: Story = {
  args: {
    layers: [countriesLayer, noLegendLayer, riversLayer],
    visibleLayerIds: ['countries', 'unstyled', 'rivers'],
  },
};

/** Multi-entry simple legend with explicit entries. */
export const MultiEntry: Story = {
  args: {
    layers: [multiEntryLayer],
    visibleLayerIds: ['land-use'],
  },
};

/** Categorical legend with segmented color bar and expandable entry list. */
export const CategoricalLegend: Story = {
  args: {
    layers: [categoricalLayer],
    visibleLayerIds: ['countries-by-region'],
  },
};

/** Categorical legend with showLabelsCollapsed enabled. */
export const CategoricalWithLabels: Story = {
  args: {
    layers: [categoricalWithLabelsLayer],
    visibleLayerIds: ['countries-by-region-labels'],
  },
};

/** Categorical legend with showColorBar: false — no color bar in collapsed state. */
export const CategoricalNoColorBar: Story = {
  args: {
    layers: [
      {
        ...categoricalLayer,
        id: 'countries-no-bar',
        label: 'Countries (No Color Bar)',
        legend: {
          ...categoricalLayer.legend!,
          showColorBar: false,
        },
      },
    ],
    visibleLayerIds: ['countries-no-bar'],
  },
};

/** Gradient legend with smooth color bar and expandable property/range info. */
export const GradientLegend: Story = {
  args: {
    layers: [gradientLayer],
    visibleLayerIds: ['population-density'],
  },
};

/** Categorical legend with showDisclosureArrow: true and showColorBar: false — arrow visible, no color bar. */
export const CategoricalArrowNoColorBar: Story = {
  args: {
    layers: [
      {
        ...categoricalLayer,
        id: 'countries-arrow-no-bar',
        label: 'Countries (Arrow, No Color Bar)',
        legend: {
          ...categoricalLayer.legend!,
          showColorBar: false,
          showDisclosureArrow: true,
        },
      },
    ],
    visibleLayerIds: ['countries-arrow-no-bar'],
  },
};

/** Categorical legend with showDisclosureArrow: false — no arrow, narrow color bar, aligns with simple rows. */
export const CategoricalNoArrow: Story = {
  args: {
    layers: [
      {
        ...categoricalLayer,
        id: 'countries-no-arrow',
        label: 'Countries (No Arrow)',
        legend: {
          ...categoricalLayer.legend!,
          showDisclosureArrow: false,
        },
      },
    ],
    visibleLayerIds: ['countries-no-arrow'],
  },
};

/** Mix of all display modes — simple rows indent to align with arrow-offset rows. */
export const MixedModes: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer, categoricalLayer, gradientLayer, noLegendLayer],
    visibleLayerIds: ['countries', 'rivers', 'places', 'countries-by-region', 'population-density', 'unstyled'],
  },
};

/** Expression layer with explicit simple legend entries (override). */
export const ExpressionWithOverride: Story = {
  args: {
    layers: [expressionWithOverrideLayer],
    visibleLayerIds: ['countries-override'],
  },
};

/** No visible layers — component returns null. */
export const NoVisibleLayers: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer],
    visibleLayerIds: [],
  },
};

/** Legend with expand button and opacity sliders. Click the expand icon to reveal sliders. */
export const Expanded: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer, categoricalLayer, gradientLayer],
    visibleLayerIds: ['countries', 'rivers', 'places', 'countries-by-region', 'population-density'],
    onOpacityChange: fn(),
  },
};

/** Legend with a dark background and light text — useful on satellite basemaps. */
export const DarkBackground: Story = {
  args: {
    layers: [countriesLayer, riversLayer, placesLayer],
    visibleLayerIds: ['countries', 'rivers', 'places'],
    display: {
      background: '#0f172a',
      textColor: '#f1f5f9',
      borderColor: '#334155',
    },
  },
};

/** Legend with outline-only swatches — for layers that style only the outline. */
export const OutlineOnlySwatches: Story = {
  args: {
    layers: [
      {
        id: 'parcels-outline',
        sourceId: 'demo',
        collection: 'parcels',
        label: 'Parcels',
        visible: true,
        dataMode: 'vector-tiles',
        legend: {
          entries: [
            {
              label: 'Residential parcel',
              color: '#1f6527',
              shape: 'outline-square',
              outlineColor: '#1f6527',
              outlineWidth: 2,
            },
          ],
        },
      },
      {
        id: 'fire-zones',
        sourceId: 'demo',
        collection: 'fire',
        label: 'Fire zones',
        visible: true,
        dataMode: 'vector-tiles',
        legend: {
          entries: [
            {
              label: 'Restricted area',
              color: '#dc2626',
              shape: 'outline-circle',
              outlineColor: '#dc2626',
              outlineWidth: 2,
            },
          ],
        },
      },
    ],
    visibleLayerIds: ['parcels-outline', 'fire-zones'],
  },
};

/** Outline swatches with dashed strokes — drives the same dasharray field used by the `line` shape. */
export const DashedOutlineSwatches: Story = {
  args: {
    layers: [
      {
        id: 'planning-zones',
        sourceId: 'demo',
        collection: 'planning',
        label: 'Planning zones',
        visible: true,
        dataMode: 'vector-tiles',
        legend: {
          displayMode: 'categorical',
          showColorBar: false,
          entries: [
            {
              label: 'Proposed boundary',
              color: '#1d4ed8',
              shape: 'outline-square',
              outlineColor: '#1d4ed8',
              outlineWidth: 1.5,
              dasharray: [3, 2],
            },
            {
              label: 'Approved boundary',
              color: '#1d4ed8',
              shape: 'outline-square',
              outlineColor: '#1d4ed8',
              outlineWidth: 1.5,
            },
            {
              label: 'Proposed buffer',
              color: '#b45309',
              shape: 'outline-circle',
              outlineColor: '#b45309',
              outlineWidth: 1.5,
              dasharray: [2, 2],
            },
            {
              label: 'Approved buffer',
              color: '#b45309',
              shape: 'outline-circle',
              outlineColor: '#b45309',
              outlineWidth: 1.5,
            },
          ],
        },
      },
    ],
    visibleLayerIds: ['planning-zones'],
  },
};
