import type { LegendConfig, LegendEntry } from '../../types';
import { LegendEntryEditor } from './LegendEntryEditor';

export interface LegendEditorProps {
  value: LegendConfig | undefined;
  onChange: (legend: LegendConfig | undefined) => void;
}

const defaultEntry = (): LegendEntry => ({ label: '', color: '#4a90d9', shape: 'square' });

export function LegendEditor({ value, onChange }: LegendEditorProps) {
  const entries = value?.entries ?? [];

  const handleAddEntry = () => {
    onChange({ entries: [...entries, defaultEntry()] });
  };

  const handleUpdateEntry = (index: number, entry: LegendEntry) => {
    const updated = entries.map((e, i) => (i === index ? entry : e));
    onChange({ entries: updated });
  };

  const handleRemoveEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? { entries: updated } : undefined);
  };

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ entries: [defaultEntry()] });
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <input
          type="checkbox"
          id="legend-enabled"
          checked={value !== undefined}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
        <label htmlFor="legend-enabled" className="mapui:text-sm mapui:font-medium mapui:text-gray-700">
          Enable Legend
        </label>
      </div>

      {value !== undefined && (
        <>
          <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
            {entries.map((entry, index) => (
              <li
                key={index}
                className="mapui:rounded mapui:border mapui:border-gray-200 mapui:p-3"
              >
                <div className="mapui:mb-2 mapui:flex mapui:items-center mapui:justify-between">
                  <span className="mapui:text-xs mapui:font-medium mapui:text-gray-600">
                    Entry {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(index)}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <LegendEntryEditor
                  value={entry}
                  onChange={(updated) => handleUpdateEntry(index, updated)}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleAddEntry}
            className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
          >
            + Add Entry
          </button>
        </>
      )}
    </div>
  );
}
