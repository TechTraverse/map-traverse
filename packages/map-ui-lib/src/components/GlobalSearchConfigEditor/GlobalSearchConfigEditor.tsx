import type {
  GlobalSearchConfig,
  GlobalSearchLayerConfig,
  GlobalSearchProperty,
  LayerConfig,
  AvailableProperty,
} from '../../types';
import { FormField } from '../admin/FormField';

export interface GlobalSearchConfigEditorProps {
  value: GlobalSearchConfig;
  onChange: (next: GlobalSearchConfig) => void;
  layers: LayerConfig[];
  propertiesByLayer: Record<string, AvailableProperty[]>;
  isLoadingProperties?: Record<string, boolean>;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

// ----- Pure update helpers (exported for testing) -----

export function addLayerEntry(value: GlobalSearchConfig, layerId: string): GlobalSearchConfig {
  if (!layerId) return value;
  if (value.layers.some((l) => l.layerId === layerId)) return value;
  return { ...value, layers: [...value.layers, { layerId, properties: [] }] };
}

export function removeLayerEntry(value: GlobalSearchConfig, layerId: string): GlobalSearchConfig {
  return { ...value, layers: value.layers.filter((l) => l.layerId !== layerId) };
}

export function addPropertyToLayer(
  value: GlobalSearchConfig,
  layerId: string,
  initialName = '',
): GlobalSearchConfig {
  return {
    ...value,
    layers: value.layers.map((l) =>
      l.layerId === layerId
        ? { ...l, properties: [...l.properties, { property: initialName }] }
        : l,
    ),
  };
}

export function removePropertyAt(
  value: GlobalSearchConfig,
  layerId: string,
  index: number,
): GlobalSearchConfig {
  return {
    ...value,
    layers: value.layers.map((l) =>
      l.layerId === layerId
        ? { ...l, properties: l.properties.filter((_, i) => i !== index) }
        : l,
    ),
  };
}

export function updatePropertyAt(
  value: GlobalSearchConfig,
  layerId: string,
  index: number,
  patch: Partial<GlobalSearchProperty>,
): GlobalSearchConfig {
  return {
    ...value,
    layers: value.layers.map((l) =>
      l.layerId === layerId
        ? {
            ...l,
            properties: l.properties.map((p, i) => (i === index ? { ...p, ...patch } : p)),
          }
        : l,
    ),
  };
}

/**
 * Set or clear `autocomplete` / `prefetch` independently. The two flags are
 * orthogonal: `autocomplete` enables the property for global-search matching;
 * `prefetch` is a case-insensitive booster on top that only matters when
 * `autocomplete` is also on.
 */
export function togglePropertyFlag(
  value: GlobalSearchConfig,
  layerId: string,
  index: number,
  flag: 'autocomplete' | 'prefetch',
  checked: boolean,
): GlobalSearchConfig {
  return {
    ...value,
    layers: value.layers.map((l) => {
      if (l.layerId !== layerId) return l;
      return {
        ...l,
        properties: l.properties.map((p, i) => {
          if (i !== index) return p;
          if (!checked) {
            const next = { ...p };
            delete next[flag];
            return next;
          }
          return { ...p, [flag]: true };
        }),
      };
    }),
  };
}

// ----- Component -----

export function GlobalSearchConfigEditor({
  value,
  onChange,
  layers,
  propertiesByLayer,
  isLoadingProperties,
}: GlobalSearchConfigEditorProps) {
  const configuredLayerIds = new Set(value.layers.map((l) => l.layerId));
  const availableLayerOptions = layers.filter((l) => !configuredLayerIds.has(l.id));

  const updateTop = (
    patch: Partial<Pick<GlobalSearchConfig, 'placeholder' | 'maxResultsPerLayer' | 'debounceMs' | 'minQueryLength'>>,
  ) => onChange({ ...value, ...patch });

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      <p className="mapui:text-sm mapui:text-gray-500">
        Configure the global search bar that searches across layer properties. Add layers and pick which properties to index.
      </p>
      <fieldset className="mapui:flex mapui:flex-col mapui:gap-3 mapui:rounded mapui:border mapui:border-gray-200 mapui:p-3">
        <legend className="mapui:px-1 mapui:text-sm mapui:font-semibold mapui:text-gray-700">Settings</legend>
        <FormField label="Placeholder">
          <input
            type="text"
            value={value.placeholder ?? ''}
            onChange={(e) => updateTop({ placeholder: e.target.value || undefined })}
            placeholder="Search…"
            className={inputClass}
          />
        </FormField>
        <div className="mapui:grid mapui:grid-cols-3 mapui:gap-2">
          <FormField label="Max Results / Layer">
            <input
              type="number"
              min={1}
              max={50}
              value={value.maxResultsPerLayer}
              onChange={(e) =>
                updateTop({ maxResultsPerLayer: Number(e.target.value) || 1 })
              }
              className={inputClass}
              aria-label="Max Results Per Layer"
            />
          </FormField>
          <FormField label="Debounce (ms)">
            <input
              type="number"
              min={0}
              value={value.debounceMs}
              onChange={(e) => updateTop({ debounceMs: Number(e.target.value) || 0 })}
              className={inputClass}
              aria-label="Debounce Milliseconds"
            />
          </FormField>
          <FormField label="Min Query Length">
            <input
              type="number"
              min={1}
              value={value.minQueryLength}
              onChange={(e) =>
                updateTop({ minQueryLength: Number(e.target.value) || 1 })
              }
              className={inputClass}
              aria-label="Min Query Length"
            />
          </FormField>
        </div>
      </fieldset>

      <div className="mapui:flex mapui:flex-col mapui:gap-3">
        <div className="mapui:flex mapui:items-center mapui:justify-between">
          <h3 className="mapui:text-sm mapui:font-semibold mapui:text-gray-800">Layers</h3>
        </div>

        <div className="mapui:flex mapui:items-center mapui:gap-2">
          <select
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              onChange(addLayerEntry(value, id));
            }}
            className={inputClass}
            aria-label="Add layer"
            disabled={availableLayerOptions.length === 0}
          >
            <option value="">
              {availableLayerOptions.length === 0 ? 'All layers added' : 'Add layer…'}
            </option>
            {availableLayerOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {value.layers.length === 0 && (
          <p className="mapui:text-xs mapui:text-gray-500">No layers configured yet.</p>
        )}

        {value.layers.map((entry) => {
          const layer = layers.find((l) => l.id === entry.layerId);
          const layerLabel = layer?.label ?? entry.layerId;
          const props = propertiesByLayer[entry.layerId] ?? [];
          const loading = isLoadingProperties?.[entry.layerId] === true;
          const hasProps = props.length > 0;

          return (
            <div
              key={entry.layerId}
              data-testid={`gs-layer-card-${entry.layerId}`}
              className="mapui:flex mapui:flex-col mapui:gap-2 mapui:rounded mapui:border mapui:border-gray-200 mapui:p-3"
            >
              <div className="mapui:flex mapui:items-center mapui:justify-between">
                <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">
                  {layerLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(removeLayerEntry(value, entry.layerId))}
                  className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50"
                  aria-label={`Remove layer ${layerLabel}`}
                >
                  Remove
                </button>
              </div>

              {entry.properties.length === 0 && (
                <p
                  className="mapui:text-xs mapui:text-amber-600"
                  role="status"
                  data-testid={`gs-layer-warning-${entry.layerId}`}
                >
                  At least one property is required
                </p>
              )}

              {loading && (
                <p
                  className="mapui:text-xs mapui:text-gray-500"
                  data-testid={`gs-layer-loading-${entry.layerId}`}
                >
                  Loading properties…
                </p>
              )}

              {!loading && !hasProps && (
                <p className="mapui:text-xs mapui:text-gray-500">
                  (no properties available)
                </p>
              )}

              <div className="mapui:flex mapui:flex-col mapui:gap-2">
                {entry.properties.map((p, idx) => {
                  const ac = p.autocomplete === true;
                  const pf = p.prefetch === true;
                  return (
                    <div
                      key={idx}
                      data-testid={`gs-property-row-${entry.layerId}-${idx}`}
                      className="mapui:flex mapui:flex-col mapui:gap-2 mapui:rounded mapui:border mapui:border-gray-100 mapui:p-2"
                    >
                      <div className="mapui:grid mapui:grid-cols-2 mapui:gap-2">
                        <FormField label="Property" required>
                          {hasProps ? (
                            <select
                              value={p.property}
                              onChange={(e) =>
                                onChange(
                                  updatePropertyAt(value, entry.layerId, idx, {
                                    property: e.target.value,
                                  }),
                                )
                              }
                              className={inputClass}
                              aria-label={`Property for ${layerLabel} row ${idx + 1}`}
                            >
                              <option value="">Select a property…</option>
                              {props.map((ap) => (
                                <option key={ap.name} value={ap.name}>
                                  {ap.title ?? ap.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={p.property}
                              onChange={(e) =>
                                onChange(
                                  updatePropertyAt(value, entry.layerId, idx, {
                                    property: e.target.value,
                                  }),
                                )
                              }
                              placeholder="e.g. name"
                              className={inputClass}
                              aria-label={`Property for ${layerLabel} row ${idx + 1}`}
                            />
                          )}
                        </FormField>
                        <FormField label="Label">
                          <input
                            type="text"
                            value={p.label ?? ''}
                            onChange={(e) =>
                              onChange(
                                updatePropertyAt(value, entry.layerId, idx, {
                                  label: e.target.value || undefined,
                                }),
                              )
                            }
                            placeholder="Display label"
                            className={inputClass}
                            aria-label={`Label for ${layerLabel} row ${idx + 1}`}
                          />
                        </FormField>
                      </div>
                      <div className="mapui:flex mapui:items-center mapui:gap-4">
                        <label className="mapui:flex mapui:items-center mapui:gap-1 mapui:text-xs mapui:text-gray-700">
                          <input
                            type="checkbox"
                            checked={ac}
                            onChange={(e) =>
                              onChange(
                                togglePropertyFlag(
                                  value,
                                  entry.layerId,
                                  idx,
                                  'autocomplete',
                                  e.target.checked,
                                ),
                              )
                            }
                            className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
                            aria-label={`Autocomplete for ${layerLabel} row ${idx + 1}`}
                          />
                          Autocomplete
                        </label>
                        <label
                          className={`mapui:flex mapui:items-center mapui:gap-1 mapui:text-xs ${
                            ac ? 'mapui:text-gray-700' : 'mapui:text-gray-400'
                          }`}
                          title={
                            ac
                              ? 'Preload distinct values so matching is case-insensitive'
                              : 'Enable Autocomplete first'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={pf}
                            disabled={!ac}
                            onChange={(e) =>
                              onChange(
                                togglePropertyFlag(
                                  value,
                                  entry.layerId,
                                  idx,
                                  'prefetch',
                                  e.target.checked,
                                ),
                              )
                            }
                            className="mapui:h-4 mapui:w-4 mapui:accent-blue-600 disabled:mapui:cursor-not-allowed"
                            aria-label={`Prefetch for ${layerLabel} row ${idx + 1}`}
                          />
                          Prefetch
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            onChange(removePropertyAt(value, entry.layerId, idx))
                          }
                          className="mapui:ml-auto mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50"
                          aria-label={`Remove property row ${idx + 1} from ${layerLabel}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const used = new Set(entry.properties.map((p) => p.property));
                    const firstUnused = props.find((ap) => !used.has(ap.name))?.name ?? '';
                    onChange(addPropertyToLayer(value, entry.layerId, firstUnused));
                  }}
                  className="mapui:self-start mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50"
                  aria-label={`Add property to ${layerLabel}`}
                >
                  Add property
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
