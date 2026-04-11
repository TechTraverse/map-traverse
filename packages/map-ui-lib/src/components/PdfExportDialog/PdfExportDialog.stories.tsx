import type { Meta, StoryObj } from '@storybook/react';
import { PdfExportDialog } from './PdfExportDialog';
import type { PdfExportDialogProps } from './PdfExportDialog';

const meta: Meta<PdfExportDialogProps> = {
  title: 'Components/PdfExportDialog',
  component: PdfExportDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Modal dialog for configuring a PDF map export. The library component is form-only — title, filename, and toggles for legend / scale bar / north arrow. The actual PDF rendering (jsPDF + html2canvas) is performed app-side.',
      },
    },
  },
  argTypes: {
    onExport: { action: 'export' },
    onClose: { action: 'close' },
  },
};

export default meta;

type Story = StoryObj<PdfExportDialogProps>;

export const Default: Story = {
  args: {
    open: true,
    defaultTitle: 'Map Export',
    defaultFilename: 'map.pdf',
  },
};

export const Loading: Story = {
  args: {
    open: true,
    defaultTitle: 'Quarterly Report Map',
    defaultFilename: 'q4-report.pdf',
    loading: true,
    progress: 'Rendering map...',
  },
};

export const WithError: Story = {
  args: {
    open: true,
    defaultTitle: 'Map Export',
    defaultFilename: 'map.pdf',
    error: 'Legend capture failed — try disabling it.',
  },
};
