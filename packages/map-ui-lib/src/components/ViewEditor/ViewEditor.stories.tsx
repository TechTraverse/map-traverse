import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { ViewConfig } from '../../types';
import { ViewEditor } from './ViewEditor';

const meta: Meta<typeof ViewEditor> = {
  title: 'Admin/ViewEditor',
  component: ViewEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Number inputs for the map initial view: latitude, longitude, zoom, pitch, and bearing. Inline validation errors.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ViewEditor>;

export const Default: Story = {
  render: () => {
    const [view, setView] = useState<ViewConfig>({
      latitude: 51.505,
      longitude: -0.09,
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <ViewEditor value={view} onChange={setView} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(view, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WorldView: Story = {
  render: () => {
    const [view, setView] = useState<ViewConfig>({
      latitude: 0,
      longitude: 0,
      zoom: 2,
      pitch: 0,
      bearing: 0,
    });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <ViewEditor value={view} onChange={setView} />
      </div>
    );
  },
};

export const WithZoomConstraints: Story = {
  render: () => {
    const [view, setView] = useState<ViewConfig>({
      latitude: 51.505,
      longitude: -0.09,
      zoom: 13,
      pitch: 0,
      bearing: 0,
      minZoom: 5,
      maxZoom: 18,
    });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <ViewEditor value={view} onChange={setView} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(view, null, 2)}
        </pre>
      </div>
    );
  },
};
