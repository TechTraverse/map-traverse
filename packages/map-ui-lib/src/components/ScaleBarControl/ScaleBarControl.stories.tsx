import type { Meta, StoryObj } from '@storybook/react';
import { ScaleBarControl } from './ScaleBarControl';

const meta = {
  title: 'Components/ScaleBarControl',
  component: ScaleBarControl,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ScaleBarControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MetricWorld: Story = {
  args: { zoom: 2, latitude: 0, unit: 'metric' },
};

export const MetricCity: Story = {
  args: { zoom: 12, latitude: 40.7128, unit: 'metric' },
};

export const ImperialCity: Story = {
  args: { zoom: 12, latitude: 40.7128, unit: 'imperial' },
};

export const MetricStreet: Story = {
  args: { zoom: 17, latitude: 40.7128, unit: 'metric' },
};

export const ImperialStreet: Story = {
  args: { zoom: 17, latitude: 40.7128, unit: 'imperial' },
};
