import type { LayerConfig, FilterRule, AvailableProperty } from '../../types';
import { FilterRuleEditor } from '../Cql2FilterEditor/FilterRuleEditor';
import { generateId } from '../../utils/id';

export interface AllFiltersBuilderProps {
  layers: LayerConfig[];
  availableProperties?: Record<string, AvailableProperty[]>;
  customRules: Record<string, FilterRule[]>;
  onCustomRulesChange: (layerId: string, rules: FilterRule[]) => void;
}

function createEmptyRule(): FilterRule {
  return {
    id: generateId(),
    property: '',
    operator: '=',
    value: { kind: 'static', value: '' },
  };
}

export function AllFiltersBuilder({
  layers,
  availableProperties,
  customRules,
  onCustomRulesChange,
}: AllFiltersBuilderProps) {
  if (layers.length === 0) {
    return (
      <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
        No layers available.
      </p>
    );
  }

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      <div>
        <h4 className="mapui:m-0 mapui:mb-1 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          All Filters
        </h4>
        <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
          Build ad-hoc filters across any property. Combined with search filters via AND.
        </p>
      </div>

      {layers.map((layer) => {
        const layerRules = customRules[layer.id] ?? [];
        const layerProps = availableProperties?.[layer.id];

        return (
          <div
            key={layer.id}
            className="mapui:flex mapui:flex-col mapui:gap-2 mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-gray-50 mapui:p-3"
          >
            <div className="mapui:flex mapui:items-center mapui:justify-between">
              <span className="mapui:text-sm mapui:font-medium mapui:text-gray-700">
                {layer.label}
              </span>
              {layerRules.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCustomRulesChange(layer.id, [])}
                  className="mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:p-0 mapui:text-xs mapui:text-blue-600 hover:mapui:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>

            {layerRules.length === 0 ? (
              <p className="mapui:m-0 mapui:text-xs mapui:text-gray-500">
                No filters added for this layer.
              </p>
            ) : (
              <div className="mapui:flex mapui:flex-col mapui:gap-2">
                {layerRules.map((rule, idx) => (
                  <FilterRuleEditor
                    key={rule.id}
                    value={rule}
                    onChange={(updated) => {
                      const next = [...layerRules];
                      next[idx] = updated;
                      onCustomRulesChange(layer.id, next);
                    }}
                    onRemove={() => {
                      onCustomRulesChange(
                        layer.id,
                        layerRules.filter((_, i) => i !== idx),
                      );
                    }}
                    availableProperties={layerProps}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                onCustomRulesChange(layer.id, [...layerRules, createEmptyRule()])
              }
              className="mapui:cursor-pointer mapui:self-start mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
            >
              + Add Filter
            </button>
          </div>
        );
      })}
    </div>
  );
}
