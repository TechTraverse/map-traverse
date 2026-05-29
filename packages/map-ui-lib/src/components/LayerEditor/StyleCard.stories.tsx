import type { Meta, StoryObj } from '@storybook/react';
import type { StyleConfig } from '../../types';
import { StyleCard } from './StyleCard';

const meta: Meta<typeof StyleCard> = {
  title: 'Admin/StyleCard',
  component: StyleCard,
  parameters: {
    docs: {
      description: {
        component:
          'Bordered card with a tinted header that wraps a single StyleEditor in the layer-editor style list. Each MapLibre style type (fill/line/circle/symbol) gets its own header tint and icon so stacked styles read as distinct entries.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StyleCard>;

const fill: StyleConfig = {
  type: 'fill',
  paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 },
};
const line: StyleConfig = {
  type: 'line',
  paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 },
};
const circle: StyleConfig = {
  type: 'circle',
  paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 },
};
const symbol: StyleConfig = {
  type: 'symbol',
  paint: { 'text-color': '#333333' },
  layout: { 'text-field': '{name}', 'text-size': 14 },
};

function Body({ label }: { label: string }) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2 mapui:text-sm mapui:text-slate-500">
      <p className="mapui:m-0">{label} — StyleEditor body renders here.</p>
      <div className="mapui:h-12 mapui:rounded mapui:bg-slate-100" />
    </div>
  );
}

export const Fill: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard index={0} style={fill} onRemove={() => undefined}>
        <Body label="Fill" />
      </StyleCard>
    </div>
  ),
};

export const Line: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard index={1} style={line} onRemove={() => undefined}>
        <Body label="Line" />
      </StyleCard>
    </div>
  ),
};

export const Circle: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard index={0} style={circle} onRemove={() => undefined}>
        <Body label="Circle" />
      </StyleCard>
    </div>
  ),
};

export const Symbol: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard index={2} style={symbol} onRemove={() => undefined}>
        <Body label="Symbol" />
      </StyleCard>
    </div>
  ),
};

export const WithGeometryFilter: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard
        index={0}
        style={{ ...fill, geometryFilter: ['Polygon', 'MultiPolygon'] }}
        onRemove={() => undefined}
      >
        <Body label="Fill (polygon-only)" />
      </StyleCard>
    </div>
  ),
};

export const NoRemove: Story = {
  render: () => (
    <div className="mapui:max-w-xl mapui:p-4">
      <StyleCard index={0} style={fill}>
        <Body label="Single style — no remove button" />
      </StyleCard>
    </div>
  ),
};

export const MultipleStacked: Story = {
  render: () => (
    <div className="mapui:flex mapui:max-w-xl mapui:flex-col mapui:gap-4 mapui:p-4">
      <StyleCard index={0} style={fill} onRemove={() => undefined}>
        <Body label="Fill" />
      </StyleCard>
      <StyleCard index={1} style={line} onRemove={() => undefined}>
        <Body label="Line" />
      </StyleCard>
      <StyleCard index={2} style={symbol} onRemove={() => undefined}>
        <Body label="Symbol label" />
      </StyleCard>
    </div>
  ),
};
