import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LuX, LuDownload, LuTrash2, LuGripHorizontal } from 'react-icons/lu';

/** Format a property value for table display. */
function formatCellValue(value: unknown): string {
  if (value == null) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export interface ResultsDrawerTab {
  id: string;
  label: string;
  features: Array<{ properties: Record<string, unknown>; geometry?: Record<string, unknown> }>;
  columns?: string[];
  onClear?: () => void;
  onExport?: () => void;
}

export interface ResultsDrawerProps {
  open: boolean;
  onClose: () => void;
  onFeatureClick?: (index: number) => void;

  // Single-content mode (backward compatible)
  features?: Array<{
    properties: Record<string, unknown>;
    geometry?: Record<string, unknown>;
  }>;
  columns?: string[];
  title?: string;
  onExport?: () => void;
  onClearSelection?: () => void;

  // Multi-tab mode
  tabs?: ResultsDrawerTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}

const MIN_HEIGHT = 200;
const MAX_HEIGHT_RATIO = 0.6;
const DEFAULT_HEIGHT = 300;

export function ResultsDrawer({
  open,
  features: featuresProp,
  columns: columnsProp,
  title = 'Results',
  onClose,
  onExport: onExportProp,
  onFeatureClick,
  onClearSelection,
  tabs,
  activeTabId,
  onTabChange,
}: ResultsDrawerProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!open) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const delta = startY.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open]);

  // Resolve active content: tab mode or single-content mode
  // NOTE: All hooks (including useMemo) must be called before any early return
  // to satisfy React's rules of hooks.
  const isTabMode = tabs && tabs.length > 0;
  const activeTab = isTabMode ? tabs.find((t) => t.id === activeTabId) ?? tabs[0] : undefined;
  const features = isTabMode ? activeTab!.features : (featuresProp ?? []);
  const columns = isTabMode ? activeTab!.columns : columnsProp;
  const onExport = isTabMode ? activeTab!.onExport : onExportProp;
  const onClear = isTabMode ? activeTab!.onClear : onClearSelection;
  const displayTitle = isTabMode ? activeTab!.label : title;

  // Determine columns from the first feature if not specified
  const displayColumns = useMemo(
    () => columns ?? (features.length > 0
      ? Object.keys(features[0].properties).filter((k) => k !== 'geometry')
      : []),
    [columns, features],
  );

  if (!open) return null;

  return (
    <div
      className="mapui:absolute mapui:bottom-0 mapui:left-0 mapui:right-0 mapui:z-20 mapui:bg-white mapui:shadow-[0_-4px_12px_rgba(0,0,0,0.15)] mapui:flex mapui:flex-col"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        className="mapui:flex mapui:items-center mapui:justify-center mapui:h-3 mapui:cursor-ns-resize mapui:bg-gray-100 mapui:border-b mapui:border-gray-200 hover:mapui:bg-gray-200"
        onMouseDown={handleMouseDown}
      >
        <LuGripHorizontal size={14} className="mapui:text-gray-400" />
      </div>

      {/* Header */}
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:px-4 mapui:py-2 mapui:border-b mapui:border-gray-200 mapui:shrink-0">
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          {isTabMode && tabs.length > 1 ? (
            <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-xs">
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={[
                    'mapui:px-2.5 mapui:py-1 mapui:flex mapui:items-center mapui:gap-1.5',
                    i === 0 ? 'mapui:rounded-l-md' : '',
                    i === tabs.length - 1 ? 'mapui:rounded-r-md' : '',
                    (activeTab?.id ?? tabs[0].id) === tab.id
                      ? 'mapui:bg-blue-600 mapui:text-white'
                      : 'mapui:bg-white mapui:text-gray-600 hover:mapui:bg-gray-100',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className={[
                    'mapui:rounded-full mapui:px-1.5 mapui:py-0.5 mapui:text-xs mapui:font-medium',
                    (activeTab?.id ?? tabs[0].id) === tab.id
                      ? 'mapui:bg-blue-500 mapui:text-white'
                      : 'mapui:bg-gray-100 mapui:text-gray-600',
                  ].join(' ')}>
                    {tab.features.length}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <span className="mapui:text-sm mapui:font-semibold mapui:text-gray-800">{displayTitle}</span>
              <span className="mapui:rounded-full mapui:bg-blue-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-blue-700">
                {features.length}
              </span>
            </>
          )}
        </div>
        <div className="mapui:flex mapui:items-center mapui:gap-1">
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              title="Export"
              className="mapui:flex mapui:items-center mapui:justify-center mapui:w-7 mapui:h-7 mapui:rounded hover:mapui:bg-gray-100 mapui:text-gray-500"
            >
              <LuDownload size={16} />
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              title="Clear"
              className="mapui:flex mapui:items-center mapui:justify-center mapui:w-7 mapui:h-7 mapui:rounded hover:mapui:bg-gray-100 mapui:text-gray-500"
            >
              <LuTrash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="mapui:flex mapui:items-center mapui:justify-center mapui:w-7 mapui:h-7 mapui:rounded hover:mapui:bg-gray-100 mapui:text-gray-500"
          >
            <LuX size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mapui:overflow-auto mapui:flex-1">
        {features.length === 0 ? (
          <div className="mapui:flex mapui:items-center mapui:justify-center mapui:h-full mapui:text-sm mapui:text-gray-400">
            No features to display
          </div>
        ) : (
          <table className="mapui:w-full mapui:text-xs mapui:border-collapse">
            <thead>
              <tr className="mapui:bg-gray-50 mapui:sticky mapui:top-0">
                <th className="mapui:px-3 mapui:py-2 mapui:text-left mapui:font-medium mapui:text-gray-600 mapui:border-b mapui:border-gray-200">#</th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    className="mapui:px-3 mapui:py-2 mapui:text-left mapui:font-medium mapui:text-gray-600 mapui:border-b mapui:border-gray-200 mapui:whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr
                  key={i}
                  onClick={() => onFeatureClick?.(i)}
                  className={[
                    onFeatureClick ? 'mapui:cursor-pointer' : '',
                    i % 2 === 0 ? 'mapui:bg-white' : 'mapui:bg-gray-50',
                    'hover:mapui:bg-blue-50',
                  ].join(' ')}
                >
                  <td className="mapui:px-3 mapui:py-1.5 mapui:text-gray-400 mapui:border-b mapui:border-gray-100">
                    {i + 1}
                  </td>
                  {displayColumns.map((col) => (
                    <td
                      key={col}
                      className="mapui:px-3 mapui:py-1.5 mapui:text-gray-700 mapui:border-b mapui:border-gray-100 mapui:whitespace-nowrap"
                    >
                      {formatCellValue(feature.properties[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
