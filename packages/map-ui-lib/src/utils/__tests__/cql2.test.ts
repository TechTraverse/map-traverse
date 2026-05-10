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
  fromFilterRuleGroup,
  buildCql2Query,
  baseCql2FilterFromLayer,
  mergeBaseAndActiveCql2Filters,
  resolveRelativeDate,
  serializeCql2,
  sIntersects,
  sDwithin,
} from '../cql2';
import type { CQL2Date, CQL2Timestamp } from '../cql2';
import type { SearchField, FilterRuleGroup, FilterRule, RelativeDateValue } from '../../types';

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

// ---------------------------------------------------------------------------
// fromFilterRuleGroup
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<FilterRule> & Pick<FilterRule, 'property' | 'operator'>): FilterRule {
  return {
    id: 'r1',
    value: { kind: 'static', value: '' },
    ...overrides,
  };
}

describe('fromFilterRuleGroup', () => {
  it('returns null for empty group', () => {
    const group: FilterRuleGroup = { id: 'g1', combinator: 'and', rules: [] };
    expect(fromFilterRuleGroup(group)).toBeNull();
  });

  it('converts single equality rule', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [makeRule({ property: 'name', operator: '=', value: { kind: 'static', value: 'France' } })],
    };
    expect(fromFilterRuleGroup(group)).toEqual(eq('name', 'France'));
  });

  it('combines multiple rules with AND', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({ id: 'r1', property: 'name', operator: '=', value: { kind: 'static', value: 'France' } }),
        makeRule({ id: 'r2', property: 'pop', operator: '>', value: { kind: 'static', value: 1000000 } }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(
      and(eq('name', 'France'), gt('pop', 1000000)),
    );
  });

  it('combines rules with OR', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'or',
      rules: [
        makeRule({ id: 'r1', property: 'name', operator: '=', value: { kind: 'static', value: 'France' } }),
        makeRule({ id: 'r2', property: 'name', operator: '=', value: { kind: 'static', value: 'Germany' } }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(
      or(eq('name', 'France'), eq('name', 'Germany')),
    );
  });

  it('handles nested groups', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({ id: 'r1', property: 'continent', operator: '=', value: { kind: 'static', value: 'Europe' } }),
        {
          id: 'g2',
          combinator: 'or',
          rules: [
            makeRule({ id: 'r2', property: 'name', operator: '=', value: { kind: 'static', value: 'France' } }),
            makeRule({ id: 'r3', property: 'name', operator: '=', value: { kind: 'static', value: 'Germany' } }),
          ],
        },
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(
      and(
        eq('continent', 'Europe'),
        or(eq('name', 'France'), eq('name', 'Germany')),
      ),
    );
  });

  it('converts all comparison operators', () => {
    const ops: Array<{ op: FilterRule['operator']; value: number; expected: ReturnType<typeof eq> }> = [
      { op: '<>', value: 5, expected: { op: '<>', args: [{ property: 'x' }, 5] } },
      { op: '>=', value: 10, expected: { op: '>=', args: [{ property: 'x' }, 10] } },
      { op: '<', value: 3, expected: { op: '<', args: [{ property: 'x' }, 3] } },
      { op: '<=', value: 7, expected: { op: '<=', args: [{ property: 'x' }, 7] } },
    ];
    for (const { op, value, expected } of ops) {
      const group: FilterRuleGroup = {
        id: 'g1', combinator: 'and',
        rules: [makeRule({ property: 'x', operator: op, value: { kind: 'static', value } })],
      };
      expect(fromFilterRuleGroup(group)).toEqual(expected);
    }
  });

  it('converts like operator with wildcards', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [makeRule({ property: 'name', operator: 'like', value: { kind: 'static', value: 'river' } })],
    };
    expect(fromFilterRuleGroup(group)).toEqual(like('name', '%river%'));
  });

  it('converts in operator', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [makeRule({ property: 'status', operator: 'in', value: { kind: 'static', value: ['active', 'pending'] } })],
    };
    expect(fromFilterRuleGroup(group)).toEqual(inList('status', ['active', 'pending']));
  });

  it('converts isNull operator', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [makeRule({ property: 'deleted_at', operator: 'isNull', value: { kind: 'static', value: null } })],
    };
    expect(fromFilterRuleGroup(group)).toEqual(isNull('deleted_at'));
  });

  it('converts between operator', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [makeRule({ property: 'pop', operator: 'between', value: { kind: 'static', value: { lower: 100, upper: 500 } } })],
    };
    expect(fromFilterRuleGroup(group)).toEqual(between('pop', 100, 500));
  });

  it('converts temporal operators', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({ id: 'r1', property: 'created', operator: 't_after', value: { kind: 'static', value: '2023-01-01T00:00:00Z' } }),
        makeRule({ id: 'r2', property: 'updated', operator: 't_before', value: { kind: 'static', value: '2024-12-31T23:59:59Z' } }),
        makeRule({ id: 'r3', property: 'range', operator: 't_during', value: { kind: 'static', value: { start: '2023-01-01T00:00:00Z', end: '2023-12-31T23:59:59Z' } } }),
      ],
    };
    const result = fromFilterRuleGroup(group);
    expect(result).toEqual(and(
      tAfter('created', { timestamp: '2023-01-01T00:00:00Z' }),
      tBefore('updated', { timestamp: '2024-12-31T23:59:59Z' }),
      tDuring('range', { timestamp: '2023-01-01T00:00:00Z' }, { timestamp: '2023-12-31T23:59:59Z' }),
    ));
  });

  it('converts spatial operators with selection geometry', () => {
    const geom = { type: 'Point', coordinates: [0, 0] };
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({ id: 'r1', property: 'geom', operator: 's_intersects', value: { kind: 'static', value: null } }),
      ],
    };
    expect(fromFilterRuleGroup(group, undefined, geom)).toEqual(sIntersects('geom', geom));
  });

  it('returns null for spatial operators without selection geometry', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({ property: 'geom', operator: 's_intersects', value: { kind: 'static', value: null } }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toBeNull();
  });

  it('converts s_dwithin with spatial config', () => {
    const geom = { type: 'Point', coordinates: [10, 20] };
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'geom', operator: 's_dwithin',
          value: { kind: 'static', value: null },
          spatial: { distance: 1000, units: 'meters' },
        }),
      ],
    };
    expect(fromFilterRuleGroup(group, undefined, geom)).toEqual(sDwithin('geom', geom, 1000, 'meters'));
  });

  it('resolves parameter values from params', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'name', operator: '=',
          value: { kind: 'parameter', name: 'userName', label: 'Name', inputType: 'text' },
        }),
      ],
    };
    expect(fromFilterRuleGroup(group, { userName: 'France' })).toEqual(eq('name', 'France'));
  });

  it('uses parameter default when param not provided', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'count', operator: '>',
          value: { kind: 'parameter', name: 'minCount', label: 'Min', inputType: 'number', default: 100 },
        }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(gt('count', 100));
  });

  it('uses placeholder string when parameter has no default and no param value', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'name', operator: '=',
          value: { kind: 'parameter', name: 'userName', label: 'Name', inputType: 'text' },
        }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(eq('name', '{{userName}}'));
  });

  it('converts s_dwithin with parameterized distance', () => {
    const geom = { type: 'Point', coordinates: [0, 0] };
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'geom', operator: 's_dwithin',
          value: { kind: 'static', value: null },
          spatial: {
            distance: { kind: 'parameter', name: 'dist', label: 'Distance', default: 500 },
            units: 'feet',
          },
        }),
      ],
    };
    // Without params, uses default
    expect(fromFilterRuleGroup(group, undefined, geom)).toEqual(sDwithin('geom', geom, 500, 'feet'));
    // With params
    expect(fromFilterRuleGroup(group, { dist: 1000 }, geom)).toEqual(sDwithin('geom', geom, 1000, 'feet'));
  });

  it('converts computedRange with percentage offset', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'price', operator: 'between',
          value: {
            kind: 'computedRange',
            baseParam: 'desiredPrice',
            baseLabel: 'Desired Price',
            offsetType: 'percentage',
            offsetAmount: { kind: 'static', value: 20 },
          },
        }),
      ],
    };
    // desiredPrice = 100, 20% → between(80, 120)
    const result = fromFilterRuleGroup(group, { desiredPrice: 100 });
    expect(result).toEqual(between('price', 80, 120));
  });

  it('converts computedRange with absolute offset', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'price', operator: 'between',
          value: {
            kind: 'computedRange',
            baseParam: 'desiredPrice',
            baseLabel: 'Price',
            offsetType: 'absolute',
            offsetAmount: { kind: 'static', value: 50 },
          },
        }),
      ],
    };
    const result = fromFilterRuleGroup(group, { desiredPrice: 200 });
    expect(result).toEqual(between('price', 150, 250));
  });

  it('converts computedRange with parameterized offset', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'price', operator: 'between',
          value: {
            kind: 'computedRange',
            baseParam: 'desiredPrice',
            baseLabel: 'Price',
            offsetType: 'percentage',
            offsetAmount: { kind: 'parameter', name: 'pctRange', label: 'Range %', default: 10 },
          },
        }),
      ],
    };
    // pctRange provided as 25, desiredPrice = 100
    const result = fromFilterRuleGroup(group, { desiredPrice: 100, pctRange: 25 });
    expect(result).toEqual(between('price', 75, 125));
  });

  it('converts dateRange with relative dates for t_during', () => {
    // "last 3 years to now"
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'sale_date', operator: 't_during',
          value: {
            kind: 'dateRange',
            start: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 3 }, unit: 'years' },
            end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
          },
        }),
      ],
    };
    // We can't easily control "now" inside fromFilterRuleGroup, so just verify structure
    const result = fromFilterRuleGroup(group);
    expect(result).not.toBeNull();
    expect(result!.op).toBe('t_during');
    expect(result!.args[0]).toEqual({ property: 'sale_date' });
    // The interval should have two timestamps
    const interval = result!.args[1] as { interval: [string, string] };
    expect(interval.interval).toHaveLength(2);
    // Start should be ~3 years ago, end should be ~now
    const startDate = new Date(interval.interval[0]);
    const endDate = new Date(interval.interval[1]);
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  });

  it('converts dateRange with parameterized offset', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'sale_date', operator: 't_during',
          value: {
            kind: 'dateRange',
            start: { kind: 'relativeDate', direction: 'past', offset: { kind: 'parameter', name: 'yearsBack', label: 'Years', default: 5 }, unit: 'years' },
            end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
          },
        }),
      ],
    };
    // Without params, uses default of 5
    const result = fromFilterRuleGroup(group);
    expect(result).not.toBeNull();
    expect(result!.op).toBe('t_during');
  });

  it('converts relativeDate value for t_after', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'created', operator: 't_after',
          value: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 30 }, unit: 'days' },
        }),
      ],
    };
    const result = fromFilterRuleGroup(group);
    expect(result).not.toBeNull();
    expect(result!.op).toBe('t_after');
    const ts = (result!.args[1] as { timestamp: string }).timestamp;
    const date = new Date(ts);
    // Should be approximately 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    expect(Math.abs(date.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(5000); // within 5 seconds
  });
});

