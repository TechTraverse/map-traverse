import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { GlobalSearchConfig, LayerConfig } from '../../types';

export type FeatureMatch = {
  id: string | number;
  label: string;
  matchedProperty: string;
  geometry?: GeoJSON.Geometry;
  bbox?: [number, number, number, number];
  properties?: Record<string, unknown>;
};

export type GroupedResults = Record<
  string,
  { layer: LayerConfig; matches: FeatureMatch[] }
>;

export interface GlobalSearchBarProps {
  config: GlobalSearchConfig;
  layers: LayerConfig[];
  value: string;
  onChange: (q: string) => void;
  results: GroupedResults;
  onResultClick: (layerId: string, match: FeatureMatch) => void;
  isLoading?: boolean;
  className?: string;
}

interface FlatRow {
  layerId: string;
  match: FeatureMatch;
  rowId: string;
}

export function GlobalSearchBar({
  config,
  value,
  onChange,
  results,
  onResultClick,
  isLoading = false,
  className = '',
}: GlobalSearchBarProps) {
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const minQueryLength = config.minQueryLength ?? 2;
  const placeholder = config.placeholder ?? 'Search…';

  // Build a stable, ordered list of layer groups (preserve insertion order of `results`).
  const groups = useMemo(() => {
    return Object.entries(results)
      .map(([layerId, group]) => ({ layerId, ...group }))
      .filter((g) => g.matches.length > 0);
  }, [results]);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const group of groups) {
      for (const match of group.matches) {
        rows.push({
          layerId: group.layerId,
          match,
          rowId: `${reactId}-row-${group.layerId}-${String(match.id)}`,
        });
      }
    }
    return rows;
  }, [groups, reactId]);

  const totalResults = flatRows.length;
  const queryMeetsMin = value.length >= minQueryLength;
  const shouldOpen = isFocused && (queryMeetsMin || totalResults > 0);

  // Reset / clamp active index when results change.
  useEffect(() => {
    if (!shouldOpen || totalResults === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0) return -1;
      if (prev >= totalResults) return totalResults - 1;
      return prev;
    });
  }, [shouldOpen, totalResults]);

  // Click-outside dismiss.
  useEffect(() => {
    if (!shouldOpen) return;
    const handler = (e: MouseEvent) => {
      const node = containerRef.current;
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shouldOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFocused(false);
        setActiveIndex(-1);
        return;
      }
      if (!shouldOpen || totalResults === 0) {
        // Allow ArrowDown to "open" once results land — but if no rows, do nothing.
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalResults);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? totalResults - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < totalResults) {
          e.preventDefault();
          const row = flatRows[activeIndex];
          onResultClick(row.layerId, row.match);
          setIsFocused(false);
          setActiveIndex(-1);
        }
      }
    },
    [shouldOpen, totalResults, activeIndex, flatRows, onResultClick],
  );

  const handleRowClick = useCallback(
    (layerId: string, match: FeatureMatch) => {
      onResultClick(layerId, match);
      setIsFocused(false);
      setActiveIndex(-1);
    },
    [onResultClick],
  );

  const showEmptyState =
    shouldOpen && queryMeetsMin && !isLoading && totalResults === 0;
  const showLoadingState = shouldOpen && isLoading;
  const activeRowId =
    activeIndex >= 0 && activeIndex < totalResults ? flatRows[activeIndex].rowId : undefined;

  return (
    <div
      ref={containerRef}
      className={`mapui:relative mapui:w-full ${className}`.trim()}
      data-testid="global-search-bar"
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={shouldOpen}
        aria-controls={`${reactId}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={activeRowId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
      />

      {shouldOpen && (
        <div
          id={`${reactId}-listbox`}
          role="listbox"
          className="mapui:absolute mapui:left-0 mapui:right-0 mapui:top-full mapui:z-50 mapui:mt-1 mapui:max-h-96 mapui:overflow-auto mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-lg"
        >
          {showLoadingState && (
            <div
              className="mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-slate-500"
              data-testid="global-search-loading"
            >
              <span
                aria-hidden="true"
                className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:animate-spin mapui:rounded-full mapui:border-2 mapui:border-slate-300 mapui:border-t-blue-500"
              />
              <span>Searching…</span>
            </div>
          )}

          {showEmptyState && (
            <div
              className="mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-slate-500"
              data-testid="global-search-empty"
            >
              No results
            </div>
          )}

          {!showLoadingState && totalResults > 0 && (
            <ul className="mapui:m-0 mapui:list-none mapui:p-0">
              {(() => {
                let runningIndex = 0;
                return groups.map((group) => (
                <li key={group.layerId} className="mapui:border-b mapui:border-slate-100 last:mapui:border-0">
                  <div
                    className="mapui:bg-slate-50 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-semibold mapui:text-slate-600"
                    data-testid={`global-search-group-${group.layerId}`}
                  >
                    {group.layer.label}
                  </div>
                  <ul className="mapui:m-0 mapui:list-none mapui:p-0">
                    {group.matches.map((match) => {
                      const rowId = `${reactId}-row-${group.layerId}-${String(match.id)}`;
                      const flatIdx = runningIndex++;
                      const isActive = flatIdx === activeIndex;
                      return (
                        <li
                          key={String(match.id)}
                          id={rowId}
                          role="option"
                          aria-selected={isActive}
                          data-testid={`global-search-result-${group.layerId}-${String(match.id)}`}
                          onMouseDown={(e) => {
                            // Prevent input blur before click handler runs.
                            e.preventDefault();
                          }}
                          onClick={() => handleRowClick(group.layerId, match)}
                          className={`mapui:flex mapui:cursor-pointer mapui:flex-col mapui:gap-0.5 mapui:px-3 mapui:py-2 mapui:text-sm hover:mapui:bg-blue-50 ${
                            isActive ? 'mapui:bg-blue-50' : ''
                          }`}
                        >
                          <span className="mapui:text-slate-900">{match.label}</span>
                          <span className="mapui:text-xs mapui:text-slate-400">
                            matched: {match.matchedProperty}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
                ));
              })()}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
