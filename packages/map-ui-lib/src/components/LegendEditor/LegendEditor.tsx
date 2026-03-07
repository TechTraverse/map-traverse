import { useMemo } from 'react';
import type { LegendConfig, LegendEntry, StyleConfig } from '../../types';
import { LegendEntryEditor } from './LegendEntryEditor';
import {
  isExpression,
  expressionType,
  expressionEntries,
  expressionPropertyName,
  getPrimaryColor,
  getShapeForStyleType,
} from '../../utils/expressionColors';

export interface LegendEditorProps {
  value: LegendConfig | undefined;
  onChange: (legend: LegendConfig | undefined) => void;
  styles?: StyleConfig[];
}

const defaultEntry = (): LegendEntry => ({ label: '', color: '#4a90d9', shape: 'square' });

const MAX_PREVIEW_SWATCHES = 8;

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

type StyleEntries = {
  entries: LegendEntry[];
  mode: 'categorical' | 'gradient' | 'simple';
  property: string | null;
};

export function LegendEditor({ value, onChange, styles }: LegendEditorProps) {
  const entries = value?.entries ?? [];
  const displayMode = value?.displayMode ?? 'simple';

  // Derive legend entries from all styles (expressions and plain colors)
  const styleEntries = useMemo((): StyleEntries | null => {
    if (!styles || styles.length === 0) return null;
    const allEntries: LegendEntry[] = [];
    let mode: 'categorical' | 'gradient' | 'simple' = 'simple';
    let gradientProperty: string | null = null;
    for (const style of styles) {
      const raw = getPrimaryColor(style);
      const shape = getShapeForStyleType(style);
      if (isExpression(raw)) {
        const type = expressionType(raw);
        if (!type) continue;
        const exprEntries = expressionEntries(raw).map((e) => ({ label: e.label, color: e.color, shape }));
        allEntries.push(...exprEntries);
        if (type === 'interpolate') {
          mode = 'gradient';
          if (!gradientProperty) gradientProperty = expressionPropertyName(raw);
        } else if (mode === 'simple') {
          mode = 'categorical';
        }
      } else if (typeof raw === 'string') {
        allEntries.push({ label: style.type, color: raw, shape });
      }
    }
    if (allEntries.length === 0) return null;
    return { entries: allEntries, mode, property: gradientProperty };
  }, [styles]);

  const handleAddEntry = () => {
    onChange({ ...value, entries: [...entries, defaultEntry()] } as LegendConfig);
  };

  const handleUpdateEntry = (index: number, entry: LegendEntry) => {
    const updated = entries.map((e, i) => (i === index ? entry : e));
    onChange({ ...value, entries: updated } as LegendConfig);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? { ...value, entries: updated } as LegendConfig : undefined);
  };

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({ entries: [defaultEntry()] });
    } else {
      onChange(undefined);
    }
  };

  const handleGenerateFromStyle = () => {
    if (!styleEntries) return;
    onChange({
      entries: styleEntries.entries,
      displayMode: styleEntries.mode,
      ...(styleEntries.mode === 'gradient' && styleEntries.property
        ? { gradientProperty: styleEntries.property }
        : {}),
      ...(styleEntries.mode === 'categorical' ? { showLabelsCollapsed: false } : {}),
    });
  };

  const handleDisplayModeChange = (mode: 'categorical' | 'gradient' | 'simple') => {
    if (!value) return;
    const updated: LegendConfig = { ...value, displayMode: mode };
    // Clean up mode-specific fields when switching away
    if (mode !== 'categorical') delete updated.showLabelsCollapsed;
    if (mode !== 'gradient') delete updated.gradientProperty;
    onChange(updated);
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

      {/* Style info banner when legend is disabled */}
      {value === undefined && styleEntries && styleEntries.entries.length > 0 && (
        <div className="mapui:rounded mapui:border mapui:border-blue-200 mapui:bg-blue-50 mapui:p-3">
          <p className="mapui:m-0 mapui:text-sm mapui:text-blue-800">
            {styleEntries.mode !== 'simple'
              ? `This layer uses data-driven colors (${styleEntries.entries.length} ${styleEntries.entries.length === 1 ? 'category' : 'categories'})`
              : `This layer has ${styleEntries.entries.length} style ${styleEntries.entries.length === 1 ? 'color' : 'colors'}`}
          </p>
          <div className="mapui:mt-2 mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-1.5">
            {styleEntries.entries.slice(0, MAX_PREVIEW_SWATCHES).map((entry, i) => (
              <div
                key={`${entry.label}-${i}`}
                className="mapui:flex mapui:items-center mapui:gap-1"
                title={entry.label}
              >
                <span
                  className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:rounded-sm mapui:shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="mapui:text-xs mapui:text-blue-700 mapui:truncate mapui:max-w-16">
                  {entry.label}
                </span>
              </div>
            ))}
            {styleEntries.entries.length > MAX_PREVIEW_SWATCHES && (
              <span className="mapui:text-xs mapui:text-blue-600">
                +{styleEntries.entries.length - MAX_PREVIEW_SWATCHES} more
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateFromStyle}
            className="mapui:mt-2 mapui:cursor-pointer mapui:rounded mapui:border mapui:border-blue-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-blue-700 hover:mapui:bg-blue-100"
          >
            Generate from Style
          </button>
        </div>
      )}

      {value !== undefined && (
        <>
          {/* Display Mode selector */}
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <label htmlFor="legend-display-mode" className="mapui:text-sm mapui:text-gray-700">
              Display Mode
            </label>
            <select
              id="legend-display-mode"
              value={displayMode}
              onChange={(e) => handleDisplayModeChange(e.target.value as 'categorical' | 'gradient' | 'simple')}
              className={inputClass}
            >
              <option value="simple">Simple</option>
              <option value="categorical">Categorical</option>
              <option value="gradient">Gradient</option>
            </select>
          </div>

          {/* Categorical-specific: Show labels in collapsed view */}
          {displayMode === 'categorical' && (
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="checkbox"
                id="legend-show-labels-collapsed"
                checked={value.showLabelsCollapsed ?? false}
                onChange={(e) => onChange({ ...value, showLabelsCollapsed: e.target.checked })}
                className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
              />
              <label htmlFor="legend-show-labels-collapsed" className="mapui:text-sm mapui:text-gray-700">
                Show labels in collapsed view
              </label>
            </div>
          )}

          {/* Gradient-specific: Property name */}
          {displayMode === 'gradient' && (
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <label htmlFor="legend-gradient-property" className="mapui:text-sm mapui:text-gray-700">
                Gradient Property
              </label>
              <input
                type="text"
                id="legend-gradient-property"
                value={value.gradientProperty ?? ''}
                onChange={(e) => onChange({ ...value, gradientProperty: e.target.value || undefined })}
                placeholder="e.g. POP_EST"
                className={inputClass}
              />
            </div>
          )}

          {/* Entries list */}
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

          <div className="mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={handleAddEntry}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
            >
              + Add Entry
            </button>
            {styleEntries && styleEntries.entries.length > 0 && (
              <button
                type="button"
                onClick={handleGenerateFromStyle}
                className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-blue-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-blue-700 hover:mapui:bg-blue-50"
              >
                Populate from Style ({styleEntries.entries.length} entries)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
