import { useState } from 'react';
import type { SearchField } from '../../types';
import { SearchFieldEditor } from './SearchFieldEditor';

export interface SearchFieldListProps {
  fields: SearchField[];
  onChange: (fields: SearchField[]) => void;
}

const defaultField = (): SearchField => ({
  type: 'text',
  property: '',
  label: '',
  autocomplete: false,
});

export function SearchFieldList({ fields, onChange }: SearchFieldListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newFields = [...fields, defaultField()];
    onChange(newFields);
    setExpandedIndex(newFields.length - 1);
  };

  const handleUpdate = (index: number, field: SearchField) => {
    onChange(fields.map((f, i) => (i === index ? field : f)));
  };

  const handleRemove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
    setExpandedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fields];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
    setExpandedIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const updated = [...fields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
    setExpandedIndex(index + 1);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      {fields.length === 0 && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-gray-500">No search fields configured.</p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {fields.map((field, index) => (
          <li key={index} className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white">
            <div className="mapui:flex mapui:items-center mapui:gap-1 mapui:px-3 mapui:py-2">
              <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === fields.length - 1}
                  aria-label="Move down"
                  className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="mapui:flex-1 mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:text-left mapui:text-sm mapui:font-medium mapui:text-gray-800"
              >
                <span className="mapui:mr-1 mapui:rounded mapui:bg-gray-100 mapui:px-1 mapui:py-0.5 mapui:text-xs mapui:font-mono mapui:text-gray-500">
                  {field.type}
                </span>
                {field.label || field.property || 'Untitled field'}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="Remove field"
                className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
              >
                Remove
              </button>
            </div>

            {expandedIndex === index && (
              <div className="mapui:border-t mapui:border-gray-100 mapui:p-3">
                <SearchFieldEditor
                  value={field}
                  onChange={(updated) => handleUpdate(index, updated)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleAdd}
        className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
      >
        + Add Search Field
      </button>
    </div>
  );
}
