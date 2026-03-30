import { LuMousePointer2, LuSquareDashedMousePointer, LuPenTool, LuTrash2, LuList } from 'react-icons/lu';
import type { SelectionMode } from '../../utils/selection';
import type { LayerConfig } from '../../types';

export interface SelectionPanelProps {
  mode: SelectionMode | null;
  onModeChange: (mode: SelectionMode | null) => void;
  layers: LayerConfig[];
  activeLayerId: string | null;
  onActiveLayerChange: (layerId: string | null) => void;
  selectedCount: number;
  onClear: () => void;
  onViewResults: () => void;
  /** Optional slot for rendering a QueryPanel below the selection controls */
  queryPanel?: React.ReactNode;
  className?: string;
}

const modeButtons: { mode: SelectionMode; icon: typeof LuMousePointer2; label: string }[] = [
  { mode: 'click', icon: LuMousePointer2, label: 'Click' },
  { mode: 'box', icon: LuSquareDashedMousePointer, label: 'Box' },
  { mode: 'polygon', icon: LuPenTool, label: 'Polygon' },
];

function getInstructionText(mode: SelectionMode | null, activeLayerId: string | null, selectedCount: number): string {
  if (!activeLayerId) return 'Select a layer to begin';
  if (!mode) return 'Choose a selection mode';
  if (selectedCount === 0) {
    if (mode === 'click') return 'Click on features to select them';
    if (mode === 'box') return 'Click and drag to draw a selection box';
    if (mode === 'polygon') return 'Click to add points, double-click to finish';
    return 'Choose a selection mode';
  }
  return `${selectedCount} feature${selectedCount !== 1 ? 's' : ''} selected`;
}

export function SelectionPanel({
  mode,
  onModeChange,
  layers,
  activeLayerId,
  onActiveLayerChange,
  selectedCount,
  onClear,
  onViewResults,
  queryPanel,
  className,
}: SelectionPanelProps) {
  // Only show visible layers
  const selectableLayers = layers.filter((l) => l.visible);

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-3 ${className ?? ''}`}>
      {/* Layer selector */}
      <div className="mapui:flex mapui:flex-col mapui:gap-1">
        <label className="mapui:text-xs mapui:font-medium mapui:text-gray-600">Layer</label>
        <select
          value={activeLayerId ?? ''}
          onChange={(e) => onActiveLayerChange(e.target.value || null)}
          className="mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
        >
          <option value="">Select a layer…</option>
          {selectableLayers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      {activeLayerId && (
        <>
          <div className="mapui:flex mapui:gap-1">
            {modeButtons.map(({ mode: m, icon: Icon, label }) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(active ? null : m)}
                  aria-label={label}
                  aria-pressed={active}
                  className={[
                    'mapui:flex mapui:flex-1 mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:transition-colors',
                    active
                      ? 'mapui:bg-blue-600 mapui:text-white'
                      : 'mapui:bg-gray-100 mapui:text-gray-700 hover:mapui:bg-gray-200',
                  ].join(' ')}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status text */}
          <p className="mapui:m-0 mapui:text-center mapui:text-xs mapui:text-gray-500">
            {getInstructionText(mode, activeLayerId, selectedCount)}
          </p>

          {/* Action buttons */}
          {selectedCount > 0 && (
            <div className="mapui:flex mapui:gap-2">
              <button
                type="button"
                onClick={onViewResults}
                className="mapui:flex mapui:flex-1 mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
              >
                <LuList size={14} />
                View Results
              </button>
              <button
                type="button"
                onClick={onClear}
                className="mapui:flex mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-50"
              >
                <LuTrash2 size={14} />
                Clear
              </button>
            </div>
          )}

          {/* Query panel slot */}
          {queryPanel}
        </>
      )}
    </div>
  );
}
