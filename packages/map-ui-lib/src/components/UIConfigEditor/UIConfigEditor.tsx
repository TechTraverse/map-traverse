import { useMemo, useState } from 'react';
import type { UIConfig, OrderableControlKey, LayerConfig, ControlCorner } from '../../types';
import { ORDERABLE_CONTROLS, resolveControlOrder, resolveControlCorner, CONTROL_CORNERS, COORDINATE_FORMATS } from '../../schemas/config';

export interface UIConfigEditorProps {
  value: UIConfig;
  onChange: (config: UIConfig) => void;
  /** Keys that were auto-enabled by the wizard based on config state. */
  autoEnabled?: Set<keyof UIConfig>;
  /**
   * Optional list of layers that have legend configs. When provided, the editor
   * renders a "Legend Order" reorder UI that writes to `value.legendOrder`.
   */
  layers?: LayerConfig[];
}

const CORNER_LABELS: Record<ControlCorner, string> = {
  'top-right': 'Top right',
  'top-left': 'Top left',
  'bottom-right': 'Bottom right',
  'bottom-left': 'Bottom left',
};

const COORDINATE_FORMAT_LABELS: Record<(typeof COORDINATE_FORMATS)[number], string> = {
  'decimal-degrees': 'Decimal degrees (38.887500, -104.824167)',
  ddm: "Degree decimal minutes (38° 53.250' N, 104° 49.450' W)",
  dms: "Degree minutes seconds (38° 53' 15\" N, 104° 49' 27\" W)",
};

const TOGGLE_LABELS: { key: keyof UIConfig; label: string; description: string }[] = [
  { key: 'showLayerPanel', label: 'Layer Panel', description: 'Toggle layer visibility' },
  { key: 'showLegend', label: 'Legend', description: 'Map legend' },
  { key: 'showBasemapSwitcher', label: 'Basemap Switcher', description: 'Switch basemap styles' },
  { key: 'showSearchPanel', label: 'Search Panel', description: 'Search and filter features' },
  { key: 'showCoordinateDisplay', label: 'Coordinate Display', description: 'Show cursor coordinates' },
  { key: 'showFeatureDetail', label: 'Feature Detail Panel', description: 'Inspect feature properties' },
  { key: 'showFeatureTooltip', label: 'Feature Tooltip', description: 'Hover tooltip on features' },
  { key: 'showExportButton', label: 'Export Button', description: 'Export data as CSV' },
  { key: 'showExportPdf', label: 'Export as PDF', description: 'Enable PDF map export with title, legend, scale bar' },
  { key: 'showLegendOpacity', label: 'Legend Opacity', description: 'Expand legend with opacity sliders' },
  { key: 'showMeasureTool', label: 'Measure Tool', description: 'Measure distances and areas on the map' },
  { key: 'showSelectionTool', label: 'Selection Tool', description: 'Select features by click or box draw' },
  { key: 'showImageryPanel', label: 'Imagery Panel', description: 'Toggle satellite imagery layers' },
  { key: 'showCompass', label: 'Compass', description: 'Show map compass; click to reset to north' },
  { key: 'showGlobalSearch', label: 'Global Search', description: 'Cross-layer search bar above the map' },
  { key: 'showScaleBar', label: 'Scale Bar', description: 'Display map scale bar' },
];

const ORDERABLE_SET = new Set<string>(ORDERABLE_CONTROLS);

const NON_ORDERABLE_TOGGLES = TOGGLE_LABELS.filter((t) => !ORDERABLE_SET.has(t.key));

const TOGGLE_INFO = new Map(TOGGLE_LABELS.map((t) => [t.key, t]));

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mapui:relative mapui:flex mapui:shrink-0 mapui:cursor-pointer mapui:items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mapui:sr-only"
        aria-label={label}
      />
      <span
        className={[
          'mapui:relative mapui:block mapui:h-5 mapui:w-9 mapui:rounded-full mapui:transition-colors',
          checked ? 'mapui:bg-blue-600' : 'mapui:bg-gray-300',
        ].join(' ')}
      >
        <span
          className={[
            'mapui:absolute mapui:top-0.5 mapui:block mapui:h-4 mapui:w-4 mapui:rounded-full mapui:bg-white mapui:shadow mapui:transition-transform',
            checked ? 'mapui:translate-x-4' : 'mapui:translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </label>
  );
}

