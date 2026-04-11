import { useState, useCallback, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchPanel } from './SearchPanel';
import type { SearchPanelProps } from './SearchPanel';
import type { LayerConfig, SearchFilterValues, SearchFilterValue, FilterRule, AvailableProperty } from '../../types';

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

// --- New fixture layers for Phase 3 ---

const autocompleteLayer: LayerConfig = {
  id: 'autocomplete-demo',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries (Autocomplete)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.5 } },
  search: {
    fields: [
      {
        property: 'name',
        label: 'Country',
        type: 'text',
        autocomplete: true,
        options: ['France', 'Germany', 'Spain', 'Italy', 'United Kingdom'],
        placeholder: 'Type a country...',
      },
    ],
  },
};

const dateRangeLayer: LayerConfig = {
  id: 'date-range-demo',
  sourceId: 'tipg',
  collection: 'observations',
  label: 'Observations (Date Range)',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e67e22', 'circle-radius': 5, 'circle-opacity': 0.8 } },
  search: {
    fields: [
      {
        property: 'datetime',
        label: 'Date Range',
        type: 'datetime',
        range: true,
      },
    ],
  },
};

const numericSliderLayer: LayerConfig = {
  id: 'slider-demo',
  sourceId: 'tipg',
  collection: 'ne_110m_populated_places',
  label: 'Population (Slider)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'circle', paint: { 'circle-color': '#1abc9c', 'circle-radius': 5, 'circle-opacity': 0.8 } },
  search: {
    fields: [
      {
        property: 'pop_min',
        label: 'Min Population',
        type: 'number',
        inputMode: 'slider',
        operator: 'gte',
        min: 0,
        max: 1000000,
        step: 10000,
      },
    ],
  },
};

const numericBetweenLayer: LayerConfig = {
  id: 'between-demo',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'GDP (Between)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#3498db', 'fill-opacity': 0.5 } },
  search: {
    fields: [
      {
        property: 'gdp_md_est',
        label: 'GDP (Millions USD)',
        type: 'number',
        operator: 'between',
        min: 0,
        max: 100,
      },
    ],
  },
};

const numericOperatorLayer: LayerConfig = {
  id: 'operator-demo',
  sourceId: 'tipg',
  collection: 'ne_110m_populated_places',
  label: 'Population (Operator)',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 } },
  search: {
    fields: [
      {
        property: 'pop_min',
        label: 'Population',
        type: 'number',
        operator: 'gt',
        placeholder: '0',
      },
    ],
  },
};

const allFieldTypesLayer: LayerConfig = {
  id: 'all-types',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'All Field Types',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#2c3e50', 'fill-opacity': 0.4 } },
  search: {
    fields: [
      {
        property: 'name',
        label: 'Name (Autocomplete)',
        type: 'text',
        autocomplete: true,
        options: ['France', 'Germany', 'Spain', 'Italy', 'United Kingdom'],
        placeholder: 'Type a country...',
      },
      {
        property: 'continent',
        label: 'Continent (Select)',
        type: 'select',
        options: ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],
        placeholder: 'All continents',
      },
      {
        property: 'datetime',
        label: 'Date Range',
        type: 'datetime',
        range: true,
      },
      {
        property: 'pop_est',
        label: 'Population (Slider ≥)',
        type: 'number',
        inputMode: 'slider',
        operator: 'gte',
        min: 0,
        max: 1000000000,
        step: 1000000,
      },
      {
        property: 'gdp_md_est',
        label: 'GDP (Between)',
        type: 'number',
        operator: 'between',
        min: 0,
        max: 50000,
      },
    ],
  },
};

