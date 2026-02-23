import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { PropertyDisplayConfig } from '../../types';
import { PropertyDisplayEditor } from './PropertyDisplayEditor';

const meta: Meta<typeof PropertyDisplayEditor> = {
  title: 'Admin/PropertyDisplayEditor',
  component: PropertyDisplayEditor,
  parameters: {
    docs: {
      description: {
        component: 'Editor for property display configuration: friendly names and visibility toggles.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PropertyDisplayEditor>;

export const Default: Story = {
  render: () => {
    const [config, setConfig] = useState<PropertyDisplayConfig>({});
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <PropertyDisplayEditor value={config} onChange={setConfig} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WithExistingConfig: Story = {
  render: () => {
    const initial: PropertyDisplayConfig = {
      name: { label: 'Country Name', visible: true },
      pop_est: { label: 'Population', visible: true },
      continent: { label: 'Continent', visible: true },
      internal_id: { visible: false },
      _etag: { visible: false },
    };
    const [config, setConfig] = useState<PropertyDisplayConfig>(initial);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <PropertyDisplayEditor value={config} onChange={setConfig} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-gray-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  },
};
