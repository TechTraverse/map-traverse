import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ResultsDrawer } from './ResultsDrawer';
import type { ResultsDrawerSort, ResultsDrawerTab } from './ResultsDrawer';

const meta: Meta<typeof ResultsDrawer> = {
  title: 'Map UI/ResultsDrawer',
  component: ResultsDrawer,
  parameters: {
    docs: {
      description: {
        component:
          'Bottom drawer displaying feature results in a table. Supports single-content mode or multi-tab mode for showing selection and query results side by side.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 500, background: '#e5e7eb' }}>
        <div style={{ padding: 16, color: '#6b7280', fontSize: 14 }}>
          (Map area — drawer appears at bottom)
        </div>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ResultsDrawer>;

const sampleFeatures = [
  { properties: { name: 'Niger', continent: 'Africa', population: 25130817, area_km2: 1267000 } },
  { properties: { name: 'Algeria', continent: 'Africa', population: 44616624, area_km2: 2381741 } },
  { properties: { name: 'France', continent: 'Europe', population: 67390000, area_km2: 551695 } },
];

const queryFeatures = [
  { properties: { parcel_id: '370135338001', owner: 'KADZ LIVING TRUST', sale_price: 394500, sale_date: '2024-05-28' } },
  { properties: { parcel_id: '370135338003', owner: 'RAMSEY LARA', sale_price: 325000, sale_date: '2025-11-25' } },
  { properties: { parcel_id: '370135359003', owner: 'SCHMILLEN LORA', sale_price: 360000, sale_date: '2023-04-18' } },
  { properties: { parcel_id: '370135361006', owner: 'GEHAN KARA', sale_price: 387000, sale_date: '2025-10-01' } },
  { properties: { parcel_id: '370135363001', owner: 'SCOTT HARRELL', sale_price: 385000, sale_date: '2023-08-16' } },
];

export const SingleContent: Story = {
  render: () => (
    <ResultsDrawer
      open={true}
      features={sampleFeatures}
      title="Selected Features — Countries"
      onClose={() => {}}
      onClearSelection={() => {}}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <ResultsDrawer
      open={true}
      features={[]}
      title="Selected Features"
      onClose={() => {}}
    />
  ),
};

export const WithTabs: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('selected');
    const tabs: ResultsDrawerTab[] = [
      {
        id: 'selected',
        label: 'Selected Features',
        features: sampleFeatures,
        onClear: () => alert('Clear selection'),
      },
      {
        id: 'query',
        label: 'Query Results',
        features: queryFeatures,
        onClear: () => alert('Clear query results'),
      },
    ];
    return (
      <ResultsDrawer
        open={true}
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        onClose={() => {}}
      />
    );
  },
};

export const InteractiveTable: Story = {
  render: () => {
    const [columnOrder, setColumnOrder] = useState<string[]>([
      'name',
      'continent',
      'population',
      'area_km2',
    ]);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<ResultsDrawerSort | null>(null);
    return (
      <ResultsDrawer
        open={true}
        features={sampleFeatures}
        title="Countries — interactive"
        onClose={() => {}}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
    );
  },
};

export const SingleTab: Story = {
  render: () => {
    const tabs: ResultsDrawerTab[] = [
      {
        id: 'selected',
        label: 'Selected Features',
        features: sampleFeatures,
        onClear: () => {},
      },
    ];
    return (
      <ResultsDrawer
        open={true}
        tabs={tabs}
        activeTabId="selected"
        onTabChange={() => {}}
        onClose={() => {}}
      />
    );
  },
};
