import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DateRangeInput } from './DateRangeInput';

function InteractiveDateRange(props: React.ComponentProps<typeof DateRangeInput>) {
  const [start, setStart] = useState(props.startValue);
  const [end, setEnd] = useState(props.endValue);
  return (
    <DateRangeInput
      {...props}
      startValue={start}
      endValue={end}
      onStartChange={setStart}
      onEndChange={setEnd}
    />
  );
}

const meta: Meta<typeof DateRangeInput> = {
  title: 'Components/SearchPanel/DateRangeInput',
  component: DateRangeInput,
  render: (args) => <InteractiveDateRange {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'A pair of datetime-local inputs (From / To) for selecting a date range. Both values are controlled externally.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof DateRangeInput>;

/** Empty date range inputs with no pre-selected values. */
export const Default: Story = {
  args: {
    startValue: '',
    endValue: '',
  },
};

/** Date range inputs pre-populated with start and end values. */
export const WithValues: Story = {
  args: {
    startValue: '2023-01-01T00:00',
    endValue: '2023-12-31T23:59',
  },
};
