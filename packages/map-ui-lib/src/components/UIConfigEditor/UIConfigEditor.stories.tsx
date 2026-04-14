import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { UIConfig } from '../../types';
import { UIConfigEditor } from './UIConfigEditor';

const meta: Meta<typeof UIConfigEditor> = {
  title: 'Admin/UIConfigEditor',
  component: UIConfigEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Reorderable list of map controls with toggle switches. Drag or use arrow buttons to set display order.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof UIConfigEditor>;

const defaultUI: UIConfig = {
  showLayerPanel: true,
  showLegend: true,
  showBasemapSwitcher: true,
  showSearchPanel: false,
  showCoordinateDisplay: true,
  showFeatureDetail: true,
  showFeatureTooltip: true,
  showExportButton: true,
  showLegendOpacity: false,
  showMeasureTool: false,
  showSelectionTool: false,
  showImageryPanel: false,
  showCompass: true,
};

export const Default: Story = {
  render: () => {
    const [config, setConfig] = useState<UIConfig>(defaultUI);
    return (
      <div className="mapui:max-w-xl mapui:p-4">
        <UIConfigEditor value={config} onChange={setConfig} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  },
};

export const AllOff: Story = {
  render: () => {
    const [config, setConfig] = useState<UIConfig>({
      showLayerPanel: false,
      showLegend: false,
      showBasemapSwitcher: false,
      showSearchPanel: false,
      showCoordinateDisplay: false,
      showFeatureDetail: false,
      showFeatureTooltip: false,
      showExportButton: false,
      showLegendOpacity: false,
      showMeasureTool: false,
      showSelectionTool: false,
      showImageryPanel: false,
      showCompass: false,
    });
    return (
      <div className="mapui:max-w-xl mapui:p-4">
        <UIConfigEditor value={config} onChange={setConfig} />
      </div>
    );
  },
};

export const CustomOrder: Story = {
  render: () => {
    const [config, setConfig] = useState<UIConfig>({
      ...defaultUI,
      controlOrder: [
        'showBasemapSwitcher',
        'showLayerPanel',
        'showLegend',
        'showExportButton',
        'showSearchPanel',
        'showMeasureTool',
        'showSelectionTool',
        'showImageryPanel',
        'showCompass',
      ],
    });
    return (
      <div className="mapui:max-w-xl mapui:p-4">
        <UIConfigEditor value={config} onChange={setConfig} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  },
};
