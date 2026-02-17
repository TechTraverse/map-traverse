import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LayerPanel } from './LayerPanel';
import type { LayerPanelProps } from './LayerPanel';
import type { LayerConfig } from '../../types';

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
    label: 'Populated Places',
    visible: true,
    dataMode: 'geojson',
    style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 } },
  },
];

function InteractiveLayerPanel(props: LayerPanelProps) {
  const [activeIds, setActiveIds] = useState(props.activeLayerIds);
  const [layers, setLayers] = useState(props.layers);

  const handleToggle = (layerId: string) => {
    setActiveIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
    );
    props.onToggleVisibility(layerId);
  };

  const handleReorder = props.onReorder
    ? (newIds: string[]) => {
        setLayers((prev) => newIds.map((id) => prev.find((l) => l.id === id)!));
        props.onReorder!(newIds);
      }
    : undefined;

  return (
    <LayerPanel
      {...props}
      layers={layers}
      activeLayerIds={activeIds}
      onToggleVisibility={handleToggle}
      onReorder={handleReorder}
    />
  );
}

const meta: Meta<LayerPanelProps> = {
  title: 'Components/LayerPanel',
  component: LayerPanel,
  render: (args) => <InteractiveLayerPanel {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'A controlled layer panel that displays a checkbox list of map layers. Supports toggling visibility and optional drag-to-reorder.',
      },
    },
  },
  argTypes: {
    onToggleVisibility: { action: 'toggleVisibility' },
    onReorder: { action: 'reorder' },
  },
};

export default meta;

type Story = StoryObj<LayerPanelProps>;

/** Default panel with all layers visible. */
export const Default: Story = {
  args: {
    layers: sampleLayers,
    activeLayerIds: ['countries', 'rivers', 'cities'],
  },
};

/** All layers toggled off. */
export const AllHidden: Story = {
  args: {
    layers: sampleLayers,
    activeLayerIds: [],
  },
};

/** Drag-to-reorder enabled via the onReorder prop. */
export const WithReorder: Story = {
  args: {
    layers: sampleLayers,
    activeLayerIds: ['countries', 'rivers', 'cities'],
    onReorder: undefined, // triggers action logging; InteractiveLayerPanel handles state
  },
  render: (args) => (
    <InteractiveLayerPanel
      {...args}
      onReorder={(ids) => {
        // action logged via argTypes
      }}
    />
  ),
};

/** Panel with a single layer entry. */
export const SingleLayer: Story = {
  args: {
    layers: [sampleLayers[0]],
    activeLayerIds: ['countries'],
  },
};
