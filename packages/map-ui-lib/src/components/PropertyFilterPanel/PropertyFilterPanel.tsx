import type { LayerConfig, AvailableProperty } from '../../types';
import type { PropertyFilter } from '../../utils/propertyFilters';
import { generateId } from '../../utils/id';

export interface PropertyFilterPanelProps {
  layers: LayerConfig[];
  availableProperties?: Record<string, AvailableProperty[]>;
  filters: PropertyFilter[];
  onFiltersChange: (filters: PropertyFilter[]) => void;
  /** Soft cap per layer. Defaults to 20. */
  maxFiltersPerLayer?: number;
}

function createEmptyFilter(layerId: string): PropertyFilter {
  return {
    id: generateId(),
    layerId,
    property: '',
    value: '',
  };
}

/**
 * Flat layer → property → value filter panel. Implicit equality, no
 * operator picker, no parameterizable values. Replaces the CQL2-flavored
 * {@link AllFiltersBuilder} for end-user search flows — the CQL2 builder
 * stays around for power-user / admin surfaces.
 *
 * Fully controlled. Compile to CQL2 at the call site via
 * `propertyFiltersToCql2` from `utils/propertyFilters`.
 */
export function PropertyFilterPanel({
  layers,
  availableProperties,
  filters,
  onFiltersChange,
  maxFiltersPerLayer = 20,
}: PropertyFilterPanelProps) {
  if (layers.length === 0) {
    return (
      <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
        No layers available.
      </p>
    );
  }

  const updateFilter = (id: string, patch: Partial<PropertyFilter>) => {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const addFilter = (layerId: string) => {
    onFiltersChange([...filters, createEmptyFilter(layerId)]);
  };

  const clearLayer = (layerId: string) => {
    onFiltersChange(filters.filter((f) => f.layerId !== layerId));
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      <div>
        <h4 className="mapui:m-0 mapui:mb-1 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          All Filters
        </h4>
        <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
          Pick a layer property and type a value. Combined with search filters via AND.
        </p>
      </div>

      {layers.map((layer) => {
        const layerFilters = filters.filter((f) => f.layerId === layer.id);
        const layerProps = availableProperties?.[layer.id] ?? [];
        const capReached = layerFilters.length >= maxFiltersPerLayer;

        return (
          <div
            key={layer.id}
            className="mapui:flex mapui:flex-col mapui:gap-2 mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-gray-50 mapui:p-3"
          >
            <div className="mapui:flex mapui:items-center mapui:justify-between">
              <span className="mapui:text-sm mapui:font-medium mapui:text-gray-700">
                {layer.label}
              </span>
              {layerFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearLayer(layer.id)}
                  className="mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:p-0 mapui:text-xs mapui:text-blue-600 hover:mapui:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>

            {layerFilters.length === 0 ? (
              <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
                No filters added for this layer.
              </p>
            ) : (
              <div className="mapui:flex mapui:flex-col mapui:gap-2">
                {layerFilters.map((filter) => {
                  const propertyFieldId = `propfilter-${filter.id}-property`;
                  const valueFieldId = `propfilter-${filter.id}-value`;
                  return (
                    <div
                      key={filter.id}
                      className="mapui:flex mapui:items-center mapui:gap-2"
                    >
                      <select
                        id={propertyFieldId}
                        aria-label="Property"
                        value={filter.property}
                        onChange={(e) =>
                          updateFilter(filter.id, { property: e.target.value })
                        }
                        className="mapui:flex-1 mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                      >
                        <option value="">
                          {layerProps.length === 0 ? 'No properties available' : 'Select property...'}
                        </option>
                        {layerProps.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.title ?? p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        id={valueFieldId}
                        aria-label="Value"
                        type="text"
                        value={filter.value}
                        placeholder="Value"
                        onChange={(e) =>
                          updateFilter(filter.id, { value: e.target.value })
                        }
                        className="mapui:flex-1 mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeFilter(filter.id)}
                        aria-label="Remove filter"
                        title="Remove filter"
                        className="mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-sm mapui:text-gray-500 hover:mapui:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {capReached ? (
              <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
                Up to {maxFiltersPerLayer} filters per layer.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => addFilter(layer.id)}
                className="mapui:cursor-pointer mapui:self-start mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
              >
                + Add filter
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
