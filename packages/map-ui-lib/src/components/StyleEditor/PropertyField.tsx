import type { PropertyDefinition } from './propertyMetadata';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

interface PropertyFieldProps {
  def: PropertyDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function TranslateWidget({
  value,
  onChange,
}: {
  value: [number, number] | undefined;
  onChange: (v: [number, number]) => void;
}) {
  const x = value?.[0] ?? 0;
  const y = value?.[1] ?? 0;
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <input
        type="number"
        step={0.5}
        value={x}
        onChange={(e) => onChange([parseFloat(e.target.value) || 0, y])}
        className={`${inputClass} mapui:w-20`}
        aria-label="X"
        placeholder="X"
      />
      <input
        type="number"
        step={0.5}
        value={y}
        onChange={(e) => onChange([x, parseFloat(e.target.value) || 0])}
        className={`${inputClass} mapui:w-20`}
        aria-label="Y"
        placeholder="Y"
      />
    </div>
  );
}

function OpacityWidget({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const v = value ?? 1;
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mapui:flex-1"
      />
      <span className="mapui:w-8 mapui:text-right mapui:text-xs mapui:text-gray-600">
        {v.toFixed(2)}
      </span>
    </div>
  );
}

function WidgetContent({
  def,
  value,
  onChange,
}: {
  def: PropertyDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (def.widget) {
    case 'color':
      return (
        <ColorPicker
          value={(value as string) ?? '#000000'}
          onChange={onChange}
          label={def.label}
        />
      );

    case 'opacity':
      return (
        <OpacityWidget
          value={value as number | undefined}
          onChange={onChange}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          value={(value as number | undefined) ?? def.min ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={inputClass}
        />
      );

    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={(value as boolean | undefined) ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
      );

    case 'enum':
      return (
        <select
          value={(value as string | undefined) ?? def.options?.[0] ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {def.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'translate':
      return (
        <TranslateWidget
          value={value as [number, number] | undefined}
          onChange={onChange}
        />
      );

    case 'dasharray':
    case 'stringArray': {
      const arr = value as unknown[] | undefined;
      const displayVal = arr ? arr.join(', ') : '';
      return (
        <input
          type="text"
          value={displayVal}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              onChange(undefined);
              return;
            }
            if (def.widget === 'dasharray') {
              const nums = raw.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
              onChange(nums.length > 0 ? nums : undefined);
            } else {
              const strs = raw.split(',').map((s) => s.trim()).filter(Boolean);
              onChange(strs.length > 0 ? strs : undefined);
            }
          }}
          placeholder={def.widget === 'dasharray' ? 'e.g. 2, 4' : 'comma-separated'}
          className={inputClass}
        />
      );
    }

    case 'text':
      return (
        <input
          type="text"
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputClass}
        />
      );

    default:
      return null;
  }
}

export function PropertyField({ def, value, onChange }: PropertyFieldProps) {
  const isOptional = def.enableDefault !== undefined;
  const isEnabled = value !== undefined;

  if (isOptional) {
    return (
      <FormField label={def.label}>
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              onChange(def.key, e.target.checked ? def.enableDefault : undefined);
            }}
            className="mapui:h-4 mapui:w-4 mapui:shrink-0 mapui:accent-blue-600"
          />
          {isEnabled && (
            <WidgetContent
              def={def}
              value={value}
              onChange={(v) => onChange(def.key, v)}
            />
          )}
        </div>
      </FormField>
    );
  }

  return (
    <FormField label={def.label}>
      <WidgetContent def={def} value={value} onChange={(v) => onChange(def.key, v)} />
    </FormField>
  );
}
