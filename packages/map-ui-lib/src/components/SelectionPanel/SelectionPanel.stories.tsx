import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LayerConfig } from '../../types';
import type { SelectionMode } from '../../utils/selection';
import { SelectionPanel } from './SelectionPanel';
import { QueryPanel } from '../QueryPanel/QueryPanel';
import type { FilterRuleGroup } from '../../types';

const meta: Meta<typeof SelectionPanel> = {
  title: 'Map UI/SelectionPanel',
  component: SelectionPanel,
  parameters: {
    docs: {
      description: {
        component:
          'Selection tool controls for click or box selection of map features. Displays layer picker, mode toggle, selection count, and action buttons.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SelectionPanel>;

const sampleLayers: LayerConfig[] = [
  { id: 'parcels', label: 'Parcels', sourceId: 's1', collection: 'parcels', dataMode: 'vector-tiles', visible: true },
  { id: 'roads', label: 'Roads', sourceId: 's1', collection: 'roads', dataMode: 'vector-tiles', visible: true },
  { id: 'hidden', label: 'Hidden Layer', sourceId: 's1', collection: 'hidden', dataMode: 'vector-tiles', visible: false },
] as LayerConfig[];

export const NoLayerSelected: Story = {
  render: () => (
    <div className="mapui:max-w-xs">
      <SelectionPanel
        mode={null}
        onModeChange={() => {}}
        layers={sampleLayers}
        activeLayerId={null}
        onActiveLayerChange={() => {}}
        selectedCount={0}
        onClear={() => {}}
        onViewResults={() => {}}
        className="mapui:p-3"
      />
    </div>
  ),
};

export const LayerSelected: Story = {
  render: () => (
    <div className="mapui:max-w-xs">
      <SelectionPanel
        mode={null}
        onModeChange={() => {}}
        layers={sampleLayers}
        activeLayerId="parcels"
        onActiveLayerChange={() => {}}
        selectedCount={0}
        onClear={() => {}}
        onViewResults={() => {}}
        className="mapui:p-3"
      />
    </div>
  ),
};

export const ClickMode: Story = {
  render: () => (
    <div className="mapui:max-w-xs">
      <SelectionPanel
        mode="click"
        onModeChange={() => {}}
        layers={sampleLayers}
        activeLayerId="parcels"
        onActiveLayerChange={() => {}}
        selectedCount={0}
        onClear={() => {}}
        onViewResults={() => {}}
        className="mapui:p-3"
      />
    </div>
  ),
};

export const WithSelections: Story = {
  render: () => (
    <div className="mapui:max-w-xs">
      <SelectionPanel
        mode="click"
        onModeChange={() => {}}
        layers={sampleLayers}
        activeLayerId="parcels"
        onActiveLayerChange={() => {}}
        selectedCount={3}
        onClear={() => {}}
        onViewResults={() => {}}
        className="mapui:p-3"
      />
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [mode, setMode] = useState<SelectionMode | null>(null);
    const [layerId, setLayerId] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    return (
      <div className="mapui:max-w-xs">
        <SelectionPanel
          mode={mode}
          onModeChange={setMode}
          layers={sampleLayers}
          activeLayerId={layerId}
          onActiveLayerChange={(id) => { setLayerId(id); setCount(0); }}
          selectedCount={count}
          onClear={() => setCount(0)}
          onViewResults={() => alert(`Viewing ${count} results`)}
          className="mapui:p-3"
        />
        {layerId && mode && (
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="mapui:mt-2 mapui:ml-3 mapui:rounded mapui:bg-slate-200 mapui:px-3 mapui:py-1 mapui:text-xs"
          >
            Simulate selection (+1)
          </button>
        )}
      </div>
    );
  },
};

const sampleFilter: FilterRuleGroup = {
  id: 'g1',
  combinator: 'and',
  rules: [
    {
      id: 'r1',
      property: 'geom',
      operator: 's_dwithin',
      value: { kind: 'static', value: null },
      spatial: {
        distance: { kind: 'parameter', name: 'distance', label: 'Distance (ft)', default: 100 },
        units: 'feet',
      },
    },
  ],
  limit: 50,
};

export const WithQueryPanel: Story = {
  render: () => (
    <div className="mapui:max-w-xs">
      <SelectionPanel
        mode="click"
        onModeChange={() => {}}
        layers={sampleLayers}
        activeLayerId="parcels"
        onActiveLayerChange={() => {}}
        selectedCount={2}
        onClear={() => {}}
        onViewResults={() => {}}
        queryPanel={
          <QueryPanel
            cql2Filter={sampleFilter}
            onRun={(params) => alert(JSON.stringify(params))}
            hasSelectionGeometry={true}
          />
        }
        className="mapui:p-3"
      />
    </div>
  ),
};
