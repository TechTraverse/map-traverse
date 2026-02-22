import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NumberInput } from './NumberInput';
import type { NumberSearchField, SearchFilterValue } from '../../types';

function InteractiveNumberInput(props: React.ComponentProps<typeof NumberInput>) {
  const [value, setValue] = useState<SearchFilterValue>(props.value);
  return <NumberInput {...props} value={value} onChange={setValue} />;
}

const meta: Meta<typeof NumberInput> = {
  title: 'Components/SearchPanel/NumberInput',
  component: NumberInput,
  render: (args) => <InteractiveNumberInput {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'A flexible numeric input that supports plain text entry, a range slider, min/max between inputs, and an operator dropdown. Controlled via field config and value/onChange props.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof NumberInput>;

const plainField: NumberSearchField = {
  property: 'pop_min',
  label: 'Population',
  type: 'number',
  inputMode: 'input',
  operator: 'eq',
  placeholder: 'Enter population...',
};

/** Standard number input with operator dropdown defaulting to equals. */
export const DefaultInput: Story = {
  args: {
    field: plainField,
    value: undefined,
  },
};

const sliderField: NumberSearchField = {
  property: 'pop_min',
  label: 'Min Population',
  type: 'number',
  inputMode: 'slider',
  operator: 'gte',
  min: 0,
  max: 1000000,
  step: 10000,
};

/** Number field rendered as a range slider with a live value label. */
export const WithSlider: Story = {
  args: {
    field: sliderField,
    value: { value: 250000, operator: 'gte' },
  },
};

const betweenField: NumberSearchField = {
  property: 'gdp_md_est',
  label: 'GDP (Millions USD)',
  type: 'number',
  inputMode: 'input',
  operator: 'between',
  min: 0,
  max: 100000,
};

/** Two side-by-side inputs for the `between` operator (min / max). */
export const BetweenMode: Story = {
  args: {
    field: betweenField,
    value: { min: 1000, max: 50000 },
  },
};

const operatorField: NumberSearchField = {
  property: 'pop_min',
  label: 'Population',
  type: 'number',
  inputMode: 'input',
  operator: 'gt',
  placeholder: '0',
};

/** Number input with operator dropdown allowing the user to switch operators. */
export const WithOperator: Story = {
  args: {
    field: operatorField,
    value: { value: 100000, operator: 'gt' },
  },
};
