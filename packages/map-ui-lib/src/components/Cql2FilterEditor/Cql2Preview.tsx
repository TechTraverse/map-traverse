import { useState, useMemo } from 'react';
import type { FilterRuleGroup } from '../../types';
import { buildCql2Query } from '../../utils/cql2';

export interface Cql2PreviewProps {
  value: FilterRuleGroup;
}

export function Cql2Preview({ value }: Cql2PreviewProps) {
  const [open, setOpen] = useState(false);

  const previewJson = useMemo(() => {
    const query = buildCql2Query(value);
    const output: Record<string, unknown> = {};
    if (query.filter) output.filter = query.filter;
    if (query.sortby) output.sortby = query.sortby;
    if (query.limit) output.limit = query.limit;
    if (Object.keys(output).length === 0) return null;
    return JSON.stringify(output, null, 2);
  }, [value]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mapui:text-xs mapui:text-gray-500 hover:mapui:text-gray-700"
      >
        {open ? '\u25BC' : '\u25B6'} Preview Query
      </button>
      {open && (
        <pre className="mapui:mt-1 mapui:max-h-48 mapui:overflow-auto mapui:rounded mapui:bg-gray-800 mapui:p-3 mapui:text-xs mapui:text-green-300">
          {previewJson ?? '(no valid filter)'}
        </pre>
      )}
    </div>
  );
}
