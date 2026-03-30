import type { FilterRule, FilterRuleGroup, AvailableProperty } from '../../types';
import { isFilterRuleGroup } from '../../utils/cql2';
import { FilterRuleEditor } from './FilterRuleEditor';
import { getDefaultValue } from './operatorOptions';

export interface FilterRuleGroupEditorProps {
  value: FilterRuleGroup;
  onChange: (group: FilterRuleGroup) => void;
  onRemove?: () => void;
  availableProperties?: AvailableProperty[];
  depth: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultRule(): FilterRule {
  return {
    id: generateId(),
    property: '',
    operator: '=',
    value: getDefaultValue('='),
  };
}

function createDefaultGroup(): FilterRuleGroup {
  return {
    id: generateId(),
    combinator: 'and',
    rules: [createDefaultRule()],
  };
}

const borderColors = [
  'mapui:border-blue-300',
  'mapui:border-purple-300',
  'mapui:border-teal-300',
  'mapui:border-orange-300',
];

export function FilterRuleGroupEditor({
  value,
  onChange,
  onRemove,
  availableProperties,
  depth,
}: FilterRuleGroupEditorProps) {
  const borderColor = borderColors[depth % borderColors.length];

  const updateRule = (index: number, updated: FilterRule | FilterRuleGroup) => {
    const rules = [...value.rules];
    rules[index] = updated;
    onChange({ ...value, rules });
  };

  const removeRule = (index: number) => {
    const rules = value.rules.filter((_, i) => i !== index);
    onChange({ ...value, rules });
  };

  const addRule = () => {
    onChange({ ...value, rules: [...value.rules, createDefaultRule()] });
  };

  const addGroup = () => {
    onChange({ ...value, rules: [...value.rules, createDefaultGroup()] });
  };

  const toggleCombinator = () => {
    onChange({ ...value, combinator: value.combinator === 'and' ? 'or' : 'and' });
  };

  return (
    <div className={`mapui:rounded mapui:border-l-2 ${borderColor} mapui:bg-gray-50 mapui:p-3`}>
      {/* Header: combinator toggle + remove */}
      <div className="mapui:mb-2 mapui:flex mapui:items-center mapui:gap-2">
        <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-xs">
          <button
            type="button"
            onClick={() => value.combinator !== 'and' && toggleCombinator()}
            className={`mapui:rounded-l-md mapui:px-2.5 mapui:py-1 ${
              value.combinator === 'and'
                ? 'mapui:bg-blue-600 mapui:text-white'
                : 'mapui:bg-white mapui:text-gray-600 hover:mapui:bg-gray-100'
            }`}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => value.combinator !== 'or' && toggleCombinator()}
            className={`mapui:rounded-r-md mapui:px-2.5 mapui:py-1 ${
              value.combinator === 'or'
                ? 'mapui:bg-blue-600 mapui:text-white'
                : 'mapui:bg-white mapui:text-gray-600 hover:mapui:bg-gray-100'
            }`}
          >
            OR
          </button>
        </div>

        <span className="mapui:text-xs mapui:text-gray-500">
          {value.combinator === 'and' ? 'All conditions must match' : 'Any condition must match'}
        </span>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mapui:ml-auto mapui:rounded mapui:p-1 mapui:text-gray-400 hover:mapui:bg-red-50 hover:mapui:text-red-500"
            title="Remove group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mapui:h-4 mapui:w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* Rules list */}
      <div className="mapui:flex mapui:flex-col mapui:gap-2">
        {value.rules.map((item, index) => (
          <div key={item.id}>
            {isFilterRuleGroup(item) ? (
              <FilterRuleGroupEditor
                value={item}
                onChange={(updated) => updateRule(index, updated)}
                onRemove={() => removeRule(index)}
                availableProperties={availableProperties}
                depth={depth + 1}
              />
            ) : (
              <FilterRuleEditor
                value={item}
                onChange={(updated) => updateRule(index, updated)}
                onRemove={() => removeRule(index)}
                availableProperties={availableProperties}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div className="mapui:mt-2 mapui:flex mapui:gap-2">
        <button
          type="button"
          onClick={addRule}
          className="mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
        >
          + Add Rule
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
        >
          + Add Group
        </button>
      </div>
    </div>
  );
}
