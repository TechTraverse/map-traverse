import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { GlobalSearchConfig, LayerConfig, AvailableProperty } from '../../types';
import { GlobalSearchConfigEditor } from './GlobalSearchConfigEditor';

const meta: Meta<typeof GlobalSearchConfigEditor> = {
  title: 'Admin/GlobalSearchConfigEditor',
  component: GlobalSearchConfigEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Configures the global (cross-layer) search bar: which layers participate, which properties are searchable, and per-property autocomplete/prefetch flags.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof GlobalSearchConfigEditor>;

const mockLayers: LayerConfig[] = [
  {
    id: 'cities',
    sourceId: 'src',
    collection: 'cities',
    label: 'Cities',
    visible: true,
    dataMode: 'vector-tiles',
  },
  {
    id: 'parks',
    sourceId: 'src',
    collection: 'parks',
    label: 'Parks',
    visible: true,
    dataMode: 'vector-tiles',
  },
  {
    id: 'roads',
    sourceId: 'src',
    collection: 'roads',
    label: 'Roads',
    visible: true,
    dataMode: 'vector-tiles',
  },
];

const mockPropsByLayer: Record<string, AvailableProperty[]> = {
  cities: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'population', title: 'Population', type: 'number' },
    { name: 'country', title: 'Country', type: 'string' },
  ],
  parks: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'park_type', title: 'Type', type: 'string' },
  ],
  roads: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'classification', title: 'Class', type: 'string' },
  ],
};

const baseDefaults: GlobalSearchConfig = {
  enabled: true,
  maxResultsPerLayer: 10,
  debounceMs: 250,
  minQueryLength: 2,
  layers: [],
};

function Wrapper({ initial, propertiesByLayer = mockPropsByLayer, isLoadingProperties }: {
  initial: GlobalSearchConfig;
  propertiesByLayer?: Record<string, AvailableProperty[]>;
  isLoadingProperties?: Record<string, boolean>;
}) {
  const [value, setValue] = useState<GlobalSearchConfig>(initial);
  return (
    <div className="mapui:max-w-2xl mapui:p-4">
      <GlobalSearchConfigEditor
        value={value}
        onChange={setValue}
        layers={mockLayers}
        propertiesByLayer={propertiesByLayer}
        isLoadingProperties={isLoadingProperties}
      />
      <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export const Empty: Story = {
  render: () => <Wrapper initial={baseDefaults} />,
};

export const OneLayer: Story = {
  render: () => (
    <Wrapper
      initial={{
        ...baseDefaults,
        placeholder: 'Search cities…',
        layers: [
          {
            layerId: 'cities',
            properties: [{ property: 'name', label: 'City Name', autocomplete: true }],
          },
        ],
      }}
    />
  ),
};

export const MultiLayerMultiProperty: Story = {
  render: () => (
    <Wrapper
      initial={{
        ...baseDefaults,
        layers: [
          {
            layerId: 'cities',
            properties: [
              { property: 'name', autocomplete: true },
              { property: 'country', prefetch: true },
            ],
          },
          {
            layerId: 'parks',
            properties: [
              { property: 'name', label: 'Park Name' },
              { property: 'park_type', prefetch: true },
            ],
          },
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true }],
          },
        ],
      }}
    />
  ),
};

export const LoadingProperties: Story = {
  render: () => (
    <Wrapper
      initial={{
        ...baseDefaults,
        layers: [{ layerId: 'cities', properties: [{ property: 'name' }] }],
      }}
      isLoadingProperties={{ cities: true }}
    />
  ),
};

export const NoPropertiesAvailable: Story = {
  render: () => (
    <Wrapper
      initial={{
        ...baseDefaults,
        layers: [{ layerId: 'parks', properties: [{ property: '' }] }],
      }}
      propertiesByLayer={{ ...mockPropsByLayer, parks: [] }}
    />
  ),
};