// ---------------------------------------------------------------------------
// resolveRelativeDate
// ---------------------------------------------------------------------------

describe('resolveRelativeDate', () => {
  const now = new Date('2026-03-15T12:00:00Z');

  it('resolves past days', () => {
    const value: RelativeDateValue = { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 10 }, unit: 'days' };
    const result = resolveRelativeDate(value, undefined, now);
    const resultDate = new Date(result);
    // Check date components (DST can shift hours)
    expect(resultDate.getFullYear()).toBe(2026);
    expect(resultDate.getMonth()).toBe(2); // March = 2
    expect(resultDate.getDate()).toBe(5);
  });

  it('resolves past years', () => {
    const value: RelativeDateValue = { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 3 }, unit: 'years' };
    const result = resolveRelativeDate(value, undefined, now);
    expect(new Date(result).toISOString()).toBe('2023-03-15T12:00:00.000Z');
  });

  it('resolves future months', () => {
    const value: RelativeDateValue = { kind: 'relativeDate', direction: 'future', offset: { kind: 'static', value: 6 }, unit: 'months' };
    const result = resolveRelativeDate(value, undefined, now);
    expect(new Date(result).toISOString()).toBe('2026-09-15T12:00:00.000Z');
  });

  it('resolves parameterized offset from params', () => {
    const value: RelativeDateValue = { kind: 'relativeDate', direction: 'past', offset: { kind: 'parameter', name: 'years', label: 'Years', default: 1 }, unit: 'years' };
    const result = resolveRelativeDate(value, { years: 5 }, now);
    expect(new Date(result).toISOString()).toBe('2021-03-15T12:00:00.000Z');
  });

  it('uses default when param not provided', () => {
    const value: RelativeDateValue = { kind: 'relativeDate', direction: 'past', offset: { kind: 'parameter', name: 'years', label: 'Years', default: 2 }, unit: 'years' };
    const result = resolveRelativeDate(value, {}, now);
    expect(new Date(result).toISOString()).toBe('2024-03-15T12:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// buildCql2Query
// ---------------------------------------------------------------------------

describe('buildCql2Query', () => {
  it('returns filter with sort and limit', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({ property: 'name', operator: '=', value: { kind: 'static', value: 'test' } }),
      ],
      sortby: [{ property: 'distance', direction: 'asc' }],
      limit: 10,
    };
    const result = buildCql2Query(group);
    expect(result.filter).toEqual(eq('name', 'test'));
    expect(result.sortby).toEqual([{ property: 'distance', direction: 'asc' }]);
    expect(result.limit).toBe(10);
  });

  it('returns undefined sort/limit when not set', () => {
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [makeRule({ property: 'x', operator: '=', value: { kind: 'static', value: 1 } })],
    };
    const result = buildCql2Query(group);
    expect(result.filter).toEqual(eq('x', 1));
    expect(result.sortby).toBeUndefined();
    expect(result.limit).toBeUndefined();
  });

  it('handles full parcels-nearby use case', () => {
    const geom = { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] };
    const group: FilterRuleGroup = {
      id: 'g1', combinator: 'and',
      rules: [
        makeRule({
          property: 'geom', operator: 's_dwithin',
          value: { kind: 'static', value: null },
          spatial: {
            distance: { kind: 'parameter', name: 'distance', label: 'Distance (ft)', default: 100 },
            units: 'feet',
          },
        }),
      ],
      sortby: [{ property: 'distance', direction: 'asc' }],
      limit: 50,
    };
    const result = buildCql2Query(group, { distance: 500 }, geom);
    expect(result.filter).toEqual(sDwithin('geom', geom, 500, 'feet'));
    expect(result.sortby).toEqual([{ property: 'distance', direction: 'asc' }]);
    expect(result.limit).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// fromFilterRuleGroup edge cases
// ---------------------------------------------------------------------------

describe('fromFilterRuleGroup edge cases', () => {
  it('empty nested group — outer AND with one rule + inner empty group filters out inner', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({ property: 'name', operator: '=', value: { kind: 'static', value: 'France' } }),
        { id: 'g2', combinator: 'and', rules: [] },
      ],
    };
    // Inner empty group returns null, and() filters it out, leaving only the single rule unwrapped
    expect(fromFilterRuleGroup(group)).toEqual(eq('name', 'France'));
  });

  it('deeply nested (3 levels) — AND → OR → AND chain with rules at each level', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({ id: 'r1', property: 'continent', operator: '=', value: { kind: 'static', value: 'Europe' } }),
        {
          id: 'g2',
          combinator: 'or',
          rules: [
            makeRule({ id: 'r2', property: 'pop', operator: '>', value: { kind: 'static', value: 1000000 } }),
            {
              id: 'g3',
              combinator: 'and',
              rules: [
                makeRule({ id: 'r3', property: 'name', operator: 'like', value: { kind: 'static', value: 'land' } }),
                makeRule({ id: 'r4', property: 'status', operator: '=', value: { kind: 'static', value: 'active' } }),
              ],
            },
          ],
        },
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(
      and(
        eq('continent', 'Europe'),
        or(
          gt('pop', 1000000),
          and(like('name', '%land%'), eq('status', 'active')),
        ),
      ),
    );
  });

  it('s_dwithin with missing spatial property — distance defaults to 0', () => {
    const geom = { type: 'Point', coordinates: [10, 20] };
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({
          property: 'geom',
          operator: 's_dwithin',
          value: { kind: 'static', value: null },
          // no spatial property
        }),
      ],
    };
    expect(fromFilterRuleGroup(group, undefined, geom)).toEqual(sDwithin('geom', geom, 0, 'meters'));
  });

  it('computedRange with zero base value + percentage — between(0, 0)', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({
          property: 'price',
          operator: 'between',
          value: {
            kind: 'computedRange',
            baseParam: 'desiredPrice',
            baseLabel: 'Price',
            offsetType: 'percentage',
            offsetAmount: { kind: 'static', value: 20 },
          },
        }),
      ],
    };
    // base=0 (not provided in params, defaults to 0), 20% of 0 = 0 → between(0, 0)
    const result = fromFilterRuleGroup(group, { desiredPrice: 0 });
    expect(result).toEqual(between('price', 0, 0));
  });

  it('like with empty string value — produces like(prop, "%%")', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({ property: 'name', operator: 'like', value: { kind: 'static', value: '' } }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(like('name', '%%'));
  });

  it('between with lower > upper — still produces valid CQL2', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({
          property: 'pop',
          operator: 'between',
          value: { kind: 'static', value: { lower: 100, upper: 50 } },
        }),
      ],
    };
    expect(fromFilterRuleGroup(group)).toEqual(between('pop', 100, 50));
  });

  it('dateRange with parameter endpoint + provided param — uses the param value as timestamp', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({
          property: 'sale_date',
          operator: 't_during',
          value: {
            kind: 'dateRange',
            start: { kind: 'parameter', name: 'startDate', label: 'Start Date' },
            end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
          },
        }),
      ],
    };
    const result = fromFilterRuleGroup(group, { startDate: '2025-01-01T00:00:00Z' });
    expect(result).not.toBeNull();
    expect(result!.op).toBe('t_during');
    const interval = result!.args[1] as { interval: [string, string] };
    expect(interval.interval[0]).toBe('2025-01-01T00:00:00Z');
  });

  it('dateRange with parameter endpoint + missing param and no default — placeholder', () => {
    const group: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        makeRule({
          property: 'sale_date',
          operator: 't_during',
          value: {
            kind: 'dateRange',
            start: { kind: 'parameter', name: 'startDate', label: 'Start Date' },
            end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
          },
        }),
      ],
    };
    const result = fromFilterRuleGroup(group);
    expect(result).not.toBeNull();
    expect(result!.op).toBe('t_during');
    const interval = result!.args[1] as { interval: [string, string] };
    expect(interval.interval[0]).toBe('{{startDate}}');
  });
});

