import { useState, useEffect } from 'react';
import type { FilterOperator, FilterRuleValue, SpatialConfig, RelativeDateValue, DateRangeValue, ComputedRangeValue } from '../../types';
import { isSpatialOperator } from './operatorOptions';
import { inputClass, smallInputClass } from './styles';

const pillBtnClass = (active: boolean) =>
  `mapui:px-2 mapui:py-0.5 mapui:text-xs ${active ? 'mapui:bg-blue-600 mapui:text-white' : 'mapui:bg-white mapui:text-gray-600 hover:mapui:bg-gray-100'}`;

function CommaSeparatedInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState(() => values.join(', '));

  useEffect(() => {
    setRaw(values.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join(',')]);

  const commit = () => {
    const trimmed = raw.trim();
    const parsed = trimmed ? trimmed.split(',').map((s) => s.trim()).filter(Boolean) : [];
    onChange(parsed);
    setRaw(parsed.join(', '));
  };

  return (
    <input
      type="text"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

// ---------------------------------------------------------------------------
// Offset value editor (shared between relative dates, computed ranges, spatial)
// ---------------------------------------------------------------------------

type OffsetValue =
  | { kind: 'static'; value: number }
  | { kind: 'parameter'; name: string; label: string; default?: number };

function OffsetValueEditor({
  value,
  onChange,
  placeholder,
}: {
  value: OffsetValue;
  onChange: (v: OffsetValue) => void;
  placeholder?: string;
}) {
  const isParam = value.kind === 'parameter';
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1">
      <button
        type="button"
        onClick={() => {
          if (isParam) onChange({ kind: 'static', value: 0 });
          else onChange({ kind: 'parameter', name: '', label: '', default: value.value });
        }}
        className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-1 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-100"
        title={isParam ? 'Switch to static' : 'Switch to parameter'}
      >
        {isParam ? 'P' : 'V'}
      </button>
      {isParam ? (
        <>
          <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="param" className={`${inputClass} mapui:w-20`} />
          <input type="text" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="label" className={`${inputClass} mapui:w-20`} />
          <input type="number" value={value.default ?? ''} onChange={(e) => onChange({ ...value, default: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="default" className={`${inputClass} mapui:w-16`} />
        </>
      ) : (
        <input type="number" value={value.value} onChange={(e) => onChange({ kind: 'static', value: parseFloat(e.target.value) || 0 })} placeholder={placeholder ?? 'Value'} className={smallInputClass} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface FilterValueInputProps {
  operator: FilterOperator;
  value: FilterRuleValue;
  onChange: (value: FilterRuleValue) => void;
  spatial?: SpatialConfig;
  onSpatialChange?: (spatial: SpatialConfig) => void;
  propertyType?: string;
  propertyEnum?: string[];
}

export function FilterValueInput({
  operator,
  value,
  onChange,
  spatial,
  onSpatialChange,
  propertyType,
  propertyEnum,
}: FilterValueInputProps) {
  // --- Spatial operators ---
  if (isSpatialOperator(operator)) {
    return <SpatialValueInput operator={operator} spatial={spatial} onSpatialChange={onSpatialChange} />;
  }

  // --- isNull ---
  if (operator === 'isNull') {
    return <span className="mapui:text-sm mapui:text-gray-500 mapui:italic">is empty</span>;
  }

  // --- between: static range vs computed range ---
  if (operator === 'between') {
    return <BetweenValueInput value={value} onChange={onChange} />;
  }

  // --- t_during: static dates vs dateRange (with relative dates) ---
  if (operator === 't_during') {
    return <DuringValueInput value={value} onChange={onChange} />;
  }

  // --- t_after, t_before: static date, parameter, or relative date ---
  if (operator === 't_after' || operator === 't_before') {
    return <TemporalSingleInput value={value} onChange={onChange} />;
  }

  // --- All other operators: static / parameter / relativeDate toggle ---
  return <GenericValueInput operator={operator} value={value} onChange={onChange} propertyType={propertyType} propertyEnum={propertyEnum} />;
}

// ---------------------------------------------------------------------------
// Spatial input (s_dwithin distance with parameterized distance)
// ---------------------------------------------------------------------------

function SpatialValueInput({
  operator,
  spatial,
  onSpatialChange,
}: {
  operator: FilterOperator;
  spatial?: SpatialConfig;
  onSpatialChange?: (s: SpatialConfig) => void;
}) {
  if (operator !== 's_dwithin') {
    return <span className="mapui:text-xs mapui:text-gray-500 mapui:italic">(uses selected feature geometry)</span>;
  }

  const dist = spatial?.distance;
  const isParam = typeof dist === 'object' && dist !== null && dist !== undefined;

  const toggleDistMode = () => {
    if (isParam) {
      const d = dist as { default?: number };
      onSpatialChange?.({ ...spatial, distance: d.default ?? 0 });
    } else {
      onSpatialChange?.({ ...spatial, distance: { kind: 'parameter', name: '', label: 'Distance', default: (dist as number) ?? 0 } });
    }
  };

  return (
    <div className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2">
      <button
        type="button"
        onClick={toggleDistMode}
        className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-1 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-100"
        title={isParam ? 'Static distance' : 'Parameterized distance'}
      >
        {isParam ? 'P' : 'V'}
      </button>
      {isParam ? (
        (() => {
          const p = dist as { kind: 'parameter'; name: string; label: string; default?: number };
          return (
            <div className="mapui:flex mapui:items-center mapui:gap-1">
              <input type="text" value={p.name} onChange={(e) => onSpatialChange?.({ ...spatial, distance: { ...p, name: e.target.value } })} placeholder="param" className={`${inputClass} mapui:w-20`} />
              <input type="text" value={p.label} onChange={(e) => onSpatialChange?.({ ...spatial, distance: { ...p, label: e.target.value } })} placeholder="label" className={`${inputClass} mapui:w-20`} />
              <input type="number" value={p.default ?? ''} onChange={(e) => onSpatialChange?.({ ...spatial, distance: { ...p, default: e.target.value ? parseFloat(e.target.value) : undefined } })} placeholder="default" className={`${inputClass} mapui:w-16`} />
            </div>
          );
        })()
      ) : (
        <input
          type="number"
          value={(dist as number) ?? ''}
          onChange={(e) => onSpatialChange?.({ ...spatial, distance: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="Distance"
          className={smallInputClass}
          min={0}
        />
      )}
      <select
        value={spatial?.units ?? 'meters'}
        onChange={(e) => onSpatialChange?.({ ...spatial, units: e.target.value as SpatialConfig['units'] })}
        className={inputClass}
      >
        <option value="meters">meters</option>
        <option value="kilometers">kilometers</option>
        <option value="miles">miles</option>
        <option value="feet">feet</option>
      </select>
      <span className="mapui:text-xs mapui:text-gray-500 mapui:italic">(from selection)</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Between: static range vs computed range
// ---------------------------------------------------------------------------

function BetweenValueInput({ value, onChange }: { value: FilterRuleValue; onChange: (v: FilterRuleValue) => void }) {
  const isComputed = value.kind === 'computedRange';

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-xs">
        <button type="button" onClick={() => !isComputed || onChange({ kind: 'static', value: { lower: 0, upper: 100 } })} className={`mapui:rounded-l-md ${pillBtnClass(!isComputed)}`}>Static</button>
        <button type="button" onClick={() => isComputed || onChange({ kind: 'computedRange', baseParam: '', baseLabel: '', offsetType: 'percentage', offsetAmount: { kind: 'static', value: 20 } })} className={`mapui:rounded-r-md ${pillBtnClass(isComputed)}`}>Computed</button>
      </div>

      {isComputed ? (
        <ComputedRangeInputs value={value as ComputedRangeValue} onChange={onChange} />
      ) : (
        <StaticBetweenInputs value={value} onChange={onChange} />
      )}
    </div>
  );
}

function StaticBetweenInputs({ value, onChange }: { value: FilterRuleValue; onChange: (v: FilterRuleValue) => void }) {
  if (value.kind === 'parameter') {
    return <ParameterInputs value={value} onChange={onChange} />;
  }
  const raw = value.kind === 'static' ? (value.value as { lower: number; upper: number }) : null;
  const v = raw ?? { lower: 0, upper: 100 };
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1">
      <input type="number" value={v.lower} onChange={(e) => onChange({ kind: 'static', value: { lower: parseFloat(e.target.value) || 0, upper: v.upper } })} placeholder="Lower" className={smallInputClass} />
      <span className="mapui:text-sm mapui:text-gray-500">to</span>
      <input type="number" value={v.upper} onChange={(e) => onChange({ kind: 'static', value: { lower: v.lower, upper: parseFloat(e.target.value) || 0 } })} placeholder="Upper" className={smallInputClass} />
    </div>
  );
}

function ComputedRangeInputs({ value, onChange }: { value: ComputedRangeValue; onChange: (v: FilterRuleValue) => void }) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      <div className="mapui:flex mapui:items-center mapui:gap-1.5">
        <input type="text" value={value.baseParam} onChange={(e) => onChange({ ...value, baseParam: e.target.value })} placeholder="param name" className={`${inputClass} mapui:w-28`} />
        <input type="text" value={value.baseLabel} onChange={(e) => onChange({ ...value, baseLabel: e.target.value })} placeholder="label" className={`${inputClass} mapui:w-28`} />
      </div>
      <div className="mapui:flex mapui:items-center mapui:gap-1.5">
        <span className="mapui:text-xs mapui:text-gray-500">&plusmn;</span>
        <OffsetValueEditor value={value.offsetAmount} onChange={(offsetAmount) => onChange({ ...value, offsetAmount })} placeholder="Amount" />
        <select value={value.offsetType} onChange={(e) => onChange({ ...value, offsetType: e.target.value as 'percentage' | 'absolute' })} className={inputClass}>
          <option value="percentage">%</option>
          <option value="absolute">absolute</option>
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Temporal during: absolute dates vs date range with relative dates
// ---------------------------------------------------------------------------

function DuringValueInput({ value, onChange }: { value: FilterRuleValue; onChange: (v: FilterRuleValue) => void }) {
  const isDateRange = value.kind === 'dateRange';

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-xs">
        <button type="button" onClick={() => isDateRange && onChange({ kind: 'static', value: { start: '', end: '' } })} className={`mapui:rounded-l-md ${pillBtnClass(!isDateRange)}`}>Absolute</button>
        <button type="button" onClick={() => !isDateRange && onChange({
          kind: 'dateRange',
          start: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 3 }, unit: 'years' },
          end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
        })} className={`mapui:rounded-r-md ${pillBtnClass(isDateRange)}`}>Relative</button>
      </div>

      {isDateRange ? (
        <DateRangeInputs value={value as DateRangeValue} onChange={onChange} />
      ) : (
        <StaticDuringInputs value={value} onChange={onChange} />
      )}
    </div>
  );
}

function StaticDuringInputs({ value, onChange }: { value: FilterRuleValue; onChange: (v: FilterRuleValue) => void }) {
  const raw = value.kind === 'static' ? (value.value as { start: string; end: string }) : null;
  const v = raw ?? { start: '', end: '' };
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1">
      <input type="datetime-local" value={v.start} onChange={(e) => onChange({ kind: 'static', value: { start: e.target.value, end: v.end } })} className={inputClass} />
      <span className="mapui:text-sm mapui:text-gray-500">to</span>
      <input type="datetime-local" value={v.end} onChange={(e) => onChange({ kind: 'static', value: { start: v.start, end: e.target.value } })} className={inputClass} />
    </div>
  );
}

function DateRangeInputs({ value, onChange }: { value: DateRangeValue; onChange: (v: FilterRuleValue) => void }) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <span className="mapui:text-xs mapui:text-gray-500 mapui:w-10">From:</span>
        <DateEndpointEditor value={value.start} onChange={(start) => onChange({ ...value, start })} />
      </div>
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <span className="mapui:text-xs mapui:text-gray-500 mapui:w-10">To:</span>
        <DateEndpointEditor value={value.end} onChange={(end) => onChange({ ...value, end })} />
      </div>
    </div>
  );
}

type DateEndpoint = DateRangeValue['start'];

function DateEndpointEditor({ value, onChange }: { value: DateEndpoint; onChange: (v: DateEndpoint) => void }) {
  if (value.kind === 'relativeDate') {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <OffsetValueEditor value={value.offset} onChange={(offset) => onChange({ ...value, offset })} />
        <select value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as 'days' | 'months' | 'years' })} className={inputClass}>
          <option value="days">days</option>
          <option value="months">months</option>
          <option value="years">years</option>
        </select>
        <select value={value.direction} onChange={(e) => onChange({ ...value, direction: e.target.value as 'past' | 'future' })} className={inputClass}>
          <option value="past">ago</option>
          <option value="future">from now</option>
        </select>
        <button type="button" onClick={() => onChange({ kind: 'static', value: '' })} className="mapui:text-xs mapui:text-blue-600 hover:mapui:underline">abs</button>
      </div>
    );
  }

  if (value.kind === 'parameter') {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="param" className={`${inputClass} mapui:w-20`} />
        <input type="text" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="label" className={`${inputClass} mapui:w-20`} />
        <button type="button" onClick={() => onChange({ kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' })} className="mapui:text-xs mapui:text-blue-600 hover:mapui:underline">rel</button>
      </div>
    );
  }

  // static
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1">
      <input type="datetime-local" value={value.value} onChange={(e) => onChange({ kind: 'static', value: e.target.value })} className={inputClass} />
      <button type="button" onClick={() => onChange({ kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' })} className="mapui:text-xs mapui:text-blue-600 hover:mapui:underline">rel</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single temporal (t_after / t_before): static, parameter, or relative
// ---------------------------------------------------------------------------

function TemporalSingleInput({ value, onChange }: { value: FilterRuleValue; onChange: (v: FilterRuleValue) => void }) {
  if (value.kind === 'relativeDate') {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <OffsetValueEditor value={value.offset} onChange={(offset) => onChange({ ...value, offset })} />
        <select value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as 'days' | 'months' | 'years' })} className={inputClass}>
          <option value="days">days</option>
          <option value="months">months</option>
          <option value="years">years</option>
        </select>
        <select value={value.direction} onChange={(e) => onChange({ ...value, direction: e.target.value as 'past' | 'future' })} className={inputClass}>
          <option value="past">ago</option>
          <option value="future">from now</option>
        </select>
        <button type="button" onClick={() => onChange({ kind: 'static', value: '' })} className="mapui:text-xs mapui:text-blue-600 hover:mapui:underline">abs</button>
      </div>
    );
  }

  if (value.kind === 'parameter') {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <button type="button" onClick={() => onChange({ kind: 'static', value: '' })} className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-1.5 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-100" title="Switch to static">P</button>
        <ParameterInputs value={value} onChange={onChange} />
      </div>
    );
  }

  // static
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1">
      <div className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-xs">
        <button type="button" className={`mapui:rounded-l-md ${pillBtnClass(true)}`}>Abs</button>
        <button type="button" onClick={() => onChange({ kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' })} className={`${pillBtnClass(false)}`}>Rel</button>
        <button type="button" onClick={() => onChange({ kind: 'parameter', name: '', label: '', inputType: 'date' })} className={`mapui:rounded-r-md ${pillBtnClass(false)}`}>Param</button>
      </div>
      <input type="datetime-local" value={(value.kind === 'static' ? value.value : '') as string} onChange={(e) => onChange({ kind: 'static', value: e.target.value })} className={inputClass} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic value input (comparison, like, in operators)
// ---------------------------------------------------------------------------

function GenericValueInput({
  operator,
  value,
  onChange,
  propertyType,
  propertyEnum,
}: {
  operator: FilterOperator;
  value: FilterRuleValue;
  onChange: (v: FilterRuleValue) => void;
  propertyType?: string;
  propertyEnum?: string[];
}) {
  const isParameter = value.kind === 'parameter';

  const toggleMode = () => {
    if (isParameter) {
      onChange({ kind: 'static', value: '' });
    } else {
      onChange({ kind: 'parameter', name: '', label: '', inputType: 'text' });
    }
  };

  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <button
        type="button"
        onClick={toggleMode}
        className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-1.5 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-100"
        title={isParameter ? 'Switch to static value' : 'Switch to parameter'}
      >
        {isParameter ? 'P' : 'V'}
      </button>

      {isParameter ? (
        <ParameterInputs value={value} onChange={onChange} />
      ) : (
        <StaticGenericInput
          operator={operator}
          value={value.kind === 'static' ? value.value : ''}
          onChange={(v) => onChange({ kind: 'static', value: v })}
          propertyType={propertyType}
          propertyEnum={propertyEnum}
        />
      )}
    </div>
  );
}

function ParameterInputs({
  value,
  onChange,
}: {
  value: Extract<FilterRuleValue, { kind: 'parameter' }>;
  onChange: (value: FilterRuleValue) => void;
}) {
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1.5">
      <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="param name" className={`${inputClass} mapui:w-28`} />
      <input type="text" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder="label" className={`${inputClass} mapui:w-28`} />
      <select value={value.inputType} onChange={(e) => onChange({ ...value, inputType: e.target.value as 'text' | 'number' | 'date' | 'select' })} className={inputClass}>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="select">Select</option>
      </select>
    </div>
  );
}

type StaticValue = Extract<FilterRuleValue, { kind: 'static' }>['value'];

function StaticGenericInput({
  operator,
  value,
  onChange,
  propertyType,
  propertyEnum,
}: {
  operator: FilterOperator;
  value: StaticValue;
  onChange: (value: StaticValue) => void;
  propertyType?: string;
  propertyEnum?: string[];
}) {
  // in: comma-separated list
  if (operator === 'in') {
    return <CommaSeparatedInput values={(value as string[]) ?? []} onChange={onChange} placeholder="value1, value2, ..." />;
  }

  // Enum property: select dropdown
  if (propertyEnum && propertyEnum.length > 0 && (operator === '=' || operator === '<>')) {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Select...</option>
        {propertyEnum.map((v) => (<option key={v} value={v}>{v}</option>))}
      </select>
    );
  }

  // Numeric operators
  if (propertyType === 'integer' || propertyType === 'number' ||
      operator === '>' || operator === '>=' || operator === '<' || operator === '<=') {
    return (
      <input type="number" value={value as number ?? ''} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')} placeholder="Value" className={smallInputClass} />
    );
  }

  // Default: text input
  return <input type="text" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Value" className={inputClass} />;
}
