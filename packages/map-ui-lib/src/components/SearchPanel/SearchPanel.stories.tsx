import { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchPanel } from './SearchPanel';
import type { SearchPanelProps } from './SearchPanel';
import type { LayerConfig, SearchFilterValues } from '../../types';

const countriesLayer: LayerConfig = {
  id: 'countries',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
  search: {
    fields: [
      { property: 'name', label: 'Country Name', type: 'text', placeholder: 'Search countries...' },
      {
        property: 'continent',
        label: 'Continent',
        type: 'select',
        options: ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],
        placeholder: 'All continents',
      },
    ],
  },
};

const citiesLayer: LayerConfig = {
  id: 'cities',
  sourceId: 'tipg',
  collection: 'ne_110m_populated_places',
  label: 'Populated Places',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 } },
  search: {
    fields: [
      { property: 'name', label: 'City Name', type: 'text', placeholder: 'Search cities...' },
      { property: 'pop_min', label: 'Min Population', type: 'number', placeholder: '0' },
    ],
  },
};

const riversLayer: LayerConfig = {
  id: 'rivers',
  sourceId: 'tipg',
  collection: 'ne_110m_rivers_lake_centerlines',
  label: 'Rivers',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 } },
};

const selectOnlyLayer: LayerConfig = {
  id: 'regions',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Regions',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#27ae60', 'fill-opacity': 0.5 } },
  search: {
    fields: [
      {
        property: 'region',
        label: 'Region',
        type: 'select',
        options: ['Americas', 'Europe', 'Africa', 'Asia', 'Oceania'],
        placeholder: 'All regions',
      },
      {
        property: 'subregion',
        label: 'Sub-Region',
        type: 'select',
        options: ['Northern America', 'Western Europe', 'Eastern Africa', 'South-Eastern Asia'],
        placeholder: 'All sub-regions',
      },
    ],
  },
};

function InteractiveSearchPanel(props: SearchPanelProps) {
  const [filters, setFilters] = useState<Record<string, SearchFilterValues>>(props.activeFilters);

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: string | number | undefined) => {
      setFilters((prev) => ({
        ...prev,
        [layerId]: { ...prev[layerId], [property]: value },
      }));
      props.onFilterChange(layerId, property, value);
    },
    [props.onFilterChange],
  );

  const handleClearFilters = useCallback(
    (layerId: string) => {
      setFilters((prev) => ({ ...prev, [layerId]: {} }));
      props.onClearFilters(layerId);
    },
    [props.onClearFilters],
  );

  return (
    <SearchPanel
      {...props}
      activeFilters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
    />
  );
}

const meta: Meta<SearchPanelProps> = {
  title: 'Components/SearchPanel',
  component: SearchPanel,
  render: (args) => <InteractiveSearchPanel {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'A controlled search/filter panel that renders per-layer filter inputs based on search config. Supports text, number, and select field types.',
      },
    },
  },
  argTypes: {
    onFilterChange: { action: 'filterChange' },
    onClearFilters: { action: 'clearFilters' },
  },
};

export default meta;

type Story = StoryObj<SearchPanelProps>;

/** Default panel with text and select fields on a single layer. */
export const Default: Story = {
  args: {
    layers: [countriesLayer],
    activeFilters: {},
  },
};

/** Panel with pre-populated filter values and a visible Clear button. */
export const WithActiveFilters: Story = {
  args: {
    layers: [countriesLayer],
    activeFilters: {
      countries: { name: 'France', continent: 'Europe' },
    },
  },
};

/** Panel showing only select-type fields. */
export const SelectFields: Story = {
  args: {
    layers: [selectOnlyLayer],
    activeFilters: {},
  },
};

/** Multiple layers with mixed field types (text, number, select). */
export const MixedFieldTypes: Story = {
  args: {
    layers: [countriesLayer, citiesLayer],
    activeFilters: {},
  },
};

/** No layers have search config defined. */
export const NoSearchableLayers: Story = {
  args: {
    layers: [riversLayer],
    activeFilters: {},
  },
};
