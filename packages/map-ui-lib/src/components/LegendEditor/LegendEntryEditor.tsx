import type { LegendEntry } from '../../types';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';

export interface LegendEntryEditorProps {
  value: LegendEntry;
  onChange: (entry: LegendEntry) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function LegendEntryEditor({ value, onChange }: LegendEntryEditorProps) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      <FormField label="Label">
        <input
          type="text"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Legend entry label"
          className={inputClass}
        />
      </FormField>
      <FormField label="Color">
        <ColorPicker
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
          label="Entry color"
        />
      </FormField>
      <FormField label="Shape">
        <select
          value={value.shape ?? 'square'}
          onChange={(e) =>
            onChange({ ...value, shape: e.target.value as LegendEntry['shape'] })
          }
          className={inputClass}
        >
          <option value="square">Square</option>
          <option value="circle">Circle</option>
          <option value="line">Line</option>
        </select>
      </FormField>
    </div>
  );
}
