import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LegendConfig } from '../../types';
import { LegendEditor } from './LegendEditor';

const meta: Meta<typeof LegendEditor> = {
  title: 'Admin/LegendEditor',
  component: LegendEditor,
  parameters: {
    docs: {
      description: {
        component: 'Edit legend entries: label, color, and shape for each entry.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof LegendEditor>;

export const Default: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>(undefined);
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WithEntries: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>({
      entries: [
        { label: 'Urban', color: '#e74c3c', shape: 'square' },
        { label: 'Forest', color: '#27ae60', shape: 'square' },
        { label: 'Water', color: '#2980b9', shape: 'circle' },
      ],
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} />
      </div>
    );
  },
};
