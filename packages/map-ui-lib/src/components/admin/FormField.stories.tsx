import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Admin/Primitives/FormField',
  component: FormField,
  parameters: {
    docs: {
      description: {
        component: 'Label + input wrapper with optional error message and required indicator.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Source URL',
    children: (
      <input
        type="text"
        placeholder="https://example.com"
        className="mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm"
      />
    ),
  },
};

export const Required: Story = {
  args: {
    label: 'Source ID',
    required: true,
    children: (
      <input
        type="text"
        placeholder="my-source"
        className="mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm"
      />
    ),
  },
};

export const WithError: Story = {
  args: {
    label: 'Source URL',
    required: true,
    error: 'Must be a valid URL.',
    children: (
      <input
        type="text"
        defaultValue="not-a-url"
        className="mapui:rounded mapui:border mapui:border-red-400 mapui:px-2 mapui:py-1 mapui:text-sm"
      />
    ),
  },
};
