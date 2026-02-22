import type {
  SearchField,
  TextSearchField,
  NumberSearchField,
  DatetimeSearchField,
  SelectSearchField,
} from '../../types';
import { FormField } from '../admin/FormField';

export interface SearchFieldEditorProps {
  value: SearchField;
  onChange: (field: SearchField) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const defaultsByType: Record<SearchField['type'], SearchField> = {
  text: { type: 'text', property: '', label: '', autocomplete: false },
  number: { type: 'number', property: '', label: '', inputMode: 'input', operator: 'eq' },
  datetime: { type: 'datetime', property: '', label: '', range: false },
  select: { type: 'select', property: '', label: '' },
};

export function SearchFieldEditor({ value, onChange }: SearchFieldEditorProps) {
  const handleTypeChange = (type: SearchField['type']) => {
    onChange({ ...defaultsByType[type], property: value.property, label: value.label });
  };

  const updateBase = (patch: Partial<Pick<SearchField, 'property' | 'label' | 'placeholder'>>) =>
    onChange({ ...value, ...patch } as SearchField);

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="Field Type">
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as SearchField['type'])}
          className={inputClass}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="datetime">Date/Time</option>
          <option value="select">Select</option>
        </select>
      </FormField>

      <FormField label="Property" required>
        <input
          type="text"
          value={value.property}
          onChange={(e) => updateBase({ property: e.target.value })}
          placeholder="e.g. name"
          className={inputClass}
        />
      </FormField>

      <FormField label="Label">
        <input
          type="text"
          value={value.label}
          onChange={(e) => updateBase({ label: e.target.value })}
          placeholder="Display label"
          className={inputClass}
        />
      </FormField>

      <FormField label="Placeholder">
        <input
          type="text"
          value={value.placeholder ?? ''}
          onChange={(e) => updateBase({ placeholder: e.target.value || undefined })}
          placeholder="Input placeholder text"
          className={inputClass}
        />
      </FormField>

      {value.type === 'text' && (
        <>
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <input
              type="checkbox"
              id="text-autocomplete"
              checked={(value as TextSearchField).autocomplete ?? false}
              onChange={(e) =>
                onChange({ ...value, autocomplete: e.target.checked } as TextSearchField)
              }
              className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
            />
            <label htmlFor="text-autocomplete" className="mapui:text-sm mapui:text-gray-700">
              Enable Autocomplete
            </label>
          </div>
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <input
              type="checkbox"
              id="text-prefetch"
              checked={(value as TextSearchField).prefetch ?? false}
              onChange={(e) =>
                onChange({ ...value, prefetch: e.target.checked } as TextSearchField)
              }
              className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
            />
            <label htmlFor="text-prefetch" className="mapui:text-sm mapui:text-gray-700">
              Prefetch Options
            </label>
          </div>
          <FormField label="Static Options (comma-separated)">
            <input
              type="text"
              value={(value as TextSearchField).options?.join(', ') ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const options = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                onChange({ ...value, options } as TextSearchField);
              }}
              placeholder="option1, option2"
              className={inputClass}
            />
          </FormField>
        </>
      )}

      {value.type === 'number' && (
        <>
          <FormField label="Input Mode">
            <select
              value={(value as NumberSearchField).inputMode ?? 'input'}
              onChange={(e) =>
                onChange({
                  ...value,
                  inputMode: e.target.value as NumberSearchField['inputMode'],
                } as NumberSearchField)
              }
              className={inputClass}
            >
              <option value="input">Input</option>
              <option value="slider">Slider</option>
            </select>
          </FormField>
          <FormField label="Operator">
            <select
              value={(value as NumberSearchField).operator ?? 'eq'}
              onChange={(e) =>
                onChange({
                  ...value,
                  operator: e.target.value as NumberSearchField['operator'],
                } as NumberSearchField)
              }
              className={inputClass}
            >
              <option value="eq">Equal (=)</option>
              <option value="gt">Greater Than (&gt;)</option>
              <option value="gte">Greater or Equal (&gt;=)</option>
              <option value="lt">Less Than (&lt;)</option>
              <option value="lte">Less or Equal (&lt;=)</option>
              <option value="between">Between</option>
            </select>
          </FormField>
          <div className="mapui:grid mapui:grid-cols-3 mapui:gap-2">
            <FormField label="Min">
              <input
                type="number"
                value={(value as NumberSearchField).min ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    min: e.target.value ? parseFloat(e.target.value) : undefined,
                  } as NumberSearchField)
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Max">
              <input
                type="number"
                value={(value as NumberSearchField).max ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    max: e.target.value ? parseFloat(e.target.value) : undefined,
                  } as NumberSearchField)
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Step">
              <input
                type="number"
                value={(value as NumberSearchField).step ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    step: e.target.value ? parseFloat(e.target.value) : undefined,
                  } as NumberSearchField)
                }
                className={inputClass}
              />
            </FormField>
          </div>
        </>
      )}

      {value.type === 'datetime' && (
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          <input
            type="checkbox"
            id="datetime-range"
            checked={(value as DatetimeSearchField).range ?? false}
            onChange={(e) =>
              onChange({ ...value, range: e.target.checked } as DatetimeSearchField)
            }
            className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
          />
          <label htmlFor="datetime-range" className="mapui:text-sm mapui:text-gray-700">
            Date Range
          </label>
        </div>
      )}

      {value.type === 'select' && (
        <>
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <input
              type="checkbox"
              id="select-prefetch"
              checked={(value as SelectSearchField).prefetch ?? false}
              onChange={(e) =>
                onChange({ ...value, prefetch: e.target.checked } as SelectSearchField)
              }
              className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
            />
            <label htmlFor="select-prefetch" className="mapui:text-sm mapui:text-gray-700">
              Prefetch Options
            </label>
          </div>
          <FormField label="Static Options (comma-separated)">
            <input
              type="text"
              value={(value as SelectSearchField).options?.join(', ') ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const options = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                onChange({ ...value, options } as SelectSearchField);
              }}
              placeholder="option1, option2"
              className={inputClass}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
