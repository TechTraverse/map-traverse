import type { Meta, StoryObj } from '@storybook/react';
import { InfoControl } from './InfoControl';
import type { InfoControlProps } from './InfoControl';

const meta: Meta<InfoControlProps> = {
  title: 'Components/InfoControl',
  component: InfoControl,
  parameters: {
    docs: {
      description: {
        component:
          'A framework-agnostic 40×40 info button. Clicking it fires onClick so the host app can open an InfoModal (or do anything else).',
      },
    },
  },
  argTypes: {
    onClick: { action: 'click' },
  },
};

export default meta;

type Story = StoryObj<InfoControlProps>;

export const Default: Story = {
  args: {},
};

export const CustomLabel: Story = {
  args: {
    ariaLabel: 'About the Watershed Atlas',
    title: 'About the Watershed Atlas',
  },
};
