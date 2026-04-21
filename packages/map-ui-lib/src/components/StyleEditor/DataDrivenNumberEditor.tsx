import type { AvailableProperty, FetchDistinctValuesFn } from '../../types';
import { DataDrivenExpressionEditor } from './DataDrivenExpressionEditor';

export interface DataDrivenNumberEditorProps {
  value: unknown[];
  onChange: (expr: unknown[]) => void;
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
  /** Numeric input bounds/step; passed through to <input type="number" />. */
  min?: number;
  max?: number;
  step?: number;
}

const numberInputClass =
  'mapui:w-24 mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function DataDrivenNumberEditor({
  value,
  onChange,
  availableProperties = [],
  onFetchDistinctValues,
  min,
  max,
  step,
}: DataDrivenNumberEditorProps) {
  return (
    <DataDrivenExpressionEditor<number>
      value={value}
      onChange={onChange}
      availableProperties={availableProperties}
      supportedModes={['match', 'interpolate']}
      parseOutput={(raw) => {
        if (typeof raw === 'number') return raw;
        const n = parseFloat(String(raw));
        return isNaN(n) ? (min ?? 0) : n;
      }}
      serializeOutput={(v) => v}
      defaultOutput={() => min ?? 1}
      renderOutputCell={({ value: n, onChange: setN, context, rowIndex }) => (
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={Number.isFinite(n) ? n : ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setN(isNaN(v) ? (min ?? 0) : v);
          }}
          className={numberInputClass}
          aria-label={
            context === 'fallback'
              ? 'Fallback value'
              : context === 'stop'
              ? `Value at stop ${rowIndex}`
              : `Pair value ${rowIndex}`
          }
        />
      )}
      onFetchDistinctValues={onFetchDistinctValues}
    />
  );
}
