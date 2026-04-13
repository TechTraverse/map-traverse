import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LuLayers3, LuMap, LuSearch } from 'react-icons/lu';
import { CollapsibleControl } from './CollapsibleControl';
import type { CollapsibleControlProps } from './CollapsibleControl';
import { LayerPanel } from '../LayerPanel';
import { BasemapSwitcher } from '../BasemapSwitcher';
import type { LayerConfig, BasemapConfig } from '../../types';

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
    style: { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2 } },
  },
];

const sampleBasemaps: BasemapConfig[] = [
  { id: 'streets', label: 'Streets', style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', label: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9' },
];

const meta: Meta<CollapsibleControlProps> = {
  title: 'Components/CollapsibleControl',
  component: CollapsibleControl,
  parameters: {
    docs: {
      description: {
        component:
          'A wrapper component that collapses its children into a compact icon button. Useful for map controls that should take minimal space when not in use. Supports both controlled and uncontrolled modes.',
      },
    },
  },
  argTypes: {
    onToggle: { action: 'toggle' },
    corner: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
  },
};

export default meta;

type Story = StoryObj<CollapsibleControlProps>;

/** Default collapsible control with sample panel content. */
export const Default: Story = {
  args: {
    icon: LuLayers3,
    label: 'Layers',
    defaultCollapsed: true,
    children: (
      <div className="mapui:p-4">
        <p className="mapui:text-sm mapui:text-gray-700">
          This is sample panel content that appears when expanded.
        </p>
        <div className="mapui:mt-2 mapui:space-y-2">
          <div className="mapui:p-2 mapui:bg-gray-100 mapui:rounded">Item 1</div>
          <div className="mapui:p-2 mapui:bg-gray-100 mapui:rounded">Item 2</div>
          <div className="mapui:p-2 mapui:bg-gray-100 mapui:rounded">Item 3</div>
        </div>
      </div>
    ),
  },
};

/** Control that starts in expanded state. */
export const DefaultExpanded: Story = {
  args: {
    icon: LuMap,
    label: 'Basemap',
    defaultCollapsed: false,
    children: (
      <div className="mapui:p-4">
        <p className="mapui:text-sm mapui:text-gray-700">This control starts expanded.</p>
      </div>
    ),
  },
};

/** Controlled mode example with external state. */
export const Controlled: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(true);
    return (
      <div className="mapui:space-y-4">
        <div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mapui:px-4 mapui:py-2 mapui:bg-blue-500 mapui:text-white mapui:rounded hover:mapui:bg-blue-600"
          >
            {collapsed ? 'Expand' : 'Collapse'} from External Button
          </button>
        </div>
        <CollapsibleControl
          icon={LuSearch}
          label="Search"
          collapsed={collapsed}
          onToggle={setCollapsed}
        >
          <div className="mapui:p-4">
            <p className="mapui:text-sm mapui:text-gray-700">
              This control's state is managed externally.
            </p>
            <p className="mapui:text-sm mapui:text-gray-500 mapui:mt-2">
              Collapsed: {collapsed ? 'Yes' : 'No'}
            </p>
          </div>
        </CollapsibleControl>
      </div>
    );
  },
};

/** Wrapping a LayerPanel component. */
export const WithLayerPanel: Story = {
  render: () => {
    const [activeIds, setActiveIds] = useState(['countries', 'rivers']);
    const handleToggle = (layerId: string) => {
      setActiveIds((prev) =>
        prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
      );
    };

    return (
      <CollapsibleControl icon={LuLayers3} label="Layers" defaultCollapsed={false}>
        <LayerPanel
          layers={sampleLayers}
          activeLayerIds={activeIds}
          onToggleVisibility={handleToggle}
        />
      </CollapsibleControl>
    );
  },
};

/** Wrapping a BasemapSwitcher component. */
export const WithBasemapSwitcher: Story = {
  render: () => {
    const [activeBasemap, setActiveBasemap] = useState('streets');

    return (
      <CollapsibleControl icon={LuMap} label="Basemap" defaultCollapsed={false}>
        <BasemapSwitcher
          basemaps={sampleBasemaps}
          activeBasemapId={activeBasemap}
          onSelect={setActiveBasemap}
        />
      </CollapsibleControl>
    );
  },
};

/** All four corner positions — demonstrates expansion direction. */
export const CornerPositions: Story = {
  render: () => {
    const panel = (
      <div className="mapui:p-4 mapui:w-48">
        <p className="mapui:text-sm mapui:text-gray-700">Panel content</p>
      </div>
    );
    return (
      <div className="mapui:relative mapui:w-[600px] mapui:h-[400px] mapui:border mapui:border-gray-300 mapui:rounded-lg mapui:bg-gray-50">
        <div className="mapui:absolute mapui:top-4 mapui:right-4">
          <CollapsibleControl icon={LuLayers3} label="Top Right" corner="top-right" defaultCollapsed={false}>
            {panel}
          </CollapsibleControl>
        </div>
        <div className="mapui:absolute mapui:top-4 mapui:left-4">
          <CollapsibleControl icon={LuSearch} label="Top Left" corner="top-left" defaultCollapsed={false}>
            {panel}
          </CollapsibleControl>
        </div>
        <div className="mapui:absolute mapui:bottom-4 mapui:right-4">
          <CollapsibleControl icon={LuMap} label="Bottom Right" corner="bottom-right" defaultCollapsed={false}>
            {panel}
          </CollapsibleControl>
        </div>
        <div className="mapui:absolute mapui:bottom-4 mapui:left-4">
          <CollapsibleControl icon={LuLayers3} label="Bottom Left" corner="bottom-left" defaultCollapsed={false}>
            {panel}
          </CollapsibleControl>
        </div>
      </div>
    );
  },
};

/** Multiple controls demonstrating layout. */
export const MultipleControls: Story = {
  render: () => {
    const [activeLayerIds, setActiveLayerIds] = useState(['countries', 'rivers']);
    const [activeBasemap, setActiveBasemap] = useState('streets');

    const handleToggleLayer = (layerId: string) => {
      setActiveLayerIds((prev) =>
        prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
      );
    };

    return (
      <div className="mapui:flex mapui:gap-4">
        <CollapsibleControl icon={LuLayers3} label="Layers">
          <LayerPanel
            layers={sampleLayers}
            activeLayerIds={activeLayerIds}
            onToggleVisibility={handleToggleLayer}
          />
        </CollapsibleControl>

        <CollapsibleControl icon={LuMap} label="Basemap">
          <BasemapSwitcher
            basemaps={sampleBasemaps}
            activeBasemapId={activeBasemap}
            onSelect={setActiveBasemap}
          />
        </CollapsibleControl>

        <CollapsibleControl icon={LuSearch} label="Search">
          <div className="mapui:p-4 mapui:w-64">
            <input
              type="text"
              placeholder="Search..."
              className="mapui:w-full mapui:px-3 mapui:py-2 mapui:border mapui:border-gray-300 mapui:rounded"
            />
          </div>
        </CollapsibleControl>
      </div>
    );
  },
};
