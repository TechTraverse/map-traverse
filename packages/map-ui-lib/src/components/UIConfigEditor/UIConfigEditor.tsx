import type { UIConfig } from '../../types';

export interface UIConfigEditorProps {
  value: UIConfig;
  onChange: (config: UIConfig) => void;
  /** Keys that were auto-enabled by the wizard based on config state. */
  autoEnabled?: Set<keyof UIConfig>;
}

const TOGGLE_LABELS: { key: keyof UIConfig; label: string; description: string }[] = [
  { key: 'showLayerPanel', label: 'Layer Panel', description: 'Toggle layer visibility' },
  { key: 'showLegend', label: 'Legend', description: 'Map legend' },
  { key: 'showBasemapSwitcher', label: 'Basemap Switcher', description: 'Switch basemap styles' },
  { key: 'showSearchPanel', label: 'Search Panel', description: 'Search and filter features' },
  { key: 'showCoordinateDisplay', label: 'Coordinate Display', description: 'Show cursor coordinates' },
  { key: 'showFeatureDetail', label: 'Feature Detail Panel', description: 'Inspect feature properties' },
  { key: 'showFeatureTooltip', label: 'Feature Tooltip', description: 'Hover tooltip on features' },
  { key: 'showExportButton', label: 'Export Button', description: 'Export data as CSV' },
  { key: 'showLegendOpacity', label: 'Legend Opacity', description: 'Expand legend with opacity sliders' },
  { key: 'showMeasureTool', label: 'Measure Tool', description: 'Measure distances and areas on the map' },
  { key: 'showSelectionTool', label: 'Selection Tool', description: 'Select features by click or box draw' },
  { key: 'showImageryPanel', label: 'Imagery Panel', description: 'Toggle satellite imagery layers' },
];

export function UIConfigEditor({ value, onChange, autoEnabled }: UIConfigEditorProps) {
  const handleToggle = (key: keyof UIConfig, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1">
      <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-gray-500">
        Enable or disable UI panels and controls.
      </p>
      <div className="mapui:grid mapui:grid-cols-1 mapui:gap-2 sm:mapui:grid-cols-2">
        {TOGGLE_LABELS.map(({ key, label, description }) => {
          const checked = value[key];
          return (
            <label
              key={key}
              className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:justify-between mapui:gap-3 mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-3 mapui:py-2 hover:mapui:bg-gray-50"
            >
              <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">{label}</span>
                <span className="mapui:text-xs mapui:text-gray-500">{description}</span>
                {autoEnabled?.has(key) && (
                  <span className="mapui:text-[10px] mapui:font-medium mapui:text-blue-500">Auto-enabled</span>
                )}
              </div>
              <div className="mapui:relative mapui:flex mapui:shrink-0 mapui:items-center">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  className="mapui:sr-only"
                  aria-label={label}
                />
                <div
                  className={[
                    'mapui:relative mapui:h-5 mapui:w-9 mapui:rounded-full mapui:transition-colors',
                    checked ? 'mapui:bg-blue-600' : 'mapui:bg-gray-300',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mapui:absolute mapui:top-0.5 mapui:h-4 mapui:w-4 mapui:rounded-full mapui:bg-white mapui:shadow mapui:transition-transform',
                      checked ? 'mapui:translate-x-4' : 'mapui:translate-x-0.5',
                    ].join(' ')}
                  />
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
