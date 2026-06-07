import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { GeometryEditor, type GeometryEditorMode } from './GeometryEditor';

const meta: Meta<typeof GeometryEditor> = {
  title: 'Data/GeometryEditor',
  component: GeometryEditor,
  parameters: {
    docs: {
      description: {
        component:
          'Controlled, map-agnostic geometry editor with Draw / WKT / Coordinates tabs. The Draw tab renders an app-injected `mapSlot`; the library never imports a map.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof GeometryEditor>;

const SAMPLE_POLYGON: GeoJSON.Geometry = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
};

const MapStub = () => (
  <div className="mapui:flex mapui:h-48 mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-blue-50 mapui:text-sm mapui:text-slate-500">
    [ app-injected draw map goes here ]
  </div>
);

function Demo({
  initialMode,
  withMap = true,
  error,
}: {
  initialMode?: GeometryEditorMode;
  withMap?: boolean;
  error?: string;
}) {
  const [geometry, setGeometry] = useState<GeoJSON.Geometry | null>(SAMPLE_POLYGON);
  const [mode, setMode] = useState<GeometryEditorMode>(initialMode ?? 'wkt');
  return (
    <div className="mapui:w-96">
      <GeometryEditor
        geometry={geometry}
        onChange={setGeometry}
        geometryType="Polygon"
        mode={mode}
        onModeChange={setMode}
        mapSlot={withMap ? <MapStub /> : undefined}
        error={error}
      />
      <pre className="mapui:mt-4 mapui:rounded mapui:bg-slate-100 mapui:p-2 mapui:text-xs">
        {JSON.stringify(geometry, null, 2)}
      </pre>
    </div>
  );
}

export const WktTab: Story = { render: () => <Demo initialMode="wkt" /> };
export const CoordinatesTab: Story = { render: () => <Demo initialMode="coordinates" /> };
export const DrawTab: Story = { render: () => <Demo initialMode="draw" /> };
export const DrawTabNoMap: Story = { render: () => <Demo initialMode="draw" withMap={false} /> };
export const WithServerError: Story = {
  render: () => <Demo initialMode="wkt" error="Geometry is outside the allowed extent." />,
};
