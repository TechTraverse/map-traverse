import type { LegendEntry } from '../../types';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';

export interface LegendEntryEditorProps {
  value: LegendEntry;
  onChange: (entry: LegendEntry) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const OUTLINE_SHAPES = new Set<NonNullable<LegendEntry['shape']>>([
  'outline-square',
  'outline-circle',
]);

export function LegendEntryEditor({ value, onChange }: LegendEntryEditorProps) {
  const isOutline = OUTLINE_SHAPES.has(value.shape ?? 'square');
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
          <option value="outline-square">Outline square (no fill)</option>
          <option value="outline-circle">Outline circle (no fill)</option>
        </select>
      </FormField>
      {isOutline && (
        <>
          <FormField label="Outline color">
            <ColorPicker
              value={value.outlineColor ?? value.color}
              onChange={(outlineColor) => onChange({ ...value, outlineColor })}
              label="Outline color"
            />
          </FormField>
          <FormField label="Outline width">
            <input
              type="number"
              min={0}
              step={0.5}
              value={value.outlineWidth ?? 1}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                onChange({ ...value, outlineWidth: Number.isNaN(n) ? undefined : n });
              }}
              className={inputClass}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
