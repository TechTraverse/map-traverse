import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { Cql2FilterConfig, AvailableProperty } from '../../types';
import { Cql2FilterEditor } from './Cql2FilterEditor';

const meta: Meta<typeof Cql2FilterEditor> = {
  title: 'Admin/Cql2FilterEditor',
  component: Cql2FilterEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Visual CQL2 filter builder for constructing query templates. Supports comparison, pattern, temporal, and spatial operators with parameterized values.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Cql2FilterEditor>;

const sampleProperties: AvailableProperty[] = [
  { name: 'name', title: 'Name', type: 'string' },
  { name: 'continent', title: 'Continent', type: 'string', enum: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'] },
  { name: 'population', title: 'Population', type: 'integer', minimum: 0, maximum: 1500000000 },
  { name: 'area_km2', title: 'Area (km\u00B2)', type: 'number' },
  { name: 'updated_at', title: 'Last Updated', type: 'string', format: 'date-time' },
  { name: 'geom', title: 'Geometry', type: 'geometry' },
];

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>(undefined);
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};

export const SingleRule: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'continent',
          operator: '=',
          value: { kind: 'static', value: 'Europe' },
        },
      ],
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};

export const Parameterized: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'continent',
          operator: '=',
          value: { kind: 'parameter', name: 'selectedContinent', label: 'Continent', inputType: 'select' },
        },
        {
          id: 'r2',
          property: 'population',
          operator: '>',
          value: { kind: 'parameter', name: 'minPopulation', label: 'Min Population', inputType: 'number', default: 1000000 },
        },
      ],
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};

export const NestedGroups: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'population',
          operator: '>',
          value: { kind: 'static', value: 1000000 },
        },
        {
          id: 'g2',
          combinator: 'or',
          rules: [
            {
              id: 'r2',
              property: 'continent',
              operator: '=',
              value: { kind: 'static', value: 'Europe' },
            },
            {
              id: 'r3',
              property: 'continent',
              operator: '=',
              value: { kind: 'static', value: 'Asia' },
            },
          ],
        },
      ],
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};

export const SpatialFilter: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'geom',
          operator: 's_intersects',
          value: { kind: 'static', value: null },
        },
        {
          id: 'r2',
          property: 'geom',
          operator: 's_dwithin',
          value: { kind: 'static', value: null },
          spatial: { distance: 5000, units: 'meters' },
        },
      ],
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};

/** Real-world: "Parcels within X feet of selected parcel" */
export const ParcelsNearby: Story = {
  render: () => {
    const parcelProperties: AvailableProperty[] = [
      { name: 'parcel_id', title: 'Parcel ID', type: 'string' },
      { name: 'owner', title: 'Owner', type: 'string' },
      { name: 'acres', title: 'Acres', type: 'number' },
      { name: 'geom', title: 'Geometry', type: 'geometry' },
    ];
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
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
      sortby: [{ property: 'acres', direction: 'desc' }],
      limit: 50,
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <h3 className="mapui:mb-2 mapui:text-sm mapui:font-semibold">Parcels within X feet of selected parcel</h3>
        <Cql2FilterEditor value={value} onChange={setValue} availableProperties={parcelProperties} />
      </div>
    );
  },
};

/** Real-world: "Closest 10 sales from last 3 years within 20% of desired price" */
export const SalesComparable: Story = {
  render: () => {
    const salesProperties: AvailableProperty[] = [
      { name: 'sale_id', title: 'Sale ID', type: 'string' },
      { name: 'sale_price', title: 'Sale Price', type: 'number' },
      { name: 'sale_date', title: 'Sale Date', type: 'string', format: 'date-time' },
      { name: 'distance', title: 'Distance', type: 'number' },
      { name: 'geom', title: 'Geometry', type: 'geometry' },
    ];
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'geom',
          operator: 's_dwithin',
          value: { kind: 'static', value: null },
          spatial: {
            distance: { kind: 'parameter', name: 'searchRadius', label: 'Search Radius (mi)', default: 5 },
            units: 'miles',
          },
        },
        {
          id: 'r2',
          property: 'sale_date',
          operator: 't_during',
          value: {
            kind: 'dateRange',
            start: { kind: 'relativeDate', direction: 'past', offset: { kind: 'parameter', name: 'yearsBack', label: 'Years Back', default: 3 }, unit: 'years' },
            end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
          },
        },
        {
          id: 'r3',
          property: 'sale_price',
          operator: 'between',
          value: {
            kind: 'computedRange',
            baseParam: 'desiredPrice',
            baseLabel: 'Desired Price',
            offsetType: 'percentage',
            offsetAmount: { kind: 'static', value: 20 },
          },
        },
      ],
      sortby: [{ property: 'distance', direction: 'asc' }],
      limit: 10,
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <h3 className="mapui:mb-2 mapui:text-sm mapui:font-semibold">Closest 10 sales from last N years within 20% of desired price</h3>
        <Cql2FilterEditor value={value} onChange={setValue} availableProperties={salesProperties} />
      </div>
    );
  },
};

export const AllPropertyTypes: Story = {
  render: () => {
    const [value, setValue] = useState<Cql2FilterConfig | undefined>({
      id: 'g1',
      combinator: 'and',
      rules: [
        {
          id: 'r1',
          property: 'name',
          operator: 'like',
          value: { kind: 'static', value: 'united' },
        },
        {
          id: 'r2',
          property: 'population',
          operator: 'between',
          value: { kind: 'static', value: { lower: 1000000, upper: 100000000 } },
        },
        {
          id: 'r3',
          property: 'updated_at',
          operator: 't_during',
          value: { kind: 'static', value: { start: '2023-01-01T00:00:00', end: '2024-12-31T23:59:59' } },
        },
        {
          id: 'r4',
          property: 'continent',
          operator: 'in',
          value: { kind: 'static', value: ['Europe', 'Asia', 'Africa'] },
        },
      ],
    });
    return (
      <div className="mapui:max-w-2xl mapui:p-4">
        <Cql2FilterEditor
          value={value}
          onChange={setValue}
          availableProperties={sampleProperties}
        />
      </div>
    );
  },
};