// ---------------------------------------------------------------------------
// resolveRelativeDate — additional edge cases
// ---------------------------------------------------------------------------

describe('resolveRelativeDate', () => {
  it('month overflow — Jan 31 minus 1 month produces Dec 31', () => {
    const now = new Date('2026-01-31T12:00:00Z');
    const value: RelativeDateValue = {
      kind: 'relativeDate',
      direction: 'past',
      offset: { kind: 'static', value: 1 },
      unit: 'months',
    };
    const result = resolveRelativeDate(value, undefined, now);
    const resultDate = new Date(result);
    expect(resultDate.getUTCFullYear()).toBe(2025);
    expect(resultDate.getUTCMonth()).toBe(11); // December = 11
    expect(resultDate.getUTCDate()).toBe(31);
  });

  it('future direction with days — 10 days in the future from a fixed now', () => {
    const now = new Date('2026-03-15T12:00:00Z');
    const value: RelativeDateValue = {
      kind: 'relativeDate',
      direction: 'future',
      offset: { kind: 'static', value: 10 },
      unit: 'days',
    };
    const result = resolveRelativeDate(value, undefined, now);
    const resultDate = new Date(result);
    expect(resultDate.getUTCFullYear()).toBe(2026);
    expect(resultDate.getUTCMonth()).toBe(2); // March = 2
    expect(resultDate.getUTCDate()).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// baseCql2FilterFromLayer + mergeBaseAndActiveCql2Filters
// ---------------------------------------------------------------------------

describe('baseCql2FilterFromLayer', () => {
  it('returns null when layer has no cql2Filter', () => {
    expect(baseCql2FilterFromLayer({})).toBe(null);
  });

  it('converts a single-rule FilterRuleGroup to a CQL2 expression', () => {
    const filter: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        { id: 'r1', property: 'abandoned', operator: '=', value: { kind: 'static', value: 'NO' } },
      ],
    };
    expect(baseCql2FilterFromLayer({ cql2Filter: filter })).toEqual(eq('abandoned', 'NO'));
  });

  it('combines multi-rule AND group correctly', () => {
    const filter: FilterRuleGroup = {
      id: 'g1',
      combinator: 'and',
      rules: [
        { id: 'r1', property: 'abandoned', operator: '=', value: { kind: 'static', value: 'NO' } },
        { id: 'r2', property: 'population', operator: '>', value: { kind: 'static', value: 1000 } },
      ],
    };
    expect(baseCql2FilterFromLayer({ cql2Filter: filter })).toEqual(
      and(eq('abandoned', 'NO'), gt('population', 1000)),
    );
  });
});

describe('mergeBaseAndActiveCql2Filters', () => {
  const layerWithBase = {
    id: 'towns',
    cql2Filter: {
      id: 'g1',
      combinator: 'and',
      rules: [
        { id: 'r1', property: 'abandoned', operator: '=', value: { kind: 'static', value: 'NO' } },
      ],
    } as FilterRuleGroup,
  };
  const layerNoBase = { id: 'parcels' };

  it('returns base filter when no active filter set', () => {
    const merged = mergeBaseAndActiveCql2Filters([layerWithBase, layerNoBase], {});
    expect(merged.towns).toEqual(eq('abandoned', 'NO'));
    expect(merged.parcels).toBeUndefined();
  });

  it('AND-merges base and active filters when both present', () => {
    const active = { towns: eq('legaldescr', 'main st') };
    const merged = mergeBaseAndActiveCql2Filters([layerWithBase], active);
    expect(merged.towns).toEqual(and(eq('abandoned', 'NO'), eq('legaldescr', 'main st')));
  });

  it('returns active-only filter when no base set', () => {
    const active = { parcels: eq('owner', 'Smith') };
    const merged = mergeBaseAndActiveCql2Filters([layerNoBase], active);
    expect(merged.parcels).toEqual(eq('owner', 'Smith'));
  });

  it('omits layers with neither base nor active so getVectorTileUrl stays unfiltered', () => {
    const merged = mergeBaseAndActiveCql2Filters([layerNoBase], {});
    expect(merged.parcels).toBeUndefined();
    expect(Object.keys(merged)).toHaveLength(0);
  });

  it('preserves active-only entries for layers not present in the layer array', () => {
    const active = { ghost: eq('foo', 'bar') };
    const merged = mergeBaseAndActiveCql2Filters([], active);
    expect(merged.ghost).toEqual(eq('foo', 'bar'));
  });

  it('treats null/undefined active as no-op', () => {
    const merged = mergeBaseAndActiveCql2Filters(
      [layerWithBase],
      { towns: null, parcels: undefined },
    );
    expect(merged.towns).toEqual(eq('abandoned', 'NO'));
    expect(merged.parcels).toBeUndefined();
  });
});
