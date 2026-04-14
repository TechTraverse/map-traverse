import type { ViewConfig } from '../../types';
import { FormField } from '../admin/FormField';

export interface ViewEditorProps {
  value: ViewConfig;
  onChange: (view: ViewConfig) => void;
}

interface ViewFieldConfig {
  key: keyof ViewConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  placeholder: string;
  optional?: boolean;
}

const FIELDS: ViewFieldConfig[] = [
  { key: 'latitude', label: 'Latitude', min: -90, max: 90, step: 0.000001, placeholder: '0' },
  { key: 'longitude', label: 'Longitude', min: -180, max: 180, step: 0.000001, placeholder: '0' },
  { key: 'zoom', label: 'Zoom', min: 0, max: 24, step: 0.1, placeholder: '2' },
  { key: 'pitch', label: 'Pitch (°)', min: 0, max: 85, step: 1, placeholder: '0' },
  { key: 'bearing', label: 'Bearing (°)', min: -180, max: 180, step: 1, placeholder: '0' },
  { key: 'minZoom', label: 'Min Zoom', min: 0, max: 24, step: 0.1, placeholder: '', optional: true },
  { key: 'maxZoom', label: 'Max Zoom', min: 0, max: 24, step: 0.1, placeholder: '', optional: true },
];

function getError(key: keyof ViewConfig, value: number | undefined, allValues: ViewConfig): string | undefined {
  const field = FIELDS.find((f) => f.key === key);
  if (!field) return undefined;
  if (value == null) return undefined;
  if (isNaN(value)) return 'Must be a number';
  if (value < field.min) return `Must be at least ${field.min}`;
  if (value > field.max) return `Must be at most ${field.max}`;
  if (key === 'minZoom' && allValues.maxZoom != null && value > allValues.maxZoom) {
    return 'Must be ≤ Max Zoom';
  }
  if (key === 'maxZoom' && allValues.minZoom != null && value < allValues.minZoom) {
    return 'Must be ≥ Min Zoom';
  }
  if (key === 'zoom') {
    if (allValues.minZoom != null && value < allValues.minZoom) return `Must be ≥ ${allValues.minZoom} (Min Zoom)`;
    if (allValues.maxZoom != null && value > allValues.maxZoom) return `Must be ≤ ${allValues.maxZoom} (Max Zoom)`;
  }
  return undefined;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function ViewEditor({ value, onChange }: ViewEditorProps) {
  const update = (key: keyof ViewConfig, raw: string, optional?: boolean) => {
    if (optional && raw.trim() === '') {
      onChange({ ...value, [key]: undefined });
      return;
    }
    const num = parseFloat(raw);
    onChange({ ...value, [key]: isNaN(num) ? 0 : num });
  };

  return (
    <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
      {FIELDS.map(({ key, label, min, max, step, placeholder, optional }) => {
        const error = getError(key, value[key], value);
        return (
          <FormField key={key} label={label} error={error}>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value[key] ?? ''}
              placeholder={placeholder}
              onChange={(e) => update(key, e.target.value, optional)}
              className={`${inputClass} ${error ? 'mapui:border-red-400' : ''}`}
            />
          </FormField>
        );
      })}
    </div>
  );
}
