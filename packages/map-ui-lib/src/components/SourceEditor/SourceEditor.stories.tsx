import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { OgcApiSource } from '../../types';
import { SourceEditor } from './SourceEditor';

const meta: Meta<typeof SourceEditor> = {
  title: 'Admin/SourceEditor',
  component: SourceEditor,
  parameters: {
    docs: {
      description: {
        component: 'Controlled form for editing a single OGC API source.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SourceEditor>;

const defaultSource: OgcApiSource = {
  id: 'tipg',
  url: 'http://localhost:8000',
  label: 'Local TiPG',
  tileMatrixSetId: 'WebMercatorQuad',
};

export const Default: Story = {
  render: () => {
    const [source, setSource] = useState<OgcApiSource>(defaultSource);
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SourceEditor value={source} onChange={setSource} />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(source, null, 2)}
        </pre>
      </div>
    );
  },
};

export const WithTestConnection: Story = {
  render: () => {
    const [source, setSource] = useState<OgcApiSource>(defaultSource);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SourceEditor
          value={source}
          onChange={setSource}
          testStatus={status}
          onTestConnection={() => {
            setStatus('loading');
            setTimeout(() => setStatus('success'), 1000);
          }}
        />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [source, setSource] = useState<OgcApiSource>({ id: '', url: '', tileMatrixSetId: 'WebMercatorQuad' });
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SourceEditor value={source} onChange={setSource} />
      </div>
    );
  },
};

export const LockedType: Story = {
  render: () => {
    const [source, setSource] = useState<OgcApiSource>(defaultSource);
    return (
      <div className="mapui:max-w-md mapui:p-4">
        <SourceEditor value={source} onChange={setSource} sourceType="features" />
        <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-3 mapui:text-xs">
          {JSON.stringify(source, null, 2)}
        </pre>
      </div>
    );
  },
};
