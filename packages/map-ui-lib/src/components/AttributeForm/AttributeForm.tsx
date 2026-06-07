import { FormField } from '../admin/FormField';

export interface AttributeColumn {
  name: string;
  /** Postgres `data_type` (e.g. 'integer', 'character varying', 'timestamp with time zone'). */
  dataType: string;
  /** Postgres `udt_name` (e.g. 'int4', 'float8', 'bool', 'timestamptz'). */
  udtName?: string;
  nullable: boolean;
}

export interface AttributeFormProps {
  /** Attribute columns only — the caller is expected to exclude the pk and geometry columns. */
  columns: AttributeColumn[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
  idPrefix?: string;
}

type InputKind = 'number' | 'boolean' | 'date' | 'datetime' | 'text';

const NUMERIC_DATA_TYPE_HINTS = [
  'int',
  'numeric',
  'double',
  'real',
  'decimal',
  'float',
  'serial',
  'money',
];
const NUMERIC_UDT_NAMES = ['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'money'];

/** Pick the input kind for a column from its Postgres data type / udt name. */
export function attributeInputKind(column: AttributeColumn): InputKind {
  const dt = (column.dataType ?? '').toLowerCase();
  const udt = (column.udtName ?? '').toLowerCase();

  if (dt.includes('bool') || udt === 'bool') return 'boolean';
  if (dt.includes('timestamp') || udt.startsWith('timestamp')) return 'datetime';
  if (dt === 'date' || udt === 'date') return 'date';
  if (NUMERIC_DATA_TYPE_HINTS.some((h) => dt.includes(h))) return 'number';
  if (NUMERIC_UDT_NAMES.includes(udt)) return 'number';
  return 'text';
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';
const selectClass = `${inputClass} mapui:bg-white`;

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Coerce a raw input string to the value emitted for a given input kind. Empty → null. */
function parseInputValue(kind: InputKind, raw: string): unknown {
  if (raw === '') return null;
  if (kind === 'boolean') return raw === 'true';
  if (kind === 'number') return Number(raw);
  return raw;
}

/**
 * AttributeForm — a controlled form rendering one input per attribute column,
 * choosing the input type from the column's Postgres data type. Framework- and
 * map-agnostic. All values come from `values`; edits are emitted via `onChange`.
 */
export function AttributeForm({
  columns,
  values,
  onChange,
  errors,
  idPrefix = 'attr',
}: AttributeFormProps) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      {columns.map((column) => {
        const id = `${idPrefix}-${column.name}`;
        const kind = attributeInputKind(column);
        const raw = values[column.name];

        let control;
        if (kind === 'boolean') {
          const boolStr = raw === true ? 'true' : raw === false ? 'false' : '';
          control = (
            <select
              id={id}
              value={boolStr}
              onChange={(e) => onChange(column.name, parseInputValue(kind, e.target.value))}
              className={selectClass}
            >
              {column.nullable && <option value="">—</option>}
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          );
        } else if (kind === 'number') {
          control = (
            <input
              id={id}
              type="number"
              value={toStringValue(raw)}
              onChange={(e) => onChange(column.name, parseInputValue(kind, e.target.value))}
              className={inputClass}
            />
          );
        } else if (kind === 'date' || kind === 'datetime') {
          control = (
            <input
              id={id}
              type={kind === 'date' ? 'date' : 'datetime-local'}
              value={toStringValue(raw)}
              onChange={(e) => onChange(column.name, parseInputValue(kind, e.target.value))}
              className={inputClass}
            />
          );
        } else {
          control = (
            <input
              id={id}
              type="text"
              value={toStringValue(raw)}
              onChange={(e) => onChange(column.name, parseInputValue(kind, e.target.value))}
              className={inputClass}
            />
          );
        }

        return (
          <FormField
            key={column.name}
            label={column.name}
            required={!column.nullable}
            error={errors?.[column.name]}
            htmlFor={id}
          >
            {control}
          </FormField>
        );
      })}
    </div>
  );
}
