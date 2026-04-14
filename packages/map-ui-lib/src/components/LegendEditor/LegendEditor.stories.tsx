import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { LegendConfig, StyleConfig } from '../../types';
import { LegendEditor } from './LegendEditor';

const meta: Meta<typeof LegendEditor> = {
  title: 'Admin/LegendEditor',
  component: LegendEditor,
  parameters: {
    docs: {
      description: {
        component: 'Edit legend entries with display mode selection. Supports simple, categorical, and gradient modes. Auto-detects mode from style expressions.',
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
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
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
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

const matchStyle: StyleConfig = {
  type: 'fill',
  paint: {
    'fill-color': [
      'match',
      ['get', 'region'],
      'Europe', '#4a90d9',
      'Africa', '#e74c3c',
      'Asia', '#27ae60',
      'Americas', '#f39c12',
      '#95a5a6',
    ],
    'fill-opacity': 0.7,
  },
  layout: {},
};

/** Match expression — "Generate from Style" creates categorical mode. */
export const WithMatchExpression: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>(undefined);
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} style={matchStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

const interpolateStyle: StyleConfig = {
  type: 'circle',
  paint: {
    'circle-color': [
      'interpolate',
      ['linear'],
      ['get', 'population'],
      0, '#ffffcc',
      100000, '#41b6c4',
      1000000, '#253494',
    ],
    'circle-radius': 5,
    'circle-opacity': 0.8,
  },
  layout: {},
};

/** Interpolate expression — "Generate from Style" creates gradient mode with property name. */
export const WithInterpolateExpression: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>(undefined);
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} style={interpolateStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

/** Expression layer with existing entries — shows "Populate from Style" button. */
export const WithExpressionAndExistingEntries: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>({
      entries: [
        { label: 'Custom Entry', color: '#ff0000', shape: 'square' },
      ],
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} style={matchStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

/** Pre-configured categorical mode with all options visible. */
export const CategoricalMode: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>({
      displayMode: 'categorical',
      showLabelsCollapsed: true,
      entries: [
        { label: 'Europe', color: '#4a90d9', shape: 'square' },
        { label: 'Africa', color: '#e74c3c', shape: 'square' },
        { label: 'Asia', color: '#27ae60', shape: 'square' },
        { label: 'Americas', color: '#f39c12', shape: 'square' },
        { label: 'Other', color: '#95a5a6', shape: 'square' },
      ],
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} style={matchStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};

/** Pre-configured gradient mode with property and color stops. */
export const GradientMode: Story = {
  render: () => {
    const [legend, setLegend] = useState<LegendConfig | undefined>({
      displayMode: 'gradient',
      gradientProperty: 'population',
      entries: [
        { label: '0', color: '#ffffcc', shape: 'circle' },
        { label: '100K', color: '#41b6c4', shape: 'circle' },
        { label: '1M', color: '#253494', shape: 'circle' },
      ],
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <LegendEditor value={legend} onChange={setLegend} style={interpolateStyle} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(legend, null, 2)}
        </pre>
      </div>
    );
  },
};
