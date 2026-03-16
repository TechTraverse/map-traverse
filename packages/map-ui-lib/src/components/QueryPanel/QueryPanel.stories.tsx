import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { FilterRuleGroup } from '../../types';
import { QueryPanel } from './QueryPanel';

const meta: Meta<typeof QueryPanel> = {
  title: 'Map UI/QueryPanel',
  component: QueryPanel,
  parameters: {
    docs: {
      description: {
        component: 'Renders parameter inputs for a CQL2 filter template and a Run button. Used inside the SelectionPanel for preset queries.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof QueryPanel>;

const parcelsNearbyFilter: FilterRuleGroup = {
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
};

const salesFilter: FilterRuleGroup = {
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
};

const staticFilter: FilterRuleGroup = {
  id: 'g1',
  combinator: 'and',
  rules: [
    { id: 'r1', property: 'status', operator: '=', value: { kind: 'static', value: 'active' } },
  ],
};

export const ParcelsNearby: Story = {
  render: () => {
    const [lastParams, setLastParams] = useState<Record<string, unknown> | null>(null);
    return (
      <div className="mapui:max-w-xs mapui:p-4">
        <QueryPanel
          cql2Filter={parcelsNearbyFilter}
          onRun={setLastParams}
          hasSelectionGeometry={true}
        />
        {lastParams && (
          <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-2 mapui:text-xs">
            {JSON.stringify(lastParams, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

export const SalesComparable: Story = {
  render: () => (
    <div className="mapui:max-w-xs mapui:p-4">
      <QueryPanel
        cql2Filter={salesFilter}
        onRun={() => {}}
        hasSelectionGeometry={true}
      />
    </div>
  ),
};

export const NeedsGeometry: Story = {
  render: () => (
    <div className="mapui:max-w-xs mapui:p-4">
      <QueryPanel
        cql2Filter={parcelsNearbyFilter}
        onRun={() => {}}
        hasSelectionGeometry={false}
      />
    </div>
  ),
};

export const StaticOnly: Story = {
  render: () => (
    <div className="mapui:max-w-xs mapui:p-4">
      <QueryPanel
        cql2Filter={staticFilter}
        onRun={() => {}}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="mapui:max-w-xs mapui:p-4">
      <QueryPanel
        cql2Filter={parcelsNearbyFilter}
        onRun={() => {}}
        hasSelectionGeometry={true}
        loading={true}
      />
    </div>
  ),
};
