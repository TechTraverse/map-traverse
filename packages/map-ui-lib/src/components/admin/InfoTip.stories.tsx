import type { Meta, StoryObj } from '@storybook/react';
import { InfoTip } from './InfoTip';
import { FormField } from './FormField';

const meta: Meta<typeof InfoTip> = {
  title: 'Admin/Primitives/InfoTip',
  component: InfoTip,
  parameters: {
    docs: {
      description: {
        component: 'Small info icon that reveals a tooltip on hover or keyboard focus.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof InfoTip>;

export const Default: Story = {
  args: {
    text: 'Smooths the edges of filled polygons.',
  },
  decorators: [
    (Story) => (
      <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:p-8">
        <span className="mapui:text-sm mapui:text-slate-700">Antialias</span>
        <Story />
      </div>
    ),
  ],
};

export const InFormField: Story = {
  render: () => (
    <div className="mapui:p-8 mapui:w-64">
      <FormField
        label="Fill Color"
        description="The color used to fill polygons. Supports any CSS color value."
      >
        <input
          type="text"
          defaultValue="#3b82f6"
          className="mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm"
        />
      </FormField>
    </div>
  ),
};

export const LongText: Story = {
  args: {
    text: 'Controls whether the symbol is placed along a line, at a point, or at the center of a line. "line" places multiple copies along the full length of the line.',
  },
  decorators: [
    (Story) => (
      <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:p-16">
        <span className="mapui:text-sm mapui:text-slate-700">Symbol Placement</span>
        <Story />
      </div>
    ),
  ],
};
