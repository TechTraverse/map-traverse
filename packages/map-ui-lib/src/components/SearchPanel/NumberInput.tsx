import { useState, useEffect } from 'react';
import type { NumberSearchField, SearchFilterValue } from '../../types';

interface NumberInputProps {
  field: NumberSearchField;
  value: SearchFilterValue;
  onChange: (value: SearchFilterValue) => void;
  className?: string;
  id?: string;
}

const OPERATOR_SYMBOL_LABELS: Record<string, string> = {
  eq: '=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  between: 'between',
};

const OPERATOR_WORD_LABELS: Record<string, string> = {
  eq: 'equal to',
  gt: 'greater than',
  lt: 'less than',
  gte: 'greater than or equal to',
  lte: 'less than or equal to',
  between: 'between',
};

const ALL_OPERATORS = ['eq', 'gt', 'lt', 'gte', 'lte', 'between'] as const;

function getOperatorFromValue(value: SearchFilterValue, fieldOperator: string): string {
  if (value && typeof value === 'object') {
    if ('operator' in value) return (value as { value: number; operator: string }).operator;
    if ('min' in value) return 'between';
  }
  return fieldOperator;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const selectClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500 mapui:bg-white';

export function NumberInput({ field, value, onChange, className = '', id }: NumberInputProps) {
  const [localOperator, setLocalOperator] = useState(() =>
    getOperatorFromValue(value, field.operator),
  );

  // Sync operator when value is cleared externally
  useEffect(() => {
    setLocalOperator(getOperatorFromValue(value, field.operator));
  }, [value, field.operator]);

  const isBetween = localOperator === 'between';

  const availableOperators = field.inputMode === 'slider'
    ? ALL_OPERATORS.filter((op) => op !== 'between')
    : ALL_OPERATORS;

  const handleOperatorChange = (newOp: string) => {
    setLocalOperator(newOp);
    if (newOp === 'between') {
      // Switching to between — reset, user needs to enter min/max
      onChange(undefined);
    } else if (isBetween) {
      // Switching away from between — reset
      onChange(undefined);
    } else if (value && typeof value === 'object' && 'value' in value) {
      // Carry current number value over to new operator
      const numVal = (value as { value: number; operator: string }).value;
      onChange({ value: numVal, operator: newOp });
    }
    // If no current value, local operator update is enough
  };

  const handleSingleValueChange = (raw: string) => {
    if (raw === '') {
      onChange(undefined);
    } else {
      onChange({ value: Number(raw), operator: localOperator });
    }
  };

  const handleMinChange = (raw: string) => {
    const existingMax =
      value && typeof value === 'object' && 'max' in value
        ? (value as { min: number; max: number }).max
        : undefined;
    if (raw === '') {
      if (existingMax === undefined) {
        onChange(undefined);
      } else {
        onChange({ min: field.min ?? 0, max: existingMax });
      }
    } else {
      onChange({ min: Number(raw), max: existingMax ?? (field.max ?? 0) });
    }
  };

  const handleMaxChange = (raw: string) => {
    const existingMin =
      value && typeof value === 'object' && 'min' in value
        ? (value as { min: number; max: number }).min
        : undefined;
    if (raw === '') {
      if (existingMin === undefined) {
        onChange(undefined);
      } else {
        onChange({ min: existingMin, max: field.max ?? 0 });
      }
    } else {
      onChange({ min: existingMin ?? (field.min ?? 0), max: Number(raw) });
    }
  };

  const singleNumValue =
    value && typeof value === 'object' && 'value' in value
      ? String((value as { value: number; operator: string }).value)
      : '';
  const minValue =
    value && typeof value === 'object' && 'min' in value
      ? String((value as { min: number; max: number }).min)
      : '';
  const maxValue =
    value && typeof value === 'object' && 'max' in value
      ? String((value as { min: number; max: number }).max)
      : '';

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-1.5 ${className}`.trim()}>
      {/* Operator dropdown — always shown so user can switch operators */}
      <select
        value={localOperator}
        onChange={(e) => handleOperatorChange(e.target.value)}
        aria-label={`${field.label} operator`}
        className={selectClass}
      >
        {availableOperators.map((op) => (
          <option key={op} value={op}>
            {(field.operatorLabelStyle === 'word' ? OPERATOR_WORD_LABELS : OPERATOR_SYMBOL_LABELS)[op]}
          </option>
        ))}
      </select>

      {isBetween ? (
        /* Between: min + max inputs */
        <div className="mapui:flex mapui:gap-2">
          <input
            type="number"
            value={minValue}
            placeholder={field.min !== undefined ? String(field.min) : 'Min'}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => handleMinChange(e.target.value)}
            aria-label={`${field.label} minimum`}
            className={`${inputClass} mapui:w-1/2`}
          />
          <input
            type="number"
            value={maxValue}
            placeholder={field.max !== undefined ? String(field.max) : 'Max'}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => handleMaxChange(e.target.value)}
            aria-label={`${field.label} maximum`}
            className={`${inputClass} mapui:w-1/2`}
          />
        </div>
      ) : field.inputMode === 'slider' ? (
        /* Slider */
        field.showRange ? (
          <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <span className="mapui:text-xs mapui:text-slate-400 mapui:whitespace-nowrap">
                {field.min ?? 0}
              </span>
              <input
                type="range"
                value={singleNumValue !== '' ? singleNumValue : (field.min ?? 0)}
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                onChange={(e) => handleSingleValueChange(e.target.value)}
                aria-label={field.label}
                className="mapui:flex-1"
              />
              <span className="mapui:text-xs mapui:text-slate-400 mapui:whitespace-nowrap">
                {field.max ?? 100}
              </span>
            </div>
            <span className="mapui:text-xs mapui:text-slate-600 mapui:text-center">
              {singleNumValue !== '' ? singleNumValue : (field.min ?? 0)}
            </span>
          </div>
        ) : (
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <input
              type="range"
              value={singleNumValue !== '' ? singleNumValue : (field.min ?? 0)}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              onChange={(e) => handleSingleValueChange(e.target.value)}
              aria-label={field.label}
              className="mapui:flex-1"
            />
            <span className="mapui:text-xs mapui:text-slate-600 mapui:min-w-12 mapui:whitespace-nowrap mapui:text-right">
              {singleNumValue !== '' ? singleNumValue : (field.min ?? 0)}
            </span>
          </div>
        )
      ) : (
        /* Number input */
        <input
          id={id}
          type="number"
          value={singleNumValue}
          placeholder={field.placeholder ?? ''}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => handleSingleValueChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}
