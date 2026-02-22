import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CollectionBrowser } from './CollectionBrowser';

const meta: Meta<typeof CollectionBrowser> = {
  title: 'Admin/CollectionBrowser',
  component: CollectionBrowser,
  parameters: {
    docs: {
      description: {
        component:
          'Fetches and displays OGC API collections from a source URL. Supports checkbox selection.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CollectionBrowser>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <CollectionBrowser
          sourceUrl="https://demo.pygeoapi.io/master"
          selectedCollectionIds={selected}
          onSelect={(id) => setSelected((prev) => [...prev, id])}
          onDeselect={(id) => setSelected((prev) => prev.filter((x) => x !== id))}
        />
        {selected.length > 0 && (
          <p className="mapui:mt-2 mapui:text-xs mapui:text-gray-600">
            Selected: {selected.join(', ')}
          </p>
        )}
      </div>
    );
  },
};

export const WithPreselected: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(['lakes', 'countries']);
    return (
      <div className="mapui:max-w-lg mapui:p-4">
        <CollectionBrowser
          sourceUrl="https://demo.pygeoapi.io/master"
          selectedCollectionIds={selected}
          onSelect={(id) => setSelected((prev) => [...prev, id])}
          onDeselect={(id) => setSelected((prev) => prev.filter((x) => x !== id))}
        />
      </div>
    );
  },
};
