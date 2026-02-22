import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { SearchField } from '../../types';
import { SearchFieldEditor } from './SearchFieldEditor';

const meta: Meta<typeof SearchFieldEditor> = {
  title: 'Admin/SearchFieldEditor',
  component: SearchFieldEditor,
  parameters: {
    docs: {
      description: {
        component: 'Edit a single search field configuration. Type selector switches the form variant.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SearchFieldEditor>;

export const TextType: Story = {
  render: () => {
    const [field, setField] = useState<SearchField>({
      type: 'text',
      property: 'name',
      label: 'Name',
      autocomplete: true,
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <SearchFieldEditor value={field} onChange={setField} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(field, null, 2)}
        </pre>
      </div>
    );
  },
};

export const NumberType: Story = {
  render: () => {
    const [field, setField] = useState<SearchField>({
      type: 'number',
      property: 'population',
      label: 'Population',
      operator: 'gte',
      inputMode: 'input',
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <SearchFieldEditor value={field} onChange={setField} />
      </div>
    );
  },
};

export const SelectType: Story = {
  render: () => {
    const [field, setField] = useState<SearchField>({
      type: 'select',
      property: 'category',
      label: 'Category',
      options: ['Urban', 'Rural', 'Suburban'],
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <SearchFieldEditor value={field} onChange={setField} />
      </div>
    );
  },
};
