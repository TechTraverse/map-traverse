import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AutocompleteInput } from './AutocompleteInput';

const COUNTRY_SUGGESTIONS = ['France', 'Germany', 'Spain', 'Italy', 'United Kingdom', 'Portugal', 'Netherlands'];

function InteractiveAutocomplete(props: React.ComponentProps<typeof AutocompleteInput>) {
  const [value, setValue] = useState(props.value);
  return <AutocompleteInput {...props} value={value} onChange={setValue} />;
}

const meta: Meta<typeof AutocompleteInput> = {
  title: 'Components/SearchPanel/AutocompleteInput',
  component: AutocompleteInput,
  render: (args) => <InteractiveAutocomplete {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'A text input with a dropdown of filtered suggestions. Supports keyboard navigation (arrow keys, Enter, Escape) and closes on outside click.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof AutocompleteInput>;

/** Text input with a static list of suggestions — type to filter. */
export const Default: Story = {
  args: {
    value: '',
    suggestions: COUNTRY_SUGGESTIONS,
    placeholder: 'Type a country...',
  },
};

/** Input with no suggestions provided — dropdown never appears. */
export const Empty: Story = {
  args: {
    value: '',
    suggestions: [],
    placeholder: 'No suggestions available',
  },
};

/** Input with a descriptive placeholder and pre-loaded suggestions. */
export const WithPlaceholder: Story = {
  args: {
    value: '',
    suggestions: COUNTRY_SUGGESTIONS,
    placeholder: 'Search by country name...',
  },
};
