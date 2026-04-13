import type { LayerConfig, AvailableProperty } from '../../types';
import type { PropertyFilter, PropertyFilterValue } from '../../utils/propertyFilters';
import { generateId } from '../../utils/id';

export interface PropertyFilterPanelProps {
  layers: LayerConfig[];
  availableProperties?: Record<string, AvailableProperty[]>;
  filters: PropertyFilter[];
  onFiltersChange: (filters: PropertyFilter[]) => void;
  /** Soft cap per layer. Defaults to 20. */
  maxFiltersPerLayer?: number;
}

const OGC_NUMBER_TYPES = new Set(['number', 'integer']);
const OGC_DATE_TYPES = new Set(['string']); // datetime is type=string + format=date-time
const DATE_FORMATS = new Set(['date-time', 'date']);

function resolvePropertyType(prop: AvailableProperty | undefined): 'string' | 'number' | 'datetime' {
  if (!prop?.type) return 'string';
  if (OGC_NUMBER_TYPES.has(prop.type)) return 'number';
  if (OGC_DATE_TYPES.has(prop.type) && prop.format && DATE_FORMATS.has(prop.format)) return 'datetime';
  return 'string';
}

function defaultValueForType(propertyType: 'string' | 'number' | 'datetime'): PropertyFilterValue {
  switch (propertyType) {
    case 'number': return { value: 0, operator: 'eq' };
    case 'datetime': return { start: '', end: '' };
    default: return '';
  }
}

function createEmptyFilter(layerId: string): PropertyFilter {
  return {
    id: generateId(),
    layerId,
    property: '',
    propertyType: 'string',
    value: '',
  };
}

const selectClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';
const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'between', label: 'between' },
] as const;

function StringValueInput({
  filter,
  onUpdate,
}: {
  filter: PropertyFilter;
  onUpdate: (id: string, patch: Partial<PropertyFilter>) => void;
}) {
  const val = typeof filter.value === 'string' ? filter.value : '';
  return (
    <input
      aria-label="Value"
      type="text"
      value={val}
      placeholder="Value"
      onChange={(e) => onUpdate(filter.id, { value: e.target.value })}
      className={`mapui:flex-1 ${inputClass}`}
    />
  );
}

function NumberValueInput({
  filter,
  onUpdate,
}: {
  filter: PropertyFilter;
  onUpdate: (id: string, patch: Partial<PropertyFilter>) => void;
}) {
  const v = filter.value;
  const isBetween = typeof v === 'object' && 'min' in v;
  const operator = isBetween ? 'between' : (typeof v === 'object' && 'operator' in v ? v.operator : 'eq');
  const singleValue = typeof v === 'object' && 'value' in v ? String(v.value) : '';
  const minValue = typeof v === 'object' && 'min' in v ? String((v as { min: number; max: number }).min) : '';
  const maxValue = typeof v === 'object' && 'max' in v ? String((v as { min: number; max: number }).max) : '';

  const handleOperatorChange = (newOp: string) => {
    if (newOp === 'between') {
      onUpdate(filter.id, { value: { min: 0, max: 0 } });
    } else if (isBetween) {
      onUpdate(filter.id, { value: { value: 0, operator: newOp } });
    } else {
      const currentNum = typeof v === 'object' && 'value' in v ? (v as { value: number }).value : 0;
      onUpdate(filter.id, { value: { value: currentNum, operator: newOp } });
    }
  };

  return (
    <div className="mapui:flex mapui:flex-1 mapui:items-center mapui:gap-1">
      <select
        aria-label="Operator"
        value={operator}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className={selectClass}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      {isBetween ? (
        <div className="mapui:flex mapui:flex-1 mapui:gap-1">
          <input
            aria-label="Minimum"
            type="number"
            value={minValue}
            placeholder="Min"
            onChange={(e) => {
              const existing = typeof v === 'object' && 'max' in v ? (v as { min: number; max: number }).max : 0;
              onUpdate(filter.id, { value: { min: e.target.value === '' ? 0 : Number(e.target.value), max: existing } });
            }}
            className={`mapui:flex-1 mapui:min-w-0 ${inputClass}`}
          />
          <input
            aria-label="Maximum"
            type="number"
            value={maxValue}
            placeholder="Max"
            onChange={(e) => {
              const existing = typeof v === 'object' && 'min' in v ? (v as { min: number; max: number }).min : 0;
              onUpdate(filter.id, { value: { min: existing, max: e.target.value === '' ? 0 : Number(e.target.value) } });
            }}
            className={`mapui:flex-1 mapui:min-w-0 ${inputClass}`}
          />
        </div>
      ) : (
        <input
          aria-label="Value"
          type="number"
          value={singleValue}
          placeholder="Value"
          onChange={(e) => {
            if (e.target.value === '') {
              onUpdate(filter.id, { value: { value: 0, operator } });
            } else {
              onUpdate(filter.id, { value: { value: Number(e.target.value), operator } });
            }
          }}
          className={`mapui:flex-1 mapui:min-w-0 ${inputClass}`}
        />
      )}
    </div>
  );
}

