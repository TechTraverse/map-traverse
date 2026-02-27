import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { StyleConfig } from '../../types';
import { StyleEditor } from './StyleEditor';

const meta: Meta<typeof StyleEditor> = {
  title: 'Admin/StyleEditor',
  component: StyleEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Style editor for MapLibre layer styles (fill, line, circle, symbol). Includes live preview swatch and data-driven property groups.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StyleEditor>;

export const FillStyle: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'fill',
      paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor value={style} onChange={setStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};

export const LineStyle: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'line',
      paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor value={style} onChange={setStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};

export const CircleStyle: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'circle',
      paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor value={style} onChange={setStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};

export const SymbolStyle: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'symbol',
      paint: { 'text-color': '#1a1a2e' },
      layout: { 'text-field': '{name}', 'text-size': 14 },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor value={style} onChange={setStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};
