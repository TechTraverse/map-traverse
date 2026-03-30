import type { FilterOperator, FilterRuleValue } from '../../types';

export interface OperatorOption {
  value: FilterOperator;
  label: string;
}

const stringOps: OperatorOption[] = [
  { value: '=', label: 'equals' },
  { value: '<>', label: 'not equals' },
  { value: 'like', label: 'contains' },
  { value: 'in', label: 'in list' },
  { value: 'isNull', label: 'is empty' },
];

const numericOps: OperatorOption[] = [
  { value: '=', label: '=' },
  { value: '<>', label: '\u2260' },
  { value: '>', label: '>' },
  { value: '>=', label: '\u2265' },
  { value: '<', label: '<' },
  { value: '<=', label: '\u2264' },
  { value: 'between', label: 'between' },
  { value: 'isNull', label: 'is empty' },
];

const datetimeOps: OperatorOption[] = [
  { value: '=', label: 'equals' },
  { value: '<>', label: 'not equals' },
  { value: 't_after', label: 'after' },
  { value: 't_before', label: 'before' },
  { value: 't_during', label: 'between' },
  { value: 'isNull', label: 'is empty' },
];

const spatialOps: OperatorOption[] = [
  { value: 's_intersects', label: 'intersects selection' },
  { value: 's_within', label: 'within selection' },
  { value: 's_dwithin', label: 'within distance of selection' },
];

const operatorsByType: Record<string, OperatorOption[]> = {
  string: stringOps,
  integer: numericOps,
  number: numericOps,
  'date-time': datetimeOps,
  geometry: spatialOps,
};

export function getOperatorsForType(propertyType?: string, format?: string): OperatorOption[] {
  if (format === 'date-time') return datetimeOps;
  if (propertyType && operatorsByType[propertyType]) return operatorsByType[propertyType];
  return stringOps; // fallback
}

export function isSpatialOperator(op: FilterOperator): boolean {
  return op === 's_intersects' || op === 's_within' || op === 's_dwithin';
}

export function getDefaultValue(operator: FilterOperator): FilterRuleValue {
  switch (operator) {
    case 'isNull':
      return { kind: 'static', value: null };
    case 'between':
      return { kind: 'static', value: { lower: 0, upper: 100 } };
    case 't_during':
      return { kind: 'static', value: { start: '', end: '' } };
    case 'in':
      return { kind: 'static', value: [] };
    case 's_intersects':
    case 's_within':
    case 's_dwithin':
      return { kind: 'static', value: null };
    case '>':
    case '>=':
    case '<':
    case '<=':
      return { kind: 'static', value: 0 };
    default:
      return { kind: 'static', value: '' };
  }
}
