import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { StyleConfig } from '../../types';
import type { ColorThemeId } from '../../utils/colorThemes';
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

export const DataDrivenCategorical: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'fill',
      paint: {
        'fill-color': [
          'match',
          ['get', 'continent'],
          'Africa', '#e8a838',
          'Asia', '#d15b5b',
          'Europe', '#5b8dd1',
          'North America', '#5bb85b',
          'South America', '#b85bb8',
          '#aaaaaa',
        ],
        'fill-opacity': 0.7,
      },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor
          value={style}
          onChange={setStyle}
          availableProperties={[
            { name: 'continent', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'sovereignt', type: 'string' },
          ]}
          onFetchDistinctValues={async (property) => {
            if (property === 'continent') {
              return ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
            }
            return [];
          }}
        />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};

export const DataDrivenGradient: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'fill',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'pop_est'],
          0, '#ffffcc',
          500000000, '#fd8d3c',
          1500000000, '#800026',
        ],
        'fill-opacity': 0.8,
      },
    });
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor
          value={style}
          onChange={setStyle}
          availableProperties={[
            { name: 'pop_est', type: 'number' },
            { name: 'gdp_md', type: 'number' },
            { name: 'area', type: 'number' },
          ]}
        />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WithColorTheme: Story = {
  render: () => {
    const [style, setStyle] = useState<StyleConfig>({
      type: 'fill',
      paint: {
        'fill-color': [
          'match',
          ['get', 'continent'],
          'Africa', '#e8a838',
          'Asia', '#d15b5b',
          'Europe', '#5b8dd1',
          '#aaaaaa',
        ],
        'fill-opacity': 0.7,
      },
    });
    const [theme, setTheme] = useState<ColorThemeId>('default');
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <StyleEditor
          value={style}
          onChange={setStyle}
          colorTheme={theme}
          onColorThemeChange={setTheme}
          availableProperties={[
            { name: 'continent', type: 'string' },
            { name: 'name', type: 'string' },
          ]}
          onFetchDistinctValues={async (property) => {
            if (property === 'continent') {
              return ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
            }
            return [];
          }}
        />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          theme: {theme}{'\n'}
          {JSON.stringify(style, null, 2)}
        </pre>
      </div>
    );
  },
};
