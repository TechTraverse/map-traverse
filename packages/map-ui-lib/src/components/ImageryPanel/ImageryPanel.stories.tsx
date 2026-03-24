import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ImageryPanel } from './ImageryPanel';
import type { ImageryLayerConfig } from '../../types';

const MOCK_LAYERS: ImageryLayerConfig[] = [
  { id: 'geocolor', sourceId: 'noaa', collection: 'GOESEastCONUSGeoColor', label: 'GOES East GeoColor', visible: false, opacity: 1, exclusive: true, tileSize: 256 },
  { id: 'fire-temp', sourceId: 'noaa', collection: 'GOESEastCONUSFireTemp', label: 'Fire Temperature', visible: false, opacity: 0.8, exclusive: false, tileSize: 256 },
  { id: 'band02', sourceId: 'noaa', collection: 'GOESEastCONUSBand02', label: 'Visible Band (0.64µm)', visible: false, opacity: 1, exclusive: false, tileSize: 256 },
];

const meta: Meta<typeof ImageryPanel> = {
  title: 'Controls/ImageryPanel',
  component: ImageryPanel,
};
export default meta;
type Story = StoryObj<typeof ImageryPanel>;

function ImageryPanelDemo({ withOpacity }: { withOpacity?: boolean }) {
  const [layers, setLayers] = useState(MOCK_LAYERS);

  const handleToggle = (layerId: string) => {
    setLayers(prev => {
      const target = prev.find(l => l.id === layerId);
      if (!target) return prev;
      const newVisible = !target.visible;
      return prev.map(l => {
        if (l.id === layerId) return { ...l, visible: newVisible };
        if (!newVisible) return l;
        if (target.exclusive) return { ...l, visible: false };
        if (l.exclusive && l.visible) return { ...l, visible: false };
        return l;
      });
    });
  };

  const handleOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, opacity } : l));
  };

  return (
    <div style={{ maxWidth: 300 }}>
      <ImageryPanel
        imageryLayers={layers}
        onToggleVisibility={handleToggle}
        onOpacityChange={withOpacity ? handleOpacity : undefined}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <ImageryPanelDemo />,
};

export const WithOpacity: Story = {
  render: () => <ImageryPanelDemo withOpacity />,
};
