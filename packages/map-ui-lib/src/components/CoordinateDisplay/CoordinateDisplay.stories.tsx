import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  CoordinateDisplay,
  formatDecimal,
  formatDMS,
  formatDDM,
  type CoordinateFormatOption,
} from './CoordinateDisplay';

const meta = {
  title: 'Components/CoordinateDisplay',
  component: CoordinateDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CoordinateDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultFormats: CoordinateFormatOption[] = [
  { id: 'decimal', label: 'Decimal', format: formatDecimal },
  { id: 'ddm', label: 'DDM', format: formatDDM },
  { id: 'dms', label: 'DMS', format: formatDMS },
];

/**
 * Interactive wrapper to demonstrate format cycling
 */
function InteractiveWrapper({
  latitude,
  longitude,
  formats,
}: {
  latitude: number | null;
  longitude: number | null;
  formats: CoordinateFormatOption[];
}) {
  const [activeFormat, setActiveFormat] = useState(formats[0].id);

  return (
    <div className="mapui:space-y-4">
      <CoordinateDisplay
        latitude={latitude}
        longitude={longitude}
        activeFormat={activeFormat}
        formats={formats}
        onFormatChange={setActiveFormat}
      />
      <p className="mapui:text-sm mapui:text-slate-600">
        Click the format label to cycle through formats
      </p>
    </div>
  );
}

/**
 * Default coordinate display in decimal degrees
 */
export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      latitude={40.7128}
      longitude={-74.006}
      formats={defaultFormats}
    />
  ),
};

/**
 * DMS (Degrees, Minutes, Seconds) format
 */
export const DMS: Story = {
  render: () => {
    const [activeFormat, setActiveFormat] = useState('dms');
    return (
      <CoordinateDisplay
        latitude={40.7128}
        longitude={-74.006}
        activeFormat={activeFormat}
        formats={defaultFormats}
        onFormatChange={setActiveFormat}
      />
    );
  },
};

/**
 * DDM (Degrees + decimal minutes) format
 */
export const DDM: Story = {
  render: () => {
    const [activeFormat, setActiveFormat] = useState('ddm');
    return (
      <CoordinateDisplay
        latitude={40.7128}
        longitude={-74.006}
        activeFormat={activeFormat}
        formats={defaultFormats}
        onFormatChange={setActiveFormat}
      />
    );
  },
};

/**
 * No coordinates (null state)
 */
export const NoCoordinates: Story = {
  render: () => {
    const [activeFormat, setActiveFormat] = useState('decimal');
    return (
      <CoordinateDisplay
        latitude={null}
        longitude={null}
        activeFormat={activeFormat}
        formats={defaultFormats}
        onFormatChange={setActiveFormat}
      />
    );
  },
};

/**
 * Custom styling with className
 */
export const CustomStyling: Story = {
  render: () => (
    <InteractiveWrapper
      latitude={51.5074}
      longitude={-0.1278}
      formats={defaultFormats}
    />
  ),
};

/**
 * Pin-drop: click the readout to expand, then either type coordinates or hit
 * the pin button to enter pin-drop mode. In an app, the pin button puts the
 * map into a one-shot mode where the next click drops a pin at that location.
 */
export const WithPinDrop: Story = {
  render: () => {
    const [activeFormat, setActiveFormat] = useState('decimal');
    const [pinDropActive, setPinDropActive] = useState(false);
    return (
      <div className="mapui:space-y-2">
        <CoordinateDisplay
          latitude={40.7128}
          longitude={-74.006}
          activeFormat={activeFormat}
          formats={defaultFormats}
          onFormatChange={setActiveFormat}
          onNavigate={(lat, lng) => console.log('navigate', lat, lng)}
          onPinDropRequest={() => setPinDropActive((v) => !v)}
          pinDropActive={pinDropActive}
        />
        <p className="mapui:text-sm mapui:text-slate-600">
          Pin button toggles a parent-owned <code>pinDropActive</code> flag.
          Active state: <strong>{pinDropActive ? 'on' : 'off'}</strong>.
        </p>
      </div>
    );
  },
};

/**
 * Go-to lat/long: click the readout to expand the input form. Submit routes
 * through the `onNavigate` callback — in an app, wire this to `map.flyTo`.
 */
export const GoToLatLong: Story = {
  render: () => {
    const [activeFormat, setActiveFormat] = useState('decimal');
    const [lastNavigated, setLastNavigated] = useState<{ lat: number; lng: number } | null>(null);
    return (
      <div className="mapui:space-y-2">
        <CoordinateDisplay
          latitude={40.7128}
          longitude={-74.006}
          activeFormat={activeFormat}
          formats={defaultFormats}
          onFormatChange={setActiveFormat}
          onNavigate={(lat, lng) => setLastNavigated({ lat, lng })}
        />
        <p className="mapui:text-sm mapui:text-slate-600">
          Click the coordinate readout to open the input form. Accepts decimal,
          DDM, or DMS (with optional N/S/E/W).
        </p>
        {lastNavigated && (
          <p className="mapui:text-sm mapui:text-green-700 mapui:font-mono">
            Navigated to {lastNavigated.lat.toFixed(4)}, {lastNavigated.lng.toFixed(4)}
          </p>
        )}
      </div>
    );
  },
};
