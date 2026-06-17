import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CasedLineEditor } from './CasedLineEditor';
import type { CasedLinePair } from '../../utils/casedLine';

const meta: Meta<typeof CasedLineEditor> = {
  title: 'Admin/CasedLineEditor',
  component: CasedLineEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Friendly editor for a highway-style "cased line" (two stacked line layers). Set the inner road colour + width and the outer casing colour + edge directly, with a live combined preview.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CasedLineEditor>;

export const Default: Story = {
  render: () => {
    const [pair, setPair] = useState<CasedLinePair>([
      { type: 'line', paint: { 'line-color': '#1a5276', 'line-width': 4, 'line-opacity': 1 } },
      { type: 'line', paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 } },
    ]);
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <CasedLineEditor value={pair} onChange={setPair} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(pair, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WhiteRoadDarkCasing: Story = {
  render: () => {
    const [pair, setPair] = useState<CasedLinePair>([
      { type: 'line', paint: { 'line-color': '#222222', 'line-width': 6, 'line-opacity': 1 } },
      { type: 'line', paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': 1 } },
    ]);
    return (
      <div className="mapui:max-w-sm mapui:p-4">
        <CasedLineEditor value={pair} onChange={setPair} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(pair, null, 2)}
        </pre>
      </div>
    );
  },
};
