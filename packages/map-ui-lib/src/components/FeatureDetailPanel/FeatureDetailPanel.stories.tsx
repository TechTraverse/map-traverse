import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureDetailPanel } from './FeatureDetailPanel';
import type { FeatureDetailPanelProps } from './FeatureDetailPanel';

const sampleProperties = {
  name: 'United States',
  iso_a2: 'US',
  pop_est: 331002651,
  gdp_md_est: 21433226,
  continent: 'North America',
  subregion: 'Northern America',
  capital: 'Washington D.C.',
  active: true,
  tags: ['country', 'g7', 'nato'],
  metadata: null,
};

function InteractivePanel(props: FeatureDetailPanelProps) {
  const [isOpen, setIsOpen] = useState(props.isOpen);
  return (
    <div>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-slate-700 hover:mapui:bg-slate-50"
        >
          Open Panel
        </button>
      )}
      <FeatureDetailPanel {...props} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

const meta: Meta<FeatureDetailPanelProps> = {
  title: 'Components/FeatureDetailPanel',
  component: FeatureDetailPanel,
  render: (args) => <InteractivePanel {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Displays GeoJSON feature properties in a panel or modal. Fully controlled via isOpen/onClose props. Panel variant renders inline; modal variant renders a full-screen backdrop overlay.',
      },
    },
  },
  argTypes: {
    onClose: { action: 'close' },
    variant: { control: 'radio', options: ['panel', 'modal'] },
  },
};

export default meta;

type Story = StoryObj<FeatureDetailPanelProps>;

/** Default panel variant showing feature properties. */
export const Default: Story = {
  args: {
    isOpen: true,
    properties: sampleProperties,
    title: 'Feature Properties',
    variant: 'panel',
  },
};

/** Modal variant with semi-transparent backdrop — clicking outside closes it. */
export const Modal: Story = {
  args: {
    isOpen: true,
    properties: sampleProperties,
    title: 'Feature Details',
    variant: 'modal',
  },
};

/** Panel with null properties — shows "No properties available" message. */
export const EmptyProperties: Story = {
  args: {
    isOpen: true,
    properties: null,
    title: 'Empty Feature',
    variant: 'panel',
  },
};

/** Panel with 25 properties — tests vertical scrolling. */
export const ManyProperties: Story = {
  args: {
    isOpen: true,
    properties: Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`property_${String(i + 1).padStart(2, '0')}`, `value ${i + 1}`]),
    ),
    title: 'Many Properties (scroll test)',
    variant: 'panel',
  },
};

/** Mixed value types including arrays, booleans, null, numbers, and objects. */
export const MixedValueTypes: Story = {
  args: {
    isOpen: true,
    properties: {
      name: 'Test Feature',
      count: 42,
      ratio: 3.14159,
      active: true,
      archived: false,
      tags: ['geo', 'map', 'ogc'],
      metadata: { source: 'api', version: 2 },
      missing: null,
      empty_string: '',
    },
    title: 'Mixed Types',
    variant: 'panel',
  },
};
