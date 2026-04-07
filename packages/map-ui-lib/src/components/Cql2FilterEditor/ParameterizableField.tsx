import type { ReactNode } from 'react';
import { DISTANCE_UNITS } from '../../schemas/config';
import type { Cql2DistanceUnit } from '../../types';
import { inputClass } from './styles';

export type ParamRef<T> = { kind: 'parameter'; name: string; label: string; default?: T };
export type Parameterizable<T> = T | ParamRef<T> | undefined;

export function isParamRef<T>(v: Parameterizable<T>): v is ParamRef<T> {
  return typeof v === 'object' && v !== null && (v as { kind?: string }).kind === 'parameter';
}

export interface ParameterizableFieldProps<T> {
  value: Parameterizable<T>;
  onChange: (v: Parameterizable<T>) => void;
  /** Label used as the default `param.label` when toggling V→P */
  defaultParamLabel: string;
  /** Value used when no value is set yet (e.g. when toggling P→V on an empty param) */
  emptyValue: T;
  /** Renders the input for the literal value (V mode) and the parameter default (P mode) */
  renderInput: (value: T | undefined, onChange: (v: T | undefined) => void) => ReactNode;
}

/**
 * Toggles between a literal value and a `{kind:'parameter'}` reference.
 * In P mode, exposes name/label inputs plus the same `renderInput` for the default value.
 */
export function ParameterizableField<T>({
  value,
  onChange,
  defaultParamLabel,
  emptyValue,
  renderInput,
}: ParameterizableFieldProps<T>) {
  const isParam = isParamRef(value);

  const toggleMode = () => {
    if (isParam) {
      onChange((value as ParamRef<T>).default ?? emptyValue);
    } else {
      onChange({
        kind: 'parameter',
        name: '',
        label: defaultParamLabel,
        default: (value as T | undefined) ?? emptyValue,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleMode}
        className="mapui:rounded mapui:border mapui:border-gray-300 mapui:px-1 mapui:py-0.5 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-100"
        title={isParam ? `Static ${defaultParamLabel.toLowerCase()}` : `Parameterized ${defaultParamLabel.toLowerCase()}`}
      >
        {isParam ? 'P' : 'V'}
      </button>
      {isParam ? (
        <>
          <input
            type="text"
            value={(value as ParamRef<T>).name}
            onChange={(e) => onChange({ ...(value as ParamRef<T>), name: e.target.value })}
            placeholder="param"
            className={`${inputClass} mapui:w-20`}
          />
          <input
            type="text"
            value={(value as ParamRef<T>).label}
            onChange={(e) => onChange({ ...(value as ParamRef<T>), label: e.target.value })}
            placeholder="label"
            className={`${inputClass} mapui:w-20`}
          />
          {renderInput((value as ParamRef<T>).default, (v) =>
            onChange({ ...(value as ParamRef<T>), default: v }),
          )}
        </>
      ) : (
        renderInput(value as T | undefined, (v) => onChange(v))
      )}
    </>
  );
}

export function UnitsSelect({
  value,
  onChange,
}: {
  value: Cql2DistanceUnit | undefined;
  onChange: (v: Cql2DistanceUnit) => void;
}) {
  return (
    <select
      value={value ?? 'meters'}
      onChange={(e) => onChange(e.target.value as Cql2DistanceUnit)}
      className={inputClass}
    >
      {DISTANCE_UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