function InteractiveSearchPanel(props: SearchPanelProps) {
  const [filters, setFilters] = useState<Record<string, SearchFilterValues>>(props.activeFilters);

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: SearchFilterValue) => {
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

  const [expanded, setExpanded] = useState(props.expanded ?? false);
  const [customRules, setCustomRules] = useState<Record<string, FilterRule[]>>(props.customRules ?? {});

  return (
    <SearchPanel
      {...props}
      activeFilters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      expanded={props.expandable ? expanded : undefined}
      onExpandedChange={props.expandable ? setExpanded : undefined}
      customRules={props.expandable ? customRules : undefined}
      onCustomRulesChange={props.expandable ? (layerId, rules) =>
        setCustomRules((prev) => ({ ...prev, [layerId]: rules })) : undefined}
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
          'A controlled search/filter panel that renders per-layer filter inputs based on search config. Supports text, number, datetime, and select field types with autocomplete, range, slider, and operator variants.',
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

/** Text field with autocomplete dropdown from options list. */
export const AutocompleteText: Story = {
  args: {
    layers: [autocompleteLayer],
    activeFilters: {},
  },
};

/** Datetime field rendered as two stacked From/To inputs. */
export const DateRange: Story = {
  args: {
    layers: [dateRangeLayer],
    activeFilters: {},
  },
};

/** Number field rendered as a range slider with value label. */
export const NumericSlider: Story = {
  args: {
    layers: [numericSliderLayer],
    activeFilters: {},
  },
};

/** Number field with operator `between` — renders min/max inputs. */
export const NumericBetween: Story = {
  args: {
    layers: [numericBetweenLayer],
    activeFilters: {},
  },
};

/** Number field with operator dropdown and plain number input. */
export const NumericWithOperator: Story = {
  args: {
    layers: [numericOperatorLayer],
    activeFilters: {},
  },
};

/** All field variants in a single panel. */
export const AllFieldTypes: Story = {
  args: {
    layers: [allFieldTypesLayer],
    activeFilters: {},
  },
};

// Layer for AutocompleteDynamic — no static options, relies on onFetchSuggestions callback
const autocompleteDynamicLayer: LayerConfig = {
  id: 'autocomplete-dynamic',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries (Dynamic Autocomplete)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#8e44ad', 'fill-opacity': 0.5 } },
  search: {
    fields: [
      {
        property: 'name',
        label: 'Country',
        type: 'text',
        autocomplete: true,
        placeholder: 'Type to search...',
      },
    ],
  },
};

const SIMULATED_API_RESULTS: Record<string, string[]> = {
  fr: ['France', 'French Guiana', 'French Polynesia'],
  ge: ['Germany', 'Georgia', 'Georgiasland'],
  sp: ['Spain'],
  it: ['Italy'],
  un: ['United Kingdom', 'United States', 'United Arab Emirates'],
  po: ['Portugal', 'Poland'],
};

/**
 * Autocomplete panel where suggestions are fetched asynchronously via
 * `onFetchSuggestions`. Simulates a 300 ms API delay and returns results
 * keyed on the first two characters of the query.
 */
export const AutocompleteDynamic: Story = {
  render: (args) => {
    const [filters, setFilters] = useState<Record<string, SearchFilterValues>>({});
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Record<string, string[]>>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFetchSuggestions = useCallback((layerId: string, property: string, query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const key = query.slice(0, 2).toLowerCase();
        const suggestionKey = `${layerId}:${property}`;
        setAutocompleteSuggestions((prev) => ({
          ...prev,
          [suggestionKey]: SIMULATED_API_RESULTS[key] ?? [],
        }));
      }, 300);
    }, []);

    const handleFilterChange = useCallback((layerId: string, property: string, value: SearchFilterValue) => {
      setFilters((prev) => ({
        ...prev,
        [layerId]: { ...prev[layerId], [property]: value },
      }));
      args.onFilterChange(layerId, property, value);
    }, [args.onFilterChange]);

    const handleClearFilters = useCallback((layerId: string) => {
      setFilters((prev) => ({ ...prev, [layerId]: {} }));
      setAutocompleteSuggestions({});
      args.onClearFilters(layerId);
    }, [args.onClearFilters]);

    return (
      <SearchPanel
        {...args}
        layers={[autocompleteDynamicLayer]}
        activeFilters={filters}
        autocompleteSuggestions={autocompleteSuggestions}
        onFetchSuggestions={handleFetchSuggestions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
    );
  },
  args: {
    layers: [autocompleteDynamicLayer],
    activeFilters: {},
  },
};

// Layer for DynamicSelect — no static options, relies on prefetch + onFetchSuggestions
const dynamicSelectLayer: LayerConfig = {
  id: 'dynamic-select-demo',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries (Dynamic Select)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#16a085', 'fill-opacity': 0.5 } },
  search: {
    fields: [
      {
        property: 'continent',
        label: 'Continent',
        type: 'select',
        prefetch: true,
        placeholder: 'All continents',
      },
    ],
  },
};

const SIMULATED_CONTINENT_OPTIONS = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];

