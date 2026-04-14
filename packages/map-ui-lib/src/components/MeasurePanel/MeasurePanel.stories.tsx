import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MeasurePanel } from './MeasurePanel';
import type { MeasureMode, MeasureUnit } from '../../utils/measure';
import { calculateDistance, calculateArea, calculateMeasurement, defaultUnitForMode } from '../../utils/measure';

const meta = {
  title: 'Components/MeasurePanel',
  component: MeasurePanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MeasurePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample points: roughly a triangle near NYC
const samplePoints: [number, number][] = [
  [-74.006, 40.7128],
  [-73.935, 40.73],
  [-73.98, 40.75],
];

function InteractiveWrapper() {
  const [mode, setMode] = useState<MeasureMode | null>('distance');
  const [unit, setUnit] = useState<MeasureUnit>('km');
  const [points, setPoints] = useState<[number, number][]>(samplePoints);

  const handleModeChange = (m: MeasureMode | null) => {
    setMode(m);
    setPoints([]);
    if (m) setUnit(defaultUnitForMode(m));
  };

  const measurement = mode ? calculateMeasurement(mode, points, unit) : null;

  return (
    <div className="mapui:w-64">
      <MeasurePanel
        mode={mode}
        onModeChange={handleModeChange}
        points={points}
        measurement={measurement}
        unit={unit}
        onUnitChange={setUnit}
        onClear={() => setPoints([])}
      />
      <p className="mapui:mt-3 mapui:text-xs mapui:text-slate-400">
        Toggle modes, switch units, and clear to see different states
      </p>
    </div>
  );
}

/**
 * Interactive measure panel with mode toggling and unit switching
 */
export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

/**
 * Distance measurement with preset points
 */
export const DistanceMeasurement: Story = {
  render: () => {
    const distance = calculateDistance(samplePoints, 'km');
    return (
      <div className="mapui:w-64">
        <MeasurePanel
          mode="distance"
          onModeChange={() => {}}
          points={samplePoints}
          measurement={{ value: distance, unit: 'km' }}
          unit="km"
          onUnitChange={() => {}}
          onClear={() => {}}
        />
      </div>
    );
  },
};

/**
 * Area measurement with preset points
 */
export const AreaMeasurement: Story = {
  render: () => {
    const area = calculateArea(samplePoints, 'km2');
    return (
      <div className="mapui:w-64">
        <MeasurePanel
          mode="area"
          onModeChange={() => {}}
          points={samplePoints}
          measurement={{ value: area, unit: 'km2' }}
          unit="km2"
          onUnitChange={() => {}}
          onClear={() => {}}
        />
      </div>
    );
  },
};

/**
 * Inactive state — no mode selected
 */
export const Inactive: Story = {
  render: () => (
    <div className="mapui:w-64">
      <MeasurePanel
        mode={null}
        onModeChange={() => {}}
        points={[]}
        measurement={null}
        unit="km"
        onUnitChange={() => {}}
        onClear={() => {}}
      />
    </div>
  ),
};

/**
 * Active mode but no points yet
 */
export const NoPoints: Story = {
  render: () => (
    <div className="mapui:w-64">
      <MeasurePanel
        mode="distance"
        onModeChange={() => {}}
        points={[]}
        measurement={null}
        unit="km"
        onUnitChange={() => {}}
        onClear={() => {}}
      />
    </div>
  ),
};
