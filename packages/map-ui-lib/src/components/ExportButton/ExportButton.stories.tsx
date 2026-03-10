import type { Meta, StoryObj } from '@storybook/react';
import { ExportButton } from './ExportButton';
import type { ExportButtonProps } from './ExportButton';

const meta: Meta<ExportButtonProps> = {
  title: 'Components/ExportButton',
  component: ExportButton,
  parameters: {
    docs: {
      description: {
        component:
          'A simple trigger button that opens the ExportModal. Shows loading state while an export is in progress.',
      },
    },
  },
  argTypes: {
    onExport: { action: 'export' },
  },
};

export default meta;

type Story = StoryObj<ExportButtonProps>;

/** Default state — clicking triggers the export action (typically opens ExportModal). */
export const Default: Story = {};

/** Loading state — shows "Exporting..." and disables the button. */
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
