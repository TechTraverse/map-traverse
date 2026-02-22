import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

const meta: Meta<typeof ColorPicker> = {
  title: 'Admin/Primitives/ColorPicker',
  component: ColorPicker,
  parameters: {
    docs: {
      description: {
        component: 'Color input with hex value display.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ColorPicker>;

export const Default: Story = {
  render: () => {
    const [color, setColor] = useState('#4a90d9');
    return <ColorPicker value={color} onChange={setColor} label="Fill color" />;
  },
};

export const Red: Story = {
  render: () => {
    const [color, setColor] = useState('#e74c3c');
    return <ColorPicker value={color} onChange={setColor} label="Stroke color" />;
  },
};
