import { useState, useMemo, useEffect } from 'react';
import type { FilterRuleGroup } from '../../types';
import { extractQueryParameters, queryRequiresGeometry } from '../../utils/queryParameters';
import { inputClass } from '../Cql2FilterEditor/styles';

export interface QueryPanelProps {
  /** The CQL2 filter template from LayerConfig.cql2Filter */
  cql2Filter: FilterRuleGroup;
  /** Called when user clicks Run with parameter values */
  onRun: (params: Record<string, unknown>) => void;
  /** Whether query is currently executing */
  loading?: boolean;
  /** Whether selection geometry is available for spatial queries */
  hasSelectionGeometry?: boolean;
  className?: string;
}

export function QueryPanel({
  cql2Filter,
  onRun,
  loading = false,
  hasSelectionGeometry = false,
  className,
}: QueryPanelProps) {
  const parameters = useMemo(() => extractQueryParameters(cql2Filter), [cql2Filter]);
  const needsGeometry = useMemo(() => queryRequiresGeometry(cql2Filter), [cql2Filter]);

  const [values, setValues] = useState<Record<string, unknown>>({});

  // Reset values when the parameter set changes (e.g. filter edited or layer switched).
  // Preserve user-entered values for parameters that still exist; seed new ones with defaults.
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, unknown> = {};
      for (const p of parameters) {
        next[p.name] = prev[p.name] !== undefined ? prev[p.name] : p.default;
      }
      return next;
    });
  }, [parameters]);

  const updateValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const canRun = !loading && (!needsGeometry || hasSelectionGeometry);

  const handleRun = () => {
    if (canRun) onRun(values);
  };

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-2 ${className ?? ''}`}>
      <div className="mapui:border-t mapui:border-gray-200 mapui:pt-2">
        <span className="mapui:text-xs mapui:font-medium mapui:text-gray-600">Query</span>
      </div>

      {parameters.map((param) => (
        <div key={param.name} className="mapui:flex mapui:flex-col mapui:gap-0.5">
          <label className="mapui:text-xs mapui:text-gray-500">{param.label}</label>
          {param.inputType === 'number' ? (
            <input
              type="number"
              value={(values[param.name] as number) ?? ''}
              onChange={(e) => updateValue(param.name, e.target.value ? parseFloat(e.target.value) : undefined)}
              className={inputClass}
            />
          ) : param.inputType === 'date' ? (
            <input
              type="date"
              value={(values[param.name] as string) ?? ''}
              onChange={(e) => updateValue(param.name, e.target.value || undefined)}
              className={inputClass}
            />
          ) : param.inputType === 'select' ? (
            <select
              value={(values[param.name] as string) ?? ''}
              onChange={(e) => updateValue(param.name, e.target.value || undefined)}
              className={inputClass}
            >
              <option value="">Select...</option>
              {param.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={(values[param.name] as string) ?? ''}
              onChange={(e) => updateValue(param.name, e.target.value || undefined)}
              className={inputClass}
            />
          )}
        </div>
      ))}

      {needsGeometry && !hasSelectionGeometry && (
        <p className="mapui:m-0 mapui:text-xs mapui:text-amber-600">
          Select features on the map first to provide geometry for this query.
        </p>
      )}

      <button
        type="button"
        onClick={handleRun}
        disabled={!canRun}
        className={[
          'mapui:flex mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:transition-colors',
          canRun
            ? 'mapui:bg-green-600 mapui:text-white hover:mapui:bg-green-700'
            : 'mapui:bg-gray-200 mapui:text-gray-400 mapui:cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? 'Running…' : 'Run Query'}
      </button>
    </div>
  );
}
