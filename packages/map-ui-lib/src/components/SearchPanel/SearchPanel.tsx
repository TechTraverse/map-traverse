import { useCallback, useMemo } from 'react';
import type { LayerConfig, SearchFilterValues, SearchField } from '../../types';

export interface SearchPanelProps {
  layers: LayerConfig[];
  activeFilters: Record<string, SearchFilterValues>;
  onFilterChange: (layerId: string, property: string, value: string | number | undefined) => void;
  onClearFilters: (layerId: string) => void;
  className?: string;
  hideTitle?: boolean;
}

export function SearchPanel({
  layers,
  activeFilters,
  onFilterChange,
  onClearFilters,
  className = '',
  hideTitle,
}: SearchPanelProps) {
  const searchableLayers = useMemo(
    () => layers.filter((layer) => layer.search?.fields.length),
    [layers]
  );

  const handleTextChange = useCallback(
    (layerId: string, property: string, value: string) => {
      onFilterChange(layerId, property, value || undefined);
    },
    [onFilterChange],
  );

  const handleNumberChange = useCallback(
    (layerId: string, property: string, value: string) => {
      onFilterChange(layerId, property, value === '' ? undefined : Number(value));
    },
    [onFilterChange],
  );

  const handleSelectChange = useCallback(
    (layerId: string, property: string, value: string) => {
      onFilterChange(layerId, property, value || undefined);
    },
    [onFilterChange],
  );

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
        const hasActiveFilters = Object.values(layerFilters).some((v) => v !== undefined);

        return (
          <div key={layer.id} className="mapui:flex mapui:flex-col mapui:gap-2 mapui:border-b mapui:border-gray-100 mapui:pb-2 last:mapui:border-0">
            <div className="mapui:flex mapui:items-center mapui:justify-between">
              <span className="mapui:text-xs mapui:font-medium mapui:text-gray-600">
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

              const options = field.options;

              return (
                <div key={field.property} className="mapui:flex mapui:flex-col mapui:gap-0.5">
                  <label className="mapui:text-xs mapui:text-gray-500">{field.label}</label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={(value as string) ?? ''}
                      placeholder={field.placeholder ?? ''}
                      onChange={(e) => handleTextChange(layer.id, field.property, e.target.value)}
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={value ?? ''}
                      placeholder={field.placeholder ?? ''}
                      onChange={(e) => handleNumberChange(layer.id, field.property, e.target.value)}
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    />
                  )}

                  {field.type === 'datetime' && (
                    <input
                      type="datetime-local"
                      value={(value as string) ?? ''}
                      onChange={(e) => handleTextChange(layer.id, field.property, e.target.value)}
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={(value as string) ?? ''}
                      onChange={(e) => handleSelectChange(layer.id, field.property, e.target.value)}
                      className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                    >
                      <option value="">{field.placeholder ?? 'Select...'}</option>
                      {options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
