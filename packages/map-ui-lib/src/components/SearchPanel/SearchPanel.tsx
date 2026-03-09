import { useEffect, useMemo } from 'react';
import type { LayerConfig, SearchFilterValues, SearchFilterValue, SearchField, NumberSearchField, DatetimeSearchField, TextSearchField, SelectSearchField } from '../../types';
import { AutocompleteInput } from './AutocompleteInput';
import { DateRangeInput } from './DateRangeInput';
import { NumberInput } from './NumberInput';

export interface SearchPanelProps {
  layers: LayerConfig[];
  activeFilters: Record<string, SearchFilterValues>;
  onFilterChange: (layerId: string, property: string, value: SearchFilterValue) => void;
  onClearFilters: (layerId: string) => void;
  autocompleteSuggestions?: Record<string, string[]>;
  onFetchSuggestions?: (layerId: string, property: string, query: string, options?: { prefetch?: boolean }) => void;
  onZoomToFeature?: (layerId: string, property: string, value: string) => void;
  className?: string;
  hideTitle?: boolean;
}

function isFilterActive(value: SearchFilterValue): boolean {
  if (value === undefined || value === '' || value === null) return false;
  if (typeof value === 'object') {
    if ('start' in value && 'end' in value) {
      return (value as { start: string; end: string }).start !== '' ||
        (value as { start: string; end: string }).end !== '';
    }
    return true;
  }
  return true;
}

export function SearchPanel({
  layers,
  activeFilters,
  onFilterChange,
  onClearFilters,
  autocompleteSuggestions = {},
  onZoomToFeature,
  onFetchSuggestions,
  className = '',
  hideTitle,
}: SearchPanelProps) {
  const searchableLayers = useMemo(
    () => layers.filter((layer) => layer.search?.fields.length),
    [layers]
  );

  useEffect(() => {
    if (!onFetchSuggestions) return;
    for (const layer of searchableLayers) {
      for (const field of layer.search!.fields) {
        if (field.type === 'select' && (field as SelectSearchField).prefetch) {
          onFetchSuggestions(layer.id, field.property, '', { prefetch: true });
        }
      }
    }
  }, [searchableLayers, onFetchSuggestions]);

  if (searchableLayers.length === 0) {
    return (
      <div className={`mapui:flex mapui:flex-col mapui:gap-1 ${className}`.trim()}>
        {!hideTitle && (
          <h3 className="mapui:m-0 mapui:mb-2 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
            Search &amp; Filter
          </h3>
        )}
        <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
          No searchable layers configured.
        </p>
      </div>
    );
  }

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-3 ${className}`.trim()}>
      {!hideTitle && (
        <h3 className="mapui:m-0 mapui:mb-2 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          Search &amp; Filter
        </h3>
      )}

      {searchableLayers.map((layer) => {
        const layerFilters = activeFilters[layer.id] ?? {};
        const hasActiveFilters = Object.values(layerFilters).some(isFilterActive);

        return (
          <div key={layer.id} className="mapui:flex mapui:flex-col mapui:gap-3 mapui:border-b mapui:border-gray-100 mapui:pb-3 last:mapui:border-0">
            <div className="mapui:flex mapui:items-center mapui:justify-between">
              <span className="mapui:text-sm mapui:font-medium mapui:text-gray-600">
                {layer.label}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => onClearFilters(layer.id)}
                  className="mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:p-0 mapui:text-xs mapui:text-blue-600 hover:mapui:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>
            {layer.search!.fields.map((field: SearchField) => {
              const value = layerFilters[field.property];
              const suggestionKey = `${layer.id}:${field.property}`;
              const fieldId = `search-${layer.id}-${field.property}`;

              return (
                <div key={field.property} className="mapui:flex mapui:flex-col mapui:gap-1">
                  <label htmlFor={fieldId} className="mapui:text-xs mapui:text-gray-500">{field.label}</label>

                  {field.type === 'text' && (field as TextSearchField).autocomplete ? (
                    <AutocompleteInput
                      id={fieldId}
                      value={(value as string) ?? ''}
                      onChange={(v) => {
                        onFilterChange(layer.id, field.property, v || undefined);
                        if (v && (field as TextSearchField).zoomTo) {
                          onZoomToFeature?.(layer.id, field.property, v);
                        }
                      }}
                      suggestions={[...new Set([
                        ...(autocompleteSuggestions[suggestionKey] ?? []),
                        ...((field as TextSearchField).options ?? []),
                      ])]}
                      onQueryChange={(q) => onFetchSuggestions?.(layer.id, field.property, q, { prefetch: (field as TextSearchField).prefetch })}
                      placeholder={(field as TextSearchField).placeholder ?? ''}
                    />
                  ) : field.type === 'text' ? (
                    <input
                      id={fieldId}
                      type="text"
                      value={(value as string) ?? ''}
                      placeholder={(field as TextSearchField).placeholder ?? ''}
                      onChange={(e) =>
                        onFilterChange(layer.id, field.property, e.target.value || undefined)
                      }
                      onBlur={(e) => {
                        if (e.target.value && (field as TextSearchField).zoomTo) {
                          onZoomToFeature?.(layer.id, field.property, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value && (field as TextSearchField).zoomTo) {
                          onZoomToFeature?.(layer.id, field.property, (e.target as HTMLInputElement).value);
                        }
                      }}
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    />
                  ) : field.type === 'datetime' && (field as DatetimeSearchField).range ? (
                    <DateRangeInput
                      id={fieldId}
                      startValue={
                        value && typeof value === 'object' && 'start' in value
                          ? (value as { start: string; end: string }).start
                          : ''
                      }
                      endValue={
                        value && typeof value === 'object' && 'end' in value
                          ? (value as { start: string; end: string }).end
                          : ''
                      }
                      onStartChange={(start) =>
                        onFilterChange(layer.id, field.property, {
                          start,
                          end:
                            value && typeof value === 'object' && 'end' in value
                              ? (value as { start: string; end: string }).end
                              : '',
                        })
                      }
                      onEndChange={(end) =>
                        onFilterChange(layer.id, field.property, {
                          start:
                            value && typeof value === 'object' && 'start' in value
                              ? (value as { start: string; end: string }).start
                              : '',
                          end,
                        })
                      }
                    />
                  ) : field.type === 'datetime' ? (
                    <input
                      id={fieldId}
                      type="datetime-local"
                      value={(value as string) ?? ''}
                      onChange={(e) =>
                        onFilterChange(layer.id, field.property, e.target.value || undefined)
                      }
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    />
                  ) : field.type === 'number' ? (
                    <NumberInput
                      id={fieldId}
                      field={field as NumberSearchField}
                      value={value}
                      onChange={(v) => onFilterChange(layer.id, field.property, v)}
                    />
                  ) : field.type === 'select' ? (() => {
                    const selectField = field as SelectSearchField;
                    const dynamicOptions = autocompleteSuggestions[suggestionKey] ?? [];
                    const staticOptions = selectField.options ?? [];
                    const allOptions = [...new Set([...dynamicOptions, ...staticOptions])];
                    return (
                      <select
                        id={fieldId}
                        value={(value as string) ?? ''}
                        onChange={(e) =>
                          onFilterChange(layer.id, field.property, e.target.value || undefined)
                        }
                        className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                      >
                        <option value="">{field.placeholder ?? 'Select...'}</option>
                        {allOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    );
                  })() : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