/**
 * Select field with `prefetch: true` and no static options. On mount,
 * `onFetchSuggestions` is called automatically and the returned values
 * populate the dropdown. Simulates a 300 ms API delay.
 */
export const DynamicSelect: Story = {
  render: (args) => {
    const [filters, setFilters] = useState<Record<string, SearchFilterValues>>({});
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Record<string, string[]>>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFetchSuggestions = useCallback((layerId: string, property: string, _query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const suggestionKey = `${layerId}:${property}`;
        setAutocompleteSuggestions((prev) => ({
          ...prev,
          [suggestionKey]: SIMULATED_CONTINENT_OPTIONS,
        }));
      }, 300);
    }, []);

    const handleFilterChange = useCallback((layerId: string, property: string, value: SearchFilterValue) => {
      setFilters((prev) => ({
        ...prev,
        [layerId]: { ...prev[layerId], [property]: value },
      }));
      args.onFilterChange(layerId, property, value);
    }, [args.onFilterChange]);

    const handleClearFilters = useCallback((layerId: string) => {
      setFilters((prev) => ({ ...prev, [layerId]: {} }));
      args.onClearFilters(layerId);
    }, [args.onClearFilters]);

    return (
      <SearchPanel
        {...args}
        layers={[dynamicSelectLayer]}
        activeFilters={filters}
        autocompleteSuggestions={autocompleteSuggestions}
        onFetchSuggestions={handleFetchSuggestions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
    );
  },
  args: {
    layers: [dynamicSelectLayer],
    activeFilters: {},
  },
};

// Layer for BackwardCompatible — plain old config without Phase 2/3 options
const backwardCompatibleLayer: LayerConfig = {
  id: 'backward-compat',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries (Legacy Config)',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#7f8c8d', 'fill-opacity': 0.4 } },
  search: {
    fields: [
      { property: 'name', label: 'Name', type: 'text' },
      {
        property: 'continent',
        label: 'Continent',
        type: 'select',
        options: ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],
      },
      { property: 'pop_est', label: 'Population', type: 'number' },
      { property: 'datetime', label: 'Date', type: 'datetime', range: false },
    ],
  },
};

/**
 * Minimal legacy-style config with no Phase 2/3 options (no autocomplete,
 * inputMode, operator, range, etc.). Verifies that schema extensions do not
 * break basic configs.
 */
export const BackwardCompatible: Story = {
  args: {
    layers: [backwardCompatibleLayer],
    activeFilters: {},
  },
};

const mockQueryables: Record<string, AvailableProperty[]> = {
  countries: [
    { name: 'name', title: 'Country Name', type: 'string' },
    { name: 'continent', title: 'Continent', type: 'string', enum: ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'] },
    { name: 'pop_est', title: 'Population', type: 'number' },
    { name: 'gdp_md_est', title: 'GDP (millions)', type: 'number' },
  ],
  cities: [
    { name: 'name', title: 'City Name', type: 'string' },
    { name: 'pop_min', title: 'Min Population', type: 'integer' },
    { name: 'pop_max', title: 'Max Population', type: 'integer' },
  ],
};

/**
 * Expandable search panel with the "All Filters" builder. Click Expand to open
 * the full modal. The builder lets users pick a property, operator, and value
 * for any queryable field, combining with search filters via AND.
 */
export const Expandable: Story = {
  args: {
    layers: [countriesLayer, citiesLayer],
    activeFilters: {},
    expandable: true,
    availableProperties: mockQueryables,
    customRules: {},
  },
};

/** Expanded by default, showing the All Filters builder and modal layout. */
export const ExpandedWithAllFilters: Story = {
  args: {
    layers: [countriesLayer, citiesLayer],
    activeFilters: {},
    expandable: true,
    expanded: true,
    availableProperties: mockQueryables,
    customRules: {},
  },
};
