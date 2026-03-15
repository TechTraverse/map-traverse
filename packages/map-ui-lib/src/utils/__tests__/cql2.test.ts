import { describe, it, expect } from 'vitest';
import {
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  between,
  like,
  inList,
  isNull,
  and,
  or,
  not,
  tAfter,
  tBefore,
  tDuring,
  fromSimpleFilters,
  fromStructuredFilters,
  serializeCql2,
} from '../cql2';
import type { CQL2Date, CQL2Timestamp } from '../cql2';
import type { SearchField } from '../../types';

// ---------------------------------------------------------------------------
// Comparison builders
// ---------------------------------------------------------------------------

describe('eq', () => {
  it('returns = op with string value', () => {
    expect(eq('name', 'France')).toEqual({
      op: '=',
      args: [{ property: 'name' }, 'France'],
    });
  });

  it('returns = op with number value', () => {
    expect(eq('pop', 1000000)).toEqual({
      op: '=',
      args: [{ property: 'pop' }, 1000000],
    });
  });

  it('returns = op with CQL2Date value', () => {
    const d: CQL2Date = { date: '2023-01-01' };
    expect(eq('date_field', d)).toEqual({
      op: '=',
      args: [{ property: 'date_field' }, { date: '2023-01-01' }],
    });
  });

  it('returns = op with CQL2Timestamp value', () => {
    const ts: CQL2Timestamp = { timestamp: '2023-01-01T00:00:00Z' };
    expect(eq('ts_field', ts)).toEqual({
      op: '=',
      args: [{ property: 'ts_field' }, { timestamp: '2023-01-01T00:00:00Z' }],
    });
  });
});

describe('neq', () => {
  it('returns <> op', () => {
    expect(neq('name', 'France')).toEqual({
      op: '<>',
      args: [{ property: 'name' }, 'France'],
    });
  });
});

describe('gt', () => {
  it('returns > op', () => {
    expect(gt('pop', 100000)).toEqual({
      op: '>',
      args: [{ property: 'pop' }, 100000],
    });
  });
});

describe('gte', () => {
  it('returns >= op', () => {
    expect(gte('pop', 100000)).toEqual({
      op: '>=',
      args: [{ property: 'pop' }, 100000],
    });
  });
});

describe('lt', () => {
  it('returns < op', () => {
    expect(lt('pop', 100000)).toEqual({
      op: '<',
      args: [{ property: 'pop' }, 100000],
    });
  });
});

describe('lte', () => {
  it('returns <= op', () => {
    expect(lte('pop', 100000)).toEqual({
      op: '<=',
      args: [{ property: 'pop' }, 100000],
    });
  });
});

