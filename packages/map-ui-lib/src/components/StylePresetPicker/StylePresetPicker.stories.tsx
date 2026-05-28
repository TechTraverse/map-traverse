import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { StyleConfig } from '../../types';
import { StylePresetPicker } from './StylePresetPicker';

const meta: Meta<typeof StylePresetPicker> = {
  title: 'Admin/StylePresetPicker',
  component: StylePresetPicker,
  parameters: {
    docs: {
      description: {
        component:
          'Named style presets (modelled after Esri/QGIS symbol galleries) that bundle multiple MapLibre primitives into one click. The polygon "Outline only" preset includes a transparent fill so polygon interiors stay clickable for detail panels and tooltips.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StylePresetPicker>;

function StoryWrapper({ geometries }: { geometries: ('polygon' | 'line' | 'point')[] }) {
  const [styles, setStyles] = useState<StyleConfig[] | undefined>(undefined);
  return (
    <div className="mapui:max-w-3xl mapui:p-4">
      <StylePresetPicker geometries={geometries} value={styles} onChange={setStyles} />
      <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
        {JSON.stringify(styles ?? null, null, 2)}
      </pre>
    </div>
  );
}

export const Polygon: Story = {
  render: () => <StoryWrapper geometries={['polygon']} />,
};

export const Line: Story = {
  render: () => <StoryWrapper geometries={['line']} />,
};

export const Point: Story = {
  render: () => <StoryWrapper geometries={['point']} />,
};

export const PolygonAndLine: Story = {
  render: () => <StoryWrapper geometries={['polygon', 'line']} />,
};

export const StartingFromCustomStyles: Story = {
  render: () => {
    const [styles, setStyles] = useState<StyleConfig[]>([
      { type: 'fill', paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 } },
      { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2 } },
      { type: 'symbol', paint: {}, layout: { 'text-field': '{name}' } },
    ]);
    return (
      <div className="mapui:max-w-3xl mapui:p-4">
        <StylePresetPicker geometries={['polygon']} value={styles} onChange={setStyles} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(styles, null, 2)}
        </pre>
      </div>
    );
  },
};
