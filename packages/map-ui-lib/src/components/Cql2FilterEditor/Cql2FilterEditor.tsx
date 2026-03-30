import type { Cql2FilterConfig, AvailableProperty, SortField, SpatialConstraint } from '../../types';
import { FilterRuleGroupEditor } from './FilterRuleGroupEditor';
import { Cql2Preview } from './Cql2Preview';
import { inputClass } from './styles';

export interface Cql2FilterEditorProps {
  value: Cql2FilterConfig | undefined;
  onChange: (config: Cql2FilterConfig | undefined) => void;
  availableProperties?: AvailableProperty[];
  geometryProperties?: string[];
}

function createDefaultConfig(): Cql2FilterConfig {
  return {
    id: crypto.randomUUID(),
    combinator: 'and',
    rules: [
      {
        id: crypto.randomUUID(),
        property: '',
        operator: '=',
        value: { kind: 'static', value: '' },
      },
    ],
  };
}

export function Cql2FilterEditor({ value, onChange, availableProperties, geometryProperties }: Cql2FilterEditorProps) {
  if (!value) {
    return (
      <div className="mapui:flex mapui:flex-col mapui:items-start mapui:gap-2">
        <p className="mapui:text-sm mapui:text-gray-500">No CQL2 filter configured.</p>
        <button
          type="button"
          onClick={() => onChange(createDefaultConfig())}
          className="mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-white hover:mapui:bg-blue-700"
        >
          Add Filter
        </button>
      </div>
    );
  }

  const updateSort = (sortby: SortField[] | undefined) => {
    onChange({ ...value, sortby: sortby && sortby.length > 0 ? sortby : undefined });
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FilterRuleGroupEditor
        value={value}
        onChange={(updated) => onChange(updated)}
        availableProperties={availableProperties}
        depth={0}
      />

      {/* Query Options: Sort & Limit */}
      <div className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:p-3">
        <h4 className="mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-gray-500">Query Options</h4>

        {/* Sort By */}
        <div className="mapui:mb-2">
          <label className="mapui:mb-1 mapui:block mapui:text-xs mapui:text-gray-600">Sort by</label>
          <div className="mapui:flex mapui:flex-col mapui:gap-1">
            {(value.sortby ?? []).map((sort, i) => (
              <div key={i} className="mapui:flex mapui:items-center mapui:gap-1.5">
                {availableProperties && availableProperties.length > 0 ? (
                  <select
                    value={sort.property}
                    onChange={(e) => {
                      const updated = [...(value.sortby ?? [])];
                      updated[i] = { ...sort, property: e.target.value };
                      updateSort(updated);
                    }}
                    className={inputClass}
                  >
                    <option value="">Property...</option>
                    {availableProperties.map((p) => (
                      <option key={p.name} value={p.name}>{p.title ?? p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sort.property}
                    onChange={(e) => {
                      const updated = [...(value.sortby ?? [])];
                      updated[i] = { ...sort, property: e.target.value };
                      updateSort(updated);
                    }}
                    placeholder="property"
                    className={`${inputClass} mapui:w-32`}
                  />
                )}
                <select
                  value={sort.direction}
                  onChange={(e) => {
                    const updated = [...(value.sortby ?? [])];
                    updated[i] = { ...sort, direction: e.target.value as 'asc' | 'desc' };
                    updateSort(updated);
                  }}
                  className={inputClass}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <button
                  type="button"
                  onClick={() => updateSort((value.sortby ?? []).filter((_, j) => j !== i))}
                  className="mapui:rounded mapui:p-1 mapui:text-gray-400 hover:mapui:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mapui:h-3.5 mapui:w-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateSort([...(value.sortby ?? []), { property: '', direction: 'asc' }])}
              className="mapui:self-start mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
            >
              + Add Sort
            </button>
          </div>
        </div>

        {/* Limit */}
        <div className="mapui:mb-2">
          <label className="mapui:mb-1 mapui:block mapui:text-xs mapui:text-gray-600">Limit results</label>
          <input
            type="number"
            value={value.limit ?? ''}
            onChange={(e) => onChange({ ...value, limit: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="No limit"
            className={`${inputClass} mapui:w-28`}
            min={1}
          />
        </div>

        {/* Spatial Constraint */}
        <div>
          <label className="mapui:mb-1 mapui:block mapui:text-xs mapui:text-gray-600">
            Spatial constraint (selection geometry)
          </label>
          {!value.spatialConstraint ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  spatialConstraint: {
                    operator: 's_intersects',
                    geometryProperty: geometryProperties?.[0] ?? 'geom',
                  },
                })
              }
              className="mapui:self-start mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
            >
              + Add Spatial Constraint
            </button>
          ) : (
            <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
              <div className="mapui:flex mapui:items-center mapui:gap-1.5">
                <select
                  value={value.spatialConstraint.operator}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      spatialConstraint: {
                        ...value.spatialConstraint!,
                        operator: e.target.value as SpatialConstraint['operator'],
                      },
                    })
                  }
                  className={inputClass}
                >
                  <option value="s_intersects">Intersects</option>
                  <option value="s_within">Within</option>
                  <option value="s_dwithin">Within Distance</option>
                </select>
                {geometryProperties && geometryProperties.length > 0 ? (
                  <select
                    value={value.spatialConstraint.geometryProperty}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        spatialConstraint: {
                          ...value.spatialConstraint!,
                          geometryProperty: e.target.value,
                        },
                      })
                    }
                    className={inputClass}
                  >
                    {geometryProperties.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value.spatialConstraint.geometryProperty}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        spatialConstraint: {
                          ...value.spatialConstraint!,
                          geometryProperty: e.target.value,
                        },
                      })
                    }
                    placeholder="geom"
                    className={`${inputClass} mapui:w-28`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onChange({ ...value, spatialConstraint: undefined })}
                  className="mapui:rounded mapui:p-1 mapui:text-gray-400 hover:mapui:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mapui:h-3.5 mapui:w-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              {value.spatialConstraint.operator === 's_dwithin' && (
                <div className="mapui:flex mapui:items-center mapui:gap-1.5">
                  <input
                    type="number"
                    value={value.spatialConstraint.distance ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        spatialConstraint: {
                          ...value.spatialConstraint!,
                          distance: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="Distance"
                    className={`${inputClass} mapui:w-24`}
                    min={0}
                  />
                  <select
                    value={value.spatialConstraint.distanceUnits ?? 'meters'}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        spatialConstraint: {
                          ...value.spatialConstraint!,
                          distanceUnits: e.target.value,
                        },
                      })
                    }
                    className={inputClass}
                  >
                    <option value="meters">meters</option>
                    <option value="kilometers">kilometers</option>
                    <option value="miles">miles</option>
                    <option value="feet">feet</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Cql2Preview value={value} />

      <div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mapui:rounded mapui:border mapui:border-red-300 mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
        >
          Remove Filter
        </button>
      </div>
    </div>
  );
}
