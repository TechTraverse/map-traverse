import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GlobalSearchBar } from './GlobalSearchBar';
import type {
  GlobalSearchBarProps,
  GroupedResults,
  FeatureMatch,
} from './GlobalSearchBar';
import type { GlobalSearchConfig, LayerConfig } from '../../types';

const countriesLayer: LayerConfig = {
  id: 'countries',
  sourceId: 'tipg',
  collection: 'ne_110m_admin_0_countries',
  label: 'Countries',
  visible: true,
  dataMode: 'vector-tiles',
  style: { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
};

const citiesLayer: LayerConfig = {
  id: 'cities',
  sourceId: 'tipg',
  collection: 'ne_110m_populated_places',
  label: 'Populated Places',
  visible: true,
  dataMode: 'geojson',
  style: { type: 'circle', paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 } },
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

const baseConfig: GlobalSearchConfig = {
  enabled: true,
  placeholder: 'Search features…',
  maxResultsPerLayer: 10,
  debounceMs: 250,
  minQueryLength: 2,
  layers: [],
};

const countryMatches: FeatureMatch[] = [
  { id: 1, label: 'France', matchedProperty: 'name' },
  { id: 2, label: 'French Polynesia', matchedProperty: 'name' },
  { id: 3, label: 'French Guiana', matchedProperty: 'name' },
];

const cityMatches: FeatureMatch[] = [
  { id: 'c1', label: 'Frankfurt', matchedProperty: 'name' },
  { id: 'c2', label: 'Fresno', matchedProperty: 'name' },
];

const riverMatches: FeatureMatch[] = [
  { id: 'r1', label: 'Fraser River', matchedProperty: 'name' },
];

const longCountryMatches: FeatureMatch[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  label: `Country ${i + 1}`,
  matchedProperty: i % 2 === 0 ? 'name' : 'iso_a3',
}));

function Interactive(props: Omit<GlobalSearchBarProps, 'value' | 'onChange'> & { initialValue?: string }) {
  const [value, setValue] = useState(props.initialValue ?? '');
  return <GlobalSearchBar {...props} value={value} onChange={setValue} />;
}

const meta: Meta<typeof GlobalSearchBar> = {
  title: 'Components/GlobalSearchBar',
  component: GlobalSearchBar,
  parameters: {
    docs: {
      description: {
        component:
          'A controlled, presentational global search input with a dropdown of results grouped by layer. No fetching — pass results in via props.',
      },
    },
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'change' },
    onResultClick: { action: 'resultClick' },
  },
};

export default meta;

type Story = StoryObj<typeof GlobalSearchBar>;

/** Empty state — no query, no results. */
export const Empty: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer]}
      results={{}}
      isLoading={false}
    />
  ),
};

/** Loading spinner state — query meets minimum length and a fetch is in flight. */
export const Loading: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer]}
      results={{}}
      isLoading={true}
      initialValue="fr"
    />
  ),
};

/** Single layer with several matches. */
export const SingleLayerResults: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer]}
      results={{ countries: { layer: countriesLayer, matches: countryMatches } }}
      initialValue="fr"
    />
  ),
};

/** Multiple layers, each rendered as its own group. */
export const MultiLayerResults: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer, citiesLayer, riversLayer]}
      results={{
        countries: { layer: countriesLayer, matches: countryMatches },
        cities: { layer: citiesLayer, matches: cityMatches },
        rivers: { layer: riversLayer, matches: riverMatches },
      }}
      initialValue="fr"
    />
  ),
};

/** Query meets minimum length but the result set is empty. */
export const NoResults: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer]}
      results={{}}
      isLoading={false}
      initialValue="zzz"
    />
  ),
};

/** Long list of matches in one layer to verify dropdown scroll behavior. */
export const LongList: Story = {
  render: (args) => (
    <Interactive
      {...args}
      config={baseConfig}
      layers={[countriesLayer]}
      results={{ countries: { layer: countriesLayer, matches: longCountryMatches } }}
      initialValue="co"
    />
  ),
};

// Floating / overlay-style stories ─────────────────────────────────────────
// These illustrate the bar as it would appear over a map: shadow on the
// wrapper, capped width, anchored to a corner or center of the parent.
// Mirrors the SEARCH_POSITION_CLASSES / SEARCH_WIDTH_CLASSES used in the apps.

const SEARCH_POSITION_CLASSES = {
  'top-left':      'mapui:absolute mapui:top-4 mapui:left-4',
  'top-right':     'mapui:absolute mapui:top-4 mapui:right-4',
  'bottom-left':   'mapui:absolute mapui:bottom-4 mapui:left-4',
  'bottom-right':  'mapui:absolute mapui:bottom-4 mapui:right-4',
  'top-center':    'mapui:absolute mapui:top-4 mapui:left-1/2 mapui:-translate-x-1/2',
  'bottom-center': 'mapui:absolute mapui:bottom-6 mapui:left-1/2 mapui:-translate-x-1/2',
} as const;

const SEARCH_WIDTH_CLASSES = {
  sm: 'mapui:w-72',
  md: 'mapui:w-[28rem]',
  lg: 'mapui:w-[40rem]',
} as const;

type SearchPosition = keyof typeof SEARCH_POSITION_CLASSES;
type SearchWidth = keyof typeof SEARCH_WIDTH_CLASSES;

function FauxMap({
  position,
  width,
  open = false,
}: {
  position: SearchPosition;
  width: SearchWidth;
  open?: boolean;
}) {
  return (
    <div className="mapui:relative mapui:w-[800px] mapui:h-[480px] mapui:rounded mapui:overflow-hidden mapui:bg-[linear-gradient(135deg,#dbeafe,#e0f2fe_40%,#bbf7d0)]">
      <div className={`${SEARCH_POSITION_CLASSES[position]} ${SEARCH_WIDTH_CLASSES[width]}`}>
        <Interactive
          config={baseConfig}
          layers={[countriesLayer, citiesLayer]}
          results={
            open
              ? {
                  countries: { layer: countriesLayer, matches: countryMatches },
                  cities: { layer: citiesLayer, matches: cityMatches },
                }
              : {}
          }
          initialValue={open ? 'fr' : ''}
          isLoading={false}
          className="mapui:shadow-lg"
        />
      </div>
    </div>
  );
}

/** All six positions × three widths, idle (empty input). */
export const FloatingPositions: Story = {
  render: () => (
    <div className="mapui:flex mapui:flex-col mapui:gap-6">
      {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as SearchPosition[]).map((pos) => (
        <div key={pos} className="mapui:space-y-2">
          <div className="mapui:text-xs mapui:font-medium mapui:text-slate-600">{pos}</div>
          <FauxMap position={pos} width="md" />
        </div>
      ))}
    </div>
  ),
};

/** Width presets: sm / md / lg, top-left corner. */
export const FloatingWidths: Story = {
  render: () => (
    <div className="mapui:flex mapui:flex-col mapui:gap-6">
      {(['sm', 'md', 'lg'] as SearchWidth[]).map((w) => (
        <div key={w} className="mapui:space-y-2">
          <div className="mapui:text-xs mapui:font-medium mapui:text-slate-600">width: {w}</div>
          <FauxMap position="top-left" width={w} />
        </div>
      ))}
    </div>
  ),
};

/** Centered with the results dropdown open — verifies the listbox anchors below the input even when floating. */
export const FloatingTopCenterOpen: Story = {
  render: () => <FauxMap position="top-center" width="md" open />,
};
