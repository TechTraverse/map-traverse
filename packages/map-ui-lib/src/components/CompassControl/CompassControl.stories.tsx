import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CompassControl } from './CompassControl';
import type { CompassControlProps } from './CompassControl';

const meta: Meta<CompassControlProps> = {
  title: 'Components/CompassControl',
  component: CompassControl,
  parameters: {
    docs: {
      description: {
        component:
          'A framework-agnostic compass button. The needle rotates with the map bearing; clicking fires onReset so the host app can animate the map back to north.',
      },
    },
  },
  argTypes: {
    bearing: { control: { type: 'range', min: -180, max: 180, step: 1 } },
    onReset: { action: 'reset' },
  },
  args: {
    bearing: 0,
  },
};

export default meta;

type Story = StoryObj<CompassControlProps>;

export const North: Story = { args: { bearing: 0 } };
export const Rotated45: Story = { args: { bearing: 45 } };
export const Rotated90: Story = { args: { bearing: 90 } };
export const Rotated180: Story = { args: { bearing: 180 } };

/** Click the compass to reset bearing to 0. */
export const Interactive: Story = {
  render: (args) => {
    const [bearing, setBearing] = useState(args.bearing ?? 60);
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <CompassControl
          {...args}
          bearing={bearing}
          onReset={() => setBearing(0)}
        />
        <input
          type="range"
          min={-180}
          max={180}
          value={bearing}
          onChange={(e) => setBearing(Number(e.target.value))}
        />
        <span>{bearing}°</span>
      </div>
    );
  },
};
