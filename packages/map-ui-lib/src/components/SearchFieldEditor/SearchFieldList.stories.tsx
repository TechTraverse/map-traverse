import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { SearchField } from '../../types';
import { SearchFieldList } from './SearchFieldList';

const meta: Meta<typeof SearchFieldList> = {
  title: 'Admin/SearchFieldList',
  component: SearchFieldList,
  parameters: {
    docs: {
      description: {
        component: 'List of search fields with add/remove/reorder controls.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SearchFieldList>;

const sampleFields: SearchField[] = [
  { type: 'text', property: 'name', label: 'Name', autocomplete: true },
  { type: 'number', property: 'population', label: 'Population', operator: 'gte', inputMode: 'input' },
  { type: 'select', property: 'category', label: 'Category', options: ['Urban', 'Rural'] },
];

export const Default: Story = {
  render: () => {
    const [fields, setFields] = useState<SearchField[]>(sampleFields);
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SearchFieldList fields={fields} onChange={setFields} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [fields, setFields] = useState<SearchField[]>([]);
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SearchFieldList fields={fields} onChange={setFields} />
      </div>
    );
  },
};
