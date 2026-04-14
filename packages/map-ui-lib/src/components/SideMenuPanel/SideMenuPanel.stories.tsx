import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LuLayers3, LuMap, LuRuler, LuSearch, LuMousePointer2 } from 'react-icons/lu';
import { SideMenuPanel, SideMenuToggle } from './SideMenuPanel';
import type { SideMenuPanelItem } from './SideMenuPanel';

const SAMPLE_CONTROLS: SideMenuPanelItem[] = [
  {
    key: 'layers',
    label: 'Layers',
    icon: LuLayers3,
    content: (
      <div className="mapui:flex mapui:flex-col mapui:gap-1 mapui:text-sm mapui:text-slate-700">
        <label className="mapui:flex mapui:items-center mapui:gap-2">
          <input type="checkbox" defaultChecked /> Countries
        </label>
        <label className="mapui:flex mapui:items-center mapui:gap-2">
          <input type="checkbox" defaultChecked /> Rivers
        </label>
        <label className="mapui:flex mapui:items-center mapui:gap-2">
          <input type="checkbox" /> Cities
        </label>
      </div>
    ),
  },
  {
    key: 'search',
    label: 'Search',
    icon: LuSearch,
    content: (
      <input
        type="text"
        placeholder="Search features..."
        className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm"
      />
    ),
  },
  {
    key: 'measure',
    label: 'Measure',
    icon: LuRuler,
    content: <p className="mapui:m-0 mapui:text-sm mapui:text-slate-600">Measure distance or area.</p>,
  },
  {
    key: 'selection',
    label: 'Select',
    icon: LuMousePointer2,
    content: <p className="mapui:m-0 mapui:text-sm mapui:text-slate-600">Box or polygon select.</p>,
  },
  {
    key: 'basemap',
    label: 'Basemap',
    icon: LuMap,
    content: <p className="mapui:m-0 mapui:text-sm mapui:text-slate-600">Switch base layer.</p>,
  },
];

const meta: Meta<typeof SideMenuPanel> = {
  title: 'Components/SideMenuPanel',
  component: SideMenuPanel,
  parameters: {
    docs: {
      description: {
        component:
          'Slide-in-from-right scrollable panel that groups map controls into accordion sections. Designed for mobile viewports or admins who prefer a single hamburger menu.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof SideMenuPanel>;

function InteractiveSideMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mapui:relative mapui:h-[500px] mapui:w-full mapui:bg-gradient-to-br mapui:from-blue-100 mapui:to-green-100">
      <div className="mapui:absolute mapui:top-4 mapui:right-4">
        <SideMenuToggle onClick={() => setOpen(true)} />
      </div>
      <SideMenuPanel
        controls={SAMPLE_CONTROLS}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveSideMenu />,
};

export const OpenByDefault: Story = {
  render: () => (
    <div className="mapui:relative mapui:h-[500px] mapui:w-full mapui:bg-gradient-to-br mapui:from-blue-100 mapui:to-green-100">
      <SideMenuPanel
        controls={SAMPLE_CONTROLS}
        isOpen
        onClose={() => undefined}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="mapui:relative mapui:h-[500px] mapui:w-full">
      <SideMenuPanel controls={[]} isOpen onClose={() => undefined} />
    </div>
  ),
};
