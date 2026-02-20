import type { Meta, StoryObj } from '@storybook/react';
import { ExportButton } from './ExportButton';
import type { ExportButtonProps, ExportableLayer } from './ExportButton';

const sampleLayers: ExportableLayer[] = [
  { id: 'countries', label: 'Countries', collection: 'ne_110m_admin_0_countries' },
  { id: 'rivers', label: 'Rivers', collection: 'ne_110m_rivers_lake_centerlines' },
  { id: 'cities', label: 'Populated Places', collection: 'ne_110m_populated_places' },
];

const meta: Meta<ExportButtonProps> = {
  title: 'Components/ExportButton',
  component: ExportButton,
  parameters: {
    docs: {
      description: {
        component:
          'Triggers CSV export for one or more layers. Single layer → direct button click. Multiple layers → dropdown menu. Pair with the useCsvExport hook for data fetching.',
      },
    },
  },
  argTypes: {
    onExport: { action: 'export' },
  },
};

export default meta;

type Story = StoryObj<ExportButtonProps>;

/** Single layer — clicking directly triggers the export action. */
export const SingleLayer: Story = {
  args: {
    layers: [sampleLayers[0]],
  },
};

/** Multiple layers — opens a dropdown to select which layer to export. */
export const MultipleLayers: Story = {
  args: {
    layers: sampleLayers,
  },
};

/** Loading state — shows "Exporting..." and disables the button. */
export const Loading: Story = {
  args: {
    layers: sampleLayers,
    loading: true,
  },
};

/** Disabled state — button is non-interactive. */
export const Disabled: Story = {
  args: {
    layers: sampleLayers,
    disabled: true,
  },
};
