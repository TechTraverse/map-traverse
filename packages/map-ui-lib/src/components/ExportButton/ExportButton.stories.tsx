import type { Meta, StoryObj } from '@storybook/react';
import { LuDownload } from 'react-icons/lu';
import { ExportButton } from './ExportButton';
import type { ExportButtonProps } from './ExportButton';

const meta: Meta<ExportButtonProps> = {
  title: 'Components/ExportButton',
  component: ExportButton,
  parameters: {
    docs: {
      description: {
        component:
          'An icon button that matches the map control strip style. Clicking it directly triggers an action (typically opens the ExportModal).',
      },
    },
  },
  args: {
    icon: LuDownload,
  },
  argTypes: {
    onExport: { action: 'export' },
  },
};

export default meta;

type Story = StoryObj<ExportButtonProps>;

/** Default state — clicking triggers the export action (typically opens ExportModal). */
export const Default: Story = {};

/** Loading state — button shows reduced opacity while export is in progress. */
export const Loading: Story = {
  args: {
    loading: true,
  },
};

/** Disabled state — button is non-interactive. */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