describe('between', () => {
  it('returns gte+lte AND expression (tipg/pygeofilter compat)', () => {
    expect(between('pop', 100, 500)).toEqual({
      op: 'and',
      args: [
        { op: '>=', args: [{ property: 'pop' }, 100] },
        { op: '<=', args: [{ property: 'pop' }, 500] },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Pattern / array builders
// ---------------------------------------------------------------------------

describe('like', () => {
  it('returns like op with wildcard pattern', () => {
    expect(like('name', '%Fra%')).toEqual({
      op: 'like',
      args: [{ property: 'name' }, '%Fra%'],
    });
  });
});

describe('inList', () => {
  it('returns in op with array of values', () => {
    expect(inList('continent', ['Africa', 'Asia'])).toEqual({
      op: 'in',
      args: [{ property: 'continent' }, ['Africa', 'Asia']],
    });
  });
});

describe('isNull', () => {
  it('returns isNull op', () => {
    expect(isNull('name')).toEqual({
      op: 'isNull',
      args: [{ property: 'name' }],
    });
  });
});

// ---------------------------------------------------------------------------
// Logical builders
// ---------------------------------------------------------------------------

describe('and', () => {
  const expr1 = eq('name', 'France');
  const expr2 = eq('continent', 'Europe');

  it('combines two expressions with and op', () => {
    expect(and(expr1, expr2)).toEqual({
      op: 'and',
      args: [expr1, expr2],
    });
  });

  it('returns null when all arguments are null', () => {
    expect(and(null, null, undefined)).toBeNull();
  });

  it('returns single expression unwrapped (no and wrapper)', () => {
    expect(and(expr1)).toEqual(expr1);
  });

  it('filters out null arguments', () => {
    expect(and(expr1, null, expr2)).toEqual({
      op: 'and',
      args: [expr1, expr2],
    });
  });
});

describe('or', () => {
  const expr1 = eq('name', 'France');
  const expr2 = eq('name', 'Germany');

  it('combines two expressions with or op', () => {
    expect(or(expr1, expr2)).toEqual({
      op: 'or',
      args: [expr1, expr2],
    });
  });

  it('returns null when all arguments are null', () => {
    expect(or(null, undefined)).toBeNull();
  });

  it('returns single expression unwrapped', () => {
    expect(or(expr1)).toEqual(expr1);
  });

  it('filters out null arguments', () => {
    expect(or(expr1, null, expr2)).toEqual({
      op: 'or',
      args: [expr1, expr2],
    });
  });
});

describe('not', () => {
  it('wraps expression with not op', () => {
    const expr = eq('name', 'France');
    expect(not(expr)).toEqual({
      op: 'not',
      args: [expr],
    });
  });
});

// ---------------------------------------------------------------------------
// Temporal builders
// ---------------------------------------------------------------------------

describe('tAfter', () => {
  it('returns t_after with date literal', () => {
    const d: CQL2Date = { date: '2023-01-01' };
    expect(tAfter('datetime', d)).toEqual({
      op: 't_after',
      args: [{ property: 'datetime' }, { date: '2023-01-01' }],
    });
  });
});

describe('tBefore', () => {
  it('returns t_before with timestamp literal', () => {
    const ts: CQL2Timestamp = { timestamp: '2023-12-31T23:59:59Z' };
    expect(tBefore('datetime', ts)).toEqual({
      op: 't_before',
      args: [{ property: 'datetime' }, { timestamp: '2023-12-31T23:59:59Z' }],
    });
  });
});

describe('tDuring', () => {
  it('returns t_during with interval structure from date literals', () => {
    const start: CQL2Date = { date: '2023-01-01' };
    const end: CQL2Date = { date: '2023-12-31' };
    expect(tDuring('datetime', start, end)).toEqual({
      op: 't_during',
      args: [{ property: 'datetime' }, { interval: ['2023-01-01', '2023-12-31'] }],
    });
  });

  it('returns t_during with interval from timestamp literals', () => {
    const start: CQL2Timestamp = { timestamp: '2023-01-01T00:00:00Z' };
    const end: CQL2Timestamp = { timestamp: '2023-12-31T23:59:59Z' };
    expect(tDuring('datetime', start, end)).toEqual({
      op: 't_during',
      args: [{ property: 'datetime' }, { interval: ['2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z'] }],
    });
  });
});

// ---------------------------------------------------------------------------
// fromSimpleFilters
// ---------------------------------------------------------------------------

describe('fromSimpleFilters', () => {
  it('converts key-value record to AND of eq expressions', () => {
    const result = fromSimpleFilters({ name: 'France', continent: 'Europe' });
    expect(result).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'name' }, 'France'] },
        { op: '=', args: [{ property: 'continent' }, 'Europe'] },
      ],
    });
  });

  it('returns null for empty record', () => {
    expect(fromSimpleFilters({})).toBeNull();
  });

  it('skips empty string values', () => {
    const result = fromSimpleFilters({ name: 'France', continent: '' });
    expect(result).toEqual({ op: '=', args: [{ property: 'name' }, 'France'] });
  });

  it('returns single eq expression (unwrapped) for one entry', () => {
    const result = fromSimpleFilters({ name: 'France' });
    expect(result).toEqual({ op: '=', args: [{ property: 'name' }, 'France'] });
  });
});

// ---------------------------------------------------------------------------
// fromStructuredFilters
// ---------------------------------------------------------------------------

const textField: SearchField = { property: 'name', label: 'Name', type: 'text', autocomplete: false };
const datetimeField: SearchField = { property: 'datetime', label: 'Date', type: 'datetime', range: false };
const numberField: SearchField = { property: 'pop', label: 'Population', type: 'number', inputMode: 'input', operator: 'eq' };

describe('fromStructuredFilters', () => {
  it('converts plain string to eq', () => {
    const result = fromStructuredFilters({ name: 'France' }, [textField]);
    expect(result).toEqual({ op: '=', args: [{ property: 'name' }, 'France'] });
  });

  it('converts plain number to eq', () => {
    const result = fromStructuredFilters({ pop: 1000000 }, [numberField]);
    expect(result).toEqual({ op: '=', args: [{ property: 'pop' }, 1000000] });
  });

  it('converts { value, operator } with gt', () => {
    const result = fromStructuredFilters({ pop: { value: 500000, operator: 'gt' } }, [numberField]);
    expect(result).toEqual({ op: '>', args: [{ property: 'pop' }, 500000] });
  });

  it('converts { value, operator } with lte', () => {
    const result = fromStructuredFilters({ pop: { value: 100000, operator: 'lte' } }, [numberField]);
    expect(result).toEqual({ op: '<=', args: [{ property: 'pop' }, 100000] });
  });

  it('converts { min, max } to gte+lte AND expression', () => {
    const result = fromStructuredFilters({ pop: { min: 100, max: 500 } }, [numberField]);
    expect(result).toEqual({
      op: 'and',
      args: [
        { op: '>=', args: [{ property: 'pop' }, 100] },
        { op: '<=', args: [{ property: 'pop' }, 500] },
      ],
    });
  });

  it('converts { start, end } to tDuring', () => {
    const result = fromStructuredFilters(
      { datetime: { start: '2023-01-01T00:00:00Z', end: '2023-12-31T23:59:59Z' } },
      [datetimeField],
    );
    expect(result).toEqual({
      op: 't_during',
      args: [
        { property: 'datetime' },
        { interval: ['2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z'] },
      ],
    });
  });

  it('converts { start } only to tAfter', () => {
    const result = fromStructuredFilters(
      { datetime: { start: '2023-01-01T00:00:00Z', end: '' } },
      [datetimeField],
    );
    expect(result).toEqual({
      op: 't_after',
      args: [{ property: 'datetime' }, { timestamp: '2023-01-01T00:00:00Z' }],
    });
  });

  it('converts { end } only to tBefore', () => {
    const result = fromStructuredFilters(
      { datetime: { start: '', end: '2023-12-31T23:59:59Z' } },
      [datetimeField],
    );
    expect(result).toEqual({
      op: 't_before',
      args: [{ property: 'datetime' }, { timestamp: '2023-12-31T23:59:59Z' }],
    });
  });

  it('converts datetime string field to timestamp eq', () => {
    const result = fromStructuredFilters({ datetime: '2023-06-15T12:00:00Z' }, [datetimeField]);
    expect(result).toEqual({
      op: '=',
      args: [{ property: 'datetime' }, { timestamp: '2023-06-15T12:00:00Z' }],
    });
  });

  it('returns null for empty filters', () => {
    expect(fromStructuredFilters({}, [])).toBeNull();
  });

  it('skips undefined values', () => {
    const result = fromStructuredFilters({ name: undefined, pop: 100 }, [textField, numberField]);
    expect(result).toEqual({ op: '=', args: [{ property: 'pop' }, 100] });
  });
});

// ---------------------------------------------------------------------------
// serializeCql2
// ---------------------------------------------------------------------------

describe('serializeCql2', () => {
  it('serializes expression to JSON string', () => {
    const expr = eq('name', 'France');
    expect(serializeCql2(expr)).toBe(JSON.stringify(expr));
  });
});
