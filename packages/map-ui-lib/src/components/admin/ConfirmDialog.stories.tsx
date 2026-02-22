import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Admin/Primitives/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    docs: {
      description: {
        component: 'Simple modal dialog for destructive action confirmation.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mapui:cursor-pointer mapui:rounded mapui:bg-red-600 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-white hover:mapui:bg-red-700"
        >
          Delete Source
        </button>
        <ConfirmDialog
          open={open}
          title="Delete Source"
          description="Are you sure you want to delete this source? This action cannot be undone."
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  },
};

export const OpenByDefault: Story = {
  args: {
    open: true,
    title: 'Remove Layer',
    description: 'This will permanently remove the layer from the configuration.',
    onConfirm: () => {},
    onCancel: () => {},
  },
};
