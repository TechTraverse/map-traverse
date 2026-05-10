import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

const meta: Meta<typeof ColorPicker> = {
  title: 'Admin/Primitives/ColorPicker',
  component: ColorPicker,
  parameters: {
    docs: {
      description: {
        component:
          'Color input with hex value display, copy/paste icon buttons, and a "Recent colors" strip. ' +
          'Copy/paste use a session-scoped clipboard shared across all ColorPicker instances on the page, ' +
          'so a color picked in one editor can be pasted into another (works on plain HTTP). ' +
          'Recents are persisted under `mapui:recent-colors` (capped at 8).',
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

/**
 * Two pickers wired to independent state. Copy from Layer A, paste into
 * Layer B — the exact Mike1 flow from PLAN.md item 7.
 */
export const CopyPasteBetweenLayers: Story = {
  render: () => {
    const [a, setA] = useState('#0ea5e9');
    const [b, setB] = useState('#f97316');
    return (
      <div className="mapui:flex mapui:flex-col mapui:gap-4">
        <div className="mapui:rounded mapui:border mapui:border-slate-200 mapui:p-3">
          <div className="mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:text-slate-700">
            Layer A - Fill
          </div>
          <ColorPicker value={a} onChange={setA} label="Layer A fill" />
        </div>
        <div className="mapui:rounded mapui:border mapui:border-slate-200 mapui:p-3">
          <div className="mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:text-slate-700">
            Layer B - Stroke
          </div>
          <ColorPicker value={b} onChange={setB} label="Layer B stroke" />
        </div>
        <p className="mapui:text-xs mapui:text-slate-500">
          Click the copy button on Layer A, then paste on Layer B. Both
          colors appear in the "Recent" strip and persist across reload.
        </p>
      </div>
    );
  },
};

/**
 * Demonstrates the recents strip growing as different colors are committed.
 */
export const WithRecents: Story = {
  render: () => {
    const [color, setColor] = useState('#22c55e');
    return (
      <div className="mapui:flex mapui:flex-col mapui:gap-3">
        <ColorPicker value={color} onChange={setColor} label="Pick a color" />
        <p className="mapui:max-w-sm mapui:text-xs mapui:text-slate-500">
          Change the color a few times - each commit is pushed to the
          recents strip (most recent first, capped at 8, deduped).
        </p>
      </div>
    );
  },
};