function DatetimeValueInput({
  filter,
  onUpdate,
}: {
  filter: PropertyFilter;
  onUpdate: (id: string, patch: Partial<PropertyFilter>) => void;
}) {
  const v = filter.value;
  const startValue = typeof v === 'object' && 'start' in v ? (v as { start: string; end: string }).start : '';
  const endValue = typeof v === 'object' && 'end' in v ? (v as { start: string; end: string }).end : '';

  return (
    <div className="mapui:flex mapui:flex-1 mapui:flex-col mapui:gap-1">
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <span className="mapui:text-xs mapui:text-gray-400 mapui:w-8 mapui:shrink-0">From</span>
        <input
          aria-label="Start date"
          type="datetime-local"
          value={startValue}
          onChange={(e) =>
            onUpdate(filter.id, { value: { start: e.target.value, end: endValue } })
          }
          className={`mapui:flex-1 mapui:min-w-0 ${inputClass}`}
        />
      </div>
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <span className="mapui:text-xs mapui:text-gray-400 mapui:w-8 mapui:shrink-0">To</span>
        <input
          aria-label="End date"
          type="datetime-local"
          value={endValue}
          onChange={(e) =>
            onUpdate(filter.id, { value: { start: startValue, end: e.target.value } })
          }
          className={`mapui:flex-1 mapui:min-w-0 ${inputClass}`}
        />
      </div>
    </div>
  );
}

/**
 * Type-aware property filter panel. Renders text inputs for strings,
 * operator + number inputs for numeric properties, and date range inputs
 * for datetime properties. Property types are inferred from the OGC API
 * queryables metadata passed via `availableProperties`.
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

  const handlePropertyChange = (filter: PropertyFilter, newProperty: string, layerProps: AvailableProperty[]) => {
    const prop = layerProps.find((p) => p.name === newProperty);
    const newType = resolvePropertyType(prop);
    const typeChanged = newType !== filter.propertyType;
    onFiltersChange(
      filters.map((f) =>
        f.id === filter.id
          ? {
              ...f,
              property: newProperty,
              propertyType: newType,
              value: typeChanged ? defaultValueForType(newType) : f.value,
            }
          : f,
      ),
    );
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      <div>
        <h4 className="mapui:m-0 mapui:mb-1 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          All Filters
        </h4>
        <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
          Pick a layer property and enter a value. Combined with search filters via AND.
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
                  return (
                    <div
                      key={filter.id}
                      className="mapui:flex mapui:items-start mapui:gap-2"
                    >
                      <select
                        id={propertyFieldId}
                        aria-label="Property"
                        value={filter.property}
                        onChange={(e) => handlePropertyChange(filter, e.target.value, layerProps)}
                        className={`mapui:flex-1 ${selectClass}`}
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

                      {filter.propertyType === 'number' ? (
                        <NumberValueInput filter={filter} onUpdate={updateFilter} />
                      ) : filter.propertyType === 'datetime' ? (
                        <DatetimeValueInput filter={filter} onUpdate={updateFilter} />
                      ) : (
                        <StringValueInput filter={filter} onUpdate={updateFilter} />
                      )}

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
