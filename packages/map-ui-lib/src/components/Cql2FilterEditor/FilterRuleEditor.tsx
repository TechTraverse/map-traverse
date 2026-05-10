import type { FilterRule, AvailableProperty, FetchDistinctValuesFn } from '../../types';
import { getOperatorsForType, getDefaultValue, isSpatialOperator } from './operatorOptions';
import { FilterValueInput } from './FilterValueInput';
import { inputClass } from './styles';

export interface FilterRuleEditorProps {
  value: FilterRule;
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
  availableProperties?: AvailableProperty[];
  /**
   * Optional callback to fetch distinct values for a string property. When
   * provided, the value editor surfaces a dropdown of actual stored values
   * rather than free-form text — preventing zero-match filters from typos
   * like `"No"` vs `"NO"`.
   */
  onFetchDistinctValues?: FetchDistinctValuesFn;
}

export function FilterRuleEditor({ value, onChange, onRemove, availableProperties, onFetchDistinctValues }: FilterRuleEditorProps) {
  const hasProperties = availableProperties && availableProperties.length > 0;

  const selectedProp = availableProperties?.find((p) => p.name === value.property);
  const propType = selectedProp?.type;
  const propFormat = selectedProp?.format;
  const operators = getOperatorsForType(propType, propFormat);
  const isSpatial = isSpatialOperator(value.operator);

  const handlePropertyChange = (property: string) => {
    const prop = availableProperties?.find((p) => p.name === property);
    const ops = getOperatorsForType(prop?.type, prop?.format);
    const newOp = ops[0]?.value ?? '=';
    onChange({ ...value, property, operator: newOp, value: getDefaultValue(newOp) });
  };

  const handleOperatorChange = (operator: FilterRule['operator']) => {
    // Preserve value if compatible, otherwise reset
    const wasSpatial = isSpatialOperator(value.operator);
    const nowSpatial = isSpatialOperator(operator);
    if (wasSpatial !== nowSpatial || operator === 'between' || operator === 't_during' || operator === 'in' || operator === 'isNull') {
      onChange({ ...value, operator, value: getDefaultValue(operator) });
    } else {
      onChange({ ...value, operator });
    }
  };

  return (
    <div className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-2">
      {/* Property selector */}
      {!isSpatial && (
        hasProperties ? (
          <select
            value={value.property}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Property...</option>
            {availableProperties.map((p) => (
              <option key={p.name} value={p.name}>
                {p.title ?? p.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value.property}
            onChange={(e) => onChange({ ...value, property: e.target.value })}
            placeholder="property"
            className={`${inputClass} mapui:w-32`}
          />
        )
      )}

      {isSpatial && (
        <span className="mapui:text-sm mapui:font-medium mapui:text-slate-700">
          {value.property || 'geom'}
        </span>
      )}

      {/* Operator selector */}
      <select
        value={value.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterRule['operator'])}
        className={inputClass}
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value input */}
      <FilterValueInput
        operator={value.operator}
        value={value.value}
        onChange={(v) => onChange({ ...value, value: v })}
        spatial={value.spatial}
        onSpatialChange={(spatial) => onChange({ ...value, spatial })}
        propertyType={propType}
        propertyEnum={selectedProp?.enum}
        property={value.property}
        onFetchDistinctValues={onFetchDistinctValues}
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="mapui:ml-auto mapui:rounded mapui:p-1 mapui:text-slate-400 hover:mapui:bg-red-50 hover:mapui:text-red-500"
        title="Remove rule"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mapui:h-4 mapui:w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