export function UIConfigEditor({ value, onChange, autoEnabled, layers }: UIConfigEditorProps) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const controlOrder = useMemo(() => resolveControlOrder(value), [value]);

  // Effective legend order: merge stored order with any new legend-bearing layers
  // so the editor row list always reflects the current set.
  const legendLayerOptions = useMemo(
    () => (layers ?? []).filter((l) => l.legend !== undefined),
    [layers],
  );
  const effectiveLegendOrder = useMemo(() => {
    const ids = legendLayerOptions.map((l) => l.id);
    const stored = value.legendOrder ?? [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const id of stored) {
      if (ids.includes(id) && !seen.has(id)) {
        merged.push(id);
        seen.add(id);
      }
    }
    for (const id of ids) {
      if (!seen.has(id)) merged.push(id);
    }
    return merged;
  }, [legendLayerOptions, value.legendOrder]);

  const updateLegendOrder = (newOrder: string[]) => {
    onChange({ ...value, legendOrder: newOrder });
  };

  const handleLegendMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...effectiveLegendOrder];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateLegendOrder(updated);
  };

  const handleLegendMoveDown = (index: number) => {
    if (index === effectiveLegendOrder.length - 1) return;
    const updated = [...effectiveLegendOrder];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateLegendOrder(updated);
  };

  const handleToggle = (key: keyof UIConfig, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  const updateOrder = (newOrder: OrderableControlKey[]) => {
    onChange({ ...value, controlOrder: newOrder });
  };

  const handleCornerChange = (key: OrderableControlKey, corner: ControlCorner) => {
    const next = { ...(value.controlPositions ?? {}) } as Record<OrderableControlKey, ControlCorner>;
    if (corner === 'top-right') {
      delete next[key];
    } else {
      next[key] = corner;
    }
    const hasAny = Object.keys(next).length > 0;
    onChange({ ...value, controlPositions: hasAny ? next : undefined });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...controlOrder];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateOrder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === controlOrder.length - 1) return;
    const updated = [...controlOrder];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateOrder(updated);
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, key: string) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  };

  const handleDragLeave = () => {
    setDragOverKey(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetKey: string) => {
    e.preventDefault();
    setDragOverKey(null);

    const fromKey = draggedKey;
    setDraggedKey(null);

    if (!fromKey || fromKey === targetKey) return;

    const fromIndex = controlOrder.indexOf(fromKey as OrderableControlKey);
    const toIndex = controlOrder.indexOf(targetKey as OrderableControlKey);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...controlOrder];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, controlOrder[fromIndex]);
    updateOrder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      {/* Orderable controls */}
      <div className="mapui:flex mapui:flex-col mapui:gap-1">
        <h4 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:text-gray-700">
          Control Stack Order
        </h4>
        <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-gray-500">
          Drag or use arrows to set the display order of map controls.
        </p>
        <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1.5 mapui:p-0">
          {controlOrder.map((key, index) => {
            const info = TOGGLE_INFO.get(key as keyof UIConfig);
            if (!info) return null;
            const checked = value[key as keyof UIConfig] as boolean;
            const isDragged = draggedKey === key;
            const isDragOver = dragOverKey === key;

            return (
              <li
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(e, key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
                onDragEnd={handleDragEnd}
                className={[
                  'mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:transition-colors',
                  isDragOver ? 'mapui:border-blue-400 mapui:bg-blue-50' : 'mapui:border-gray-200',
                  isDragged ? 'mapui:opacity-50' : 'mapui:opacity-100',
                ].join(' ')}
              >
                <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move control up"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === controlOrder.length - 1}
                    aria-label="Move control down"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <span
                  className="mapui:shrink-0 mapui:cursor-grab mapui:text-gray-400 active:mapui:cursor-grabbing"
                  aria-hidden="true"
                >
                  ⠿
                </span>
                <div className="mapui:flex mapui:min-w-0 mapui:flex-1 mapui:flex-col mapui:gap-0.5">
                  <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">{info.label}</span>
                  <span className="mapui:text-xs mapui:text-gray-500">{info.description}</span>
                  {autoEnabled?.has(key as keyof UIConfig) && (
                    <span className="mapui:text-[10px] mapui:font-medium mapui:text-blue-500">Auto-enabled</span>
                  )}
                </div>
                <select
                  value={resolveControlCorner(value, key)}
                  onChange={(e) => handleCornerChange(key, e.target.value as ControlCorner)}
                  aria-label={`${info.label} position`}
                  className="mapui:shrink-0 mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-1.5 mapui:py-1 mapui:text-xs mapui:text-gray-700 focus:mapui:border-blue-500 focus:mapui:outline-none"
                >
                  {CONTROL_CORNERS.map((c) => (
                    <option key={c} value={c}>
                      {CORNER_LABELS[c]}
                    </option>
                  ))}
                </select>
                <Toggle
                  checked={checked}
                  onChange={(v) => handleToggle(key as keyof UIConfig, v)}
                  label={info.label}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Non-orderable controls */}
      <div className="mapui:flex mapui:flex-col mapui:gap-1">
        <h4 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:text-gray-700">
          Other Controls
        </h4>
        <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-gray-500">
          These controls have fixed positions on the map.
        </p>
        <div className="mapui:grid mapui:grid-cols-1 mapui:gap-2 sm:mapui:grid-cols-2">
          {NON_ORDERABLE_TOGGLES.map(({ key, label, description }) => {
            const checked = value[key] as boolean;
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
                <Toggle checked={checked} onChange={(v) => handleToggle(key, v)} label={label} />
              </label>
            );
          })}
        </div>
      </div>

      {/* Coordinate format */}
      {value.showCoordinateDisplay && (
        <div className="mapui:flex mapui:flex-col mapui:gap-1">
          <h4 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:text-gray-700">
            Coordinate Format
          </h4>
          <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-gray-500">
            Default display format for the cursor coordinate readout.
          </p>
          <select
            value={value.coordinateFormat}
            onChange={(e) =>
              onChange({
                ...value,
                coordinateFormat: e.target.value as UIConfig['coordinateFormat'],
              })
            }
            className="mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:text-gray-800 focus:mapui:border-blue-500 focus:mapui:outline-none"
          >
            {COORDINATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {COORDINATE_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Legend order */}
      {value.showLegend && legendLayerOptions.length > 0 && (
        <div className="mapui:flex mapui:flex-col mapui:gap-1">
          <h4 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:text-gray-700">
            Legend Order
          </h4>
          <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-gray-500">
            Set the display order of layers in the legend. Only layers with a legend configured are shown.
          </p>
          <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1.5 mapui:p-0">
            {effectiveLegendOrder.map((layerId, index) => {
              const layer = legendLayerOptions.find((l) => l.id === layerId);
              if (!layer) return null;
              return (
                <li
                  key={layerId}
                  className="mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-2 mapui:py-1.5"
                >
                  <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleLegendMoveUp(index)}
                      disabled={index === 0}
                      aria-label="Move legend entry up"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLegendMoveDown(index)}
                      disabled={index === effectiveLegendOrder.length - 1}
                      aria-label="Move legend entry down"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="mapui:text-sm mapui:text-gray-800">{layer.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
