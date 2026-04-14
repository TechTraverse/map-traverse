import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  LuX,
  LuDownload,
  LuTrash2,
  LuGripHorizontal,
  LuColumns3,
  LuArrowUp,
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
} from 'react-icons/lu';
import { formatCellValue, compareValues, applyColumnOrder } from './tableUtils';

export type SortDirection = 'asc' | 'desc';

export interface ResultsDrawerSort {
  property: string;
  direction: SortDirection;
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

  // Controlled column ordering (optional — falls back to internal state).
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;

  // Controlled column visibility (optional — falls back to internal state).
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (hidden: string[]) => void;

  // Controlled sort (optional — falls back to internal state; sorting is
  // applied locally when this is uncontrolled).
  sortBy?: ResultsDrawerSort | null;
  onSortChange?: (sort: ResultsDrawerSort | null) => void;
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
  columnOrder: columnOrderProp,
  onColumnOrderChange,
  hiddenColumns: hiddenColumnsProp,
  onHiddenColumnsChange,
  sortBy: sortByProp,
  onSortChange,
}: ResultsDrawerProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const [internalColumnOrder, setInternalColumnOrder] = useState<string[] | undefined>(undefined);
  const [internalHidden, setInternalHidden] = useState<string[]>([]);
  const [internalSort, setInternalSort] = useState<ResultsDrawerSort | null>(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const columnOrderControlled = columnOrderProp != null;
  const hiddenControlled = hiddenColumnsProp != null;
  const sortControlled = sortByProp !== undefined;

  const effectiveColumnOrder = columnOrderControlled ? columnOrderProp : internalColumnOrder;
  const hiddenColumns = hiddenControlled ? hiddenColumnsProp! : internalHidden;
  const sortBy = sortControlled ? sortByProp ?? null : internalSort;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
    },
    [height],
  );

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

  // Base columns before reorder/hide: use explicit `columns` prop, then fall
  // back to the property keys from the first feature.
  const baseColumns = useMemo(
    () =>
      columns ??
      (features.length > 0
        ? Object.keys(features[0].properties).filter((k) => k !== 'geometry')
        : []),
    [columns, features],
  );

  // Reset per-tab/context UI state when the set of base columns changes.
  // We compare by identity of baseColumns (it's memoized above) and also reset
  // when the active tab changes.
  const activeContextKey = isTabMode ? activeTab?.id : '__single__';
  const previousContextKey = useRef<string | undefined>(activeContextKey);
  useEffect(() => {
    if (previousContextKey.current !== activeContextKey) {
      previousContextKey.current = activeContextKey;
      if (!columnOrderControlled) setInternalColumnOrder(undefined);
      if (!hiddenControlled) setInternalHidden([]);
      if (!sortControlled) setInternalSort(null);
    }
  }, [activeContextKey, columnOrderControlled, hiddenControlled, sortControlled]);

  const orderedColumns = useMemo(
    () => applyColumnOrder(baseColumns, effectiveColumnOrder),
    [baseColumns, effectiveColumnOrder],
  );

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !hiddenColumns.includes(c)),
    [orderedColumns, hiddenColumns],
  );

  // Always sort features locally for display. Consumers may additionally
  // receive `onSortChange` to trigger server-side sorting (e.g. CQL2 sortby),
  // but the local sort ensures the visible rows reflect the active sort even
  // when the underlying data source hasn't re-fetched.
  const displayedFeatures = useMemo(() => {
    if (!sortBy) return features;
    const { property, direction } = sortBy;
    const sorted = [...features].sort((a, b) =>
      compareValues(a.properties[property], b.properties[property]),
    );
    if (direction === 'desc') sorted.reverse();
    return sorted;
  }, [features, sortBy]);

  const updateColumnOrder = (next: string[]) => {
    if (columnOrderControlled) {
      onColumnOrderChange?.(next);
    } else {
      setInternalColumnOrder(next);
      onColumnOrderChange?.(next);
    }
  };

  const updateHidden = (next: string[]) => {
    if (hiddenControlled) {
      onHiddenColumnsChange?.(next);
    } else {
      setInternalHidden(next);
      onHiddenColumnsChange?.(next);
    }
  };

  const updateSort = (next: ResultsDrawerSort | null) => {
    if (sortControlled) {
      onSortChange?.(next);
    } else {
      setInternalSort(next);
      onSortChange?.(next);
    }
  };

  const toggleColumnHidden = (col: string) => {
    const next = hiddenColumns.includes(col)
      ? hiddenColumns.filter((c) => c !== col)
      : [...hiddenColumns, col];
    updateHidden(next);
  };

  const moveColumn = (col: string, direction: -1 | 1) => {
    const current = orderedColumns;
    const idx = current.indexOf(col);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[idx], next[target]] = [next[target], next[idx]];
    updateColumnOrder(next);
  };

  const cycleSort = (col: string) => {
    if (!sortBy || sortBy.property !== col) {
      updateSort({ property: col, direction: 'asc' });
    } else if (sortBy.direction === 'asc') {
      updateSort({ property: col, direction: 'desc' });
    } else {
      updateSort(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="mapui:absolute mapui:bottom-0 mapui:left-0 mapui:right-0 mapui:z-20 mapui:bg-white mapui:shadow-[0_-4px_12px_rgba(0,0,0,0.15)] mapui:flex mapui:flex-col"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        className="mapui:flex mapui:items-center mapui:justify-center mapui:h-5 mapui:cursor-ns-resize mapui:bg-slate-100 mapui:border-b mapui:border-slate-200 hover:mapui:bg-slate-200"
        onMouseDown={handleMouseDown}
      >
        <LuGripHorizontal size={14} className="mapui:text-slate-400" />
      </div>

      {/* Header */}
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:px-4 mapui:py-2 mapui:border-b mapui:border-slate-200 mapui:shrink-0">
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          {isTabMode && tabs.length > 1 ? (
            <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-slate-300 mapui:text-xs">
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
                      : 'mapui:bg-white mapui:text-slate-600 hover:mapui:bg-slate-100',
                  ].join(' ')}
                >
                  {tab.label}
                  <span
                    className={[
                      'mapui:rounded-full mapui:px-1.5 mapui:py-0.5 mapui:text-xs mapui:font-medium',
                      (activeTab?.id ?? tabs[0].id) === tab.id
                        ? 'mapui:bg-blue-500 mapui:text-white'
                        : 'mapui:bg-slate-100 mapui:text-slate-600',
                    ].join(' ')}
                  >
                    {tab.features.length}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <span className="mapui:text-sm mapui:font-semibold mapui:text-slate-800">{displayTitle}</span>
              <span className="mapui:rounded-full mapui:bg-blue-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-blue-700">
                {features.length}
              </span>
            </>
          )}
        </div>
        <div className="mapui:flex mapui:items-center mapui:gap-1">
          {baseColumns.length > 0 && (
            <div className="mapui:relative">
              <button
                type="button"
                onClick={() => setColumnMenuOpen((v) => !v)}
                title="Show/hide columns"
                aria-haspopup="true"
                aria-expanded={columnMenuOpen}
                className="mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[44px] mapui:min-h-[44px] mapui:w-8 mapui:h-8 mapui:rounded hover:mapui:bg-slate-100 mapui:text-slate-500"
              >
                <LuColumns3 size={16} />
              </button>
              {columnMenuOpen && (
                <div
                  role="menu"
                  className="mapui:absolute mapui:right-0 mapui:top-full mapui:mt-1 mapui:z-30 mapui:min-w-[180px] mapui:rounded-md mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-lg mapui:py-1"
                >
                  <div className="mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-semibold mapui:text-slate-500 mapui:uppercase mapui:tracking-wide">
                    Columns
                  </div>
                  {orderedColumns.map((col) => {
                    const checked = !hiddenColumns.includes(col);
                    return (
                      <label
                        key={col}
                        className="mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-1 mapui:cursor-pointer mapui:text-sm mapui:text-slate-700 hover:mapui:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleColumnHidden(col)}
                          className="mapui:accent-blue-600"
                        />
                        <span>{col}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              title="Export"
              className="mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[44px] mapui:min-h-[44px] mapui:w-8 mapui:h-8 mapui:rounded hover:mapui:bg-slate-100 mapui:text-slate-500"
            >
              <LuDownload size={16} />
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              title="Clear"
              className="mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[44px] mapui:min-h-[44px] mapui:w-8 mapui:h-8 mapui:rounded hover:mapui:bg-slate-100 mapui:text-slate-500"
            >
              <LuTrash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[44px] mapui:min-h-[44px] mapui:w-8 mapui:h-8 mapui:rounded hover:mapui:bg-slate-100 mapui:text-slate-500"
          >
            <LuX size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mapui:overflow-auto mapui:flex-1">
        {displayedFeatures.length === 0 ? (
          <div className="mapui:flex mapui:items-center mapui:justify-center mapui:h-full mapui:text-sm mapui:text-slate-400">
            No features to display
          </div>
        ) : (
          <table className="mapui:w-full mapui:text-xs mapui:border-collapse">
            <thead>
              <tr className="mapui:bg-slate-50 mapui:sticky mapui:top-0">
                <th className="mapui:px-3 mapui:py-2 mapui:text-left mapui:font-medium mapui:text-slate-600 mapui:border-b mapui:border-slate-200">
                  #
                </th>
                {visibleColumns.map((col) => {
                  const orderIdx = orderedColumns.indexOf(col);
                  const canMoveLeft = orderIdx > 0;
                  const canMoveRight = orderIdx < orderedColumns.length - 1;
                  const sortIcon =
                    sortBy?.property === col
                      ? sortBy.direction === 'asc'
                        ? <LuArrowUp size={11} />
                        : <LuArrowDown size={11} />
                      : null;
                  return (
                    <th
                      key={col}
                      scope="col"
                      aria-sort={
                        sortBy?.property === col
                          ? sortBy.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className="mapui:px-2 mapui:py-2 mapui:text-left mapui:font-medium mapui:text-slate-600 mapui:border-b mapui:border-slate-200 mapui:whitespace-nowrap"
                    >
                      <div className="mapui:flex mapui:items-center mapui:gap-1">
                        <button
                          type="button"
                          onClick={() => moveColumn(col, -1)}
                          disabled={!canMoveLeft}
                          title="Move column left"
                          className={[
                            'mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[28px] mapui:min-h-[28px] mapui:w-5 mapui:h-5 mapui:rounded',
                            canMoveLeft
                              ? 'mapui:text-slate-400 hover:mapui:text-slate-700 hover:mapui:bg-slate-200 mapui:cursor-pointer'
                              : 'mapui:text-slate-200 mapui:cursor-not-allowed',
                          ].join(' ')}
                        >
                          <LuArrowLeft size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => cycleSort(col)}
                          className="mapui:flex mapui:items-center mapui:gap-1 mapui:cursor-pointer mapui:select-none hover:mapui:text-slate-900"
                          title="Sort"
                        >
                          <span>{col}</span>
                          {sortIcon}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColumn(col, 1)}
                          disabled={!canMoveRight}
                          title="Move column right"
                          className={[
                            'mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[28px] mapui:min-h-[28px] mapui:w-5 mapui:h-5 mapui:rounded',
                            canMoveRight
                              ? 'mapui:text-slate-400 hover:mapui:text-slate-700 hover:mapui:bg-slate-200 mapui:cursor-pointer'
                              : 'mapui:text-slate-200 mapui:cursor-not-allowed',
                          ].join(' ')}
                        >
                          <LuArrowRight size={11} />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedFeatures.map((feature, i) => (
                <tr
                  key={i}
                  onClick={() => onFeatureClick?.(i)}
                  className={[
                    onFeatureClick ? 'mapui:cursor-pointer' : '',
                    i % 2 === 0 ? 'mapui:bg-white' : 'mapui:bg-slate-50',
                    'hover:mapui:bg-blue-50',
                  ].join(' ')}
                >
                  <td className="mapui:px-3 mapui:py-1.5 mapui:text-slate-400 mapui:border-b mapui:border-slate-100">
                    {i + 1}
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col}
                      className="mapui:px-3 mapui:py-1.5 mapui:text-slate-700 mapui:border-b mapui:border-slate-100 mapui:whitespace-nowrap"
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
