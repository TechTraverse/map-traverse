import { describe, it, expect } from 'vitest';
import { extractQueryParameters, queryRequiresGeometry } from '../queryParameters';
import type { FilterRuleGroup, FilterRule } from '../../types';

function makeRule(overrides: Partial<FilterRule> & Pick<FilterRule, 'property' | 'operator'>): FilterRule {
  return { id: 'r1', value: { kind: 'static', value: '' }, ...overrides };
}

function makeGroup(rules: (FilterRule | FilterRuleGroup)[], combinator: 'and' | 'or' = 'and'): FilterRuleGroup {
  return { id: 'g1', combinator, rules };
}

describe('extractQueryParameters', () => {
  it('returns empty array for static-only rules', () => {
    const group = makeGroup([
      makeRule({ property: 'name', operator: '=', value: { kind: 'static', value: 'test' } }),
    ]);
    expect(extractQueryParameters(group)).toEqual([]);
  });

  it('extracts parameter value', () => {
    const group = makeGroup([
      makeRule({
        property: 'name', operator: '=',
        value: { kind: 'parameter', name: 'userName', label: 'User Name', inputType: 'text', default: 'default' },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'userName', label: 'User Name', inputType: 'text', default: 'default' },
    ]);
  });

  it('extracts computedRange baseParam and offsetAmount parameter', () => {
    const group = makeGroup([
      makeRule({
        property: 'price', operator: 'between',
        value: {
          kind: 'computedRange',
          baseParam: 'desiredPrice',
          baseLabel: 'Desired Price',
          offsetType: 'percentage',
          offsetAmount: { kind: 'parameter', name: 'pctRange', label: 'Range %', default: 20 },
        },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toHaveLength(2);
    expect(params[0]).toEqual({ name: 'desiredPrice', label: 'Desired Price', inputType: 'number' });
    expect(params[1]).toEqual({ name: 'pctRange', label: 'Range %', inputType: 'number', default: 20 });
  });

  it('extracts dateRange parameter endpoints', () => {
    const group = makeGroup([
      makeRule({
        property: 'sale_date', operator: 't_during',
        value: {
          kind: 'dateRange',
          start: { kind: 'parameter', name: 'startDate', label: 'Start Date' },
          end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
        },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'startDate', label: 'Start Date', inputType: 'date' },
    ]);
  });

  it('extracts relativeDate parameterized offset', () => {
    const group = makeGroup([
      makeRule({
        property: 'created', operator: 't_after',
        value: {
          kind: 'relativeDate', direction: 'past',
          offset: { kind: 'parameter', name: 'daysBack', label: 'Days Back', default: 30 },
          unit: 'days',
        },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'daysBack', label: 'Days Back', inputType: 'number', default: 30 },
    ]);
  });

  it('extracts parameterized spatial distance', () => {
    const group = makeGroup([
      makeRule({
        property: 'geom', operator: 's_dwithin',
        value: { kind: 'static', value: null },
        spatial: {
          distance: { kind: 'parameter', name: 'searchDist', label: 'Search Distance (ft)', default: 100 },
          units: 'feet',
        },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'searchDist', label: 'Search Distance (ft)', inputType: 'number', default: 100 },
    ]);
  });

  it('deduplicates by name', () => {
    const group = makeGroup([
      makeRule({
        id: 'r1', property: 'a', operator: '=',
        value: { kind: 'parameter', name: 'shared', label: 'Shared', inputType: 'text' },
      }),
      makeRule({
        id: 'r2', property: 'b', operator: '=',
        value: { kind: 'parameter', name: 'shared', label: 'Shared Again', inputType: 'number' },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe('shared');
  });

  it('recurses into nested groups', () => {
    const group = makeGroup([
      {
        id: 'g2', combinator: 'or' as const,
        rules: [
          makeRule({
            property: 'x', operator: '>',
            value: { kind: 'parameter', name: 'minX', label: 'Min X', inputType: 'number' },
          }),
        ],
      },
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'minX', label: 'Min X', inputType: 'number' },
    ]);
  });

  it('extracts dateRange with relativeDate offset parameter', () => {
    const group = makeGroup([
      makeRule({
        property: 'sale_date', operator: 't_during',
        value: {
          kind: 'dateRange',
          start: { kind: 'relativeDate', direction: 'past', offset: { kind: 'parameter', name: 'yearsBack', label: 'Years Back', default: 3 }, unit: 'years' },
          end: { kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 0 }, unit: 'days' },
        },
      }),
    ]);
    const params = extractQueryParameters(group);
    expect(params).toEqual([
      { name: 'yearsBack', label: 'Years Back', inputType: 'number', default: 3 },
    ]);
  });
});

describe('queryRequiresGeometry', () => {
  it('returns false for non-spatial rules', () => {
    const group = makeGroup([
      makeRule({ property: 'name', operator: '=' }),
    ]);
    expect(queryRequiresGeometry(group)).toBe(false);
  });

  it('returns true for s_intersects', () => {
    const group = makeGroup([
      makeRule({ property: 'geom', operator: 's_intersects' }),
    ]);
    expect(queryRequiresGeometry(group)).toBe(true);
  });

  it('returns true for s_dwithin', () => {
    const group = makeGroup([
      makeRule({ property: 'geom', operator: 's_dwithin' }),
    ]);
    expect(queryRequiresGeometry(group)).toBe(true);
  });

  it('returns true for s_within', () => {
    const group = makeGroup([
      makeRule({ property: 'geom', operator: 's_within' }),
    ]);
    expect(queryRequiresGeometry(group)).toBe(true);
  });

  it('detects spatial in nested groups', () => {
    const group = makeGroup([
      makeRule({ id: 'r1', property: 'name', operator: '=' }),
      {
        id: 'g2', combinator: 'and' as const,
        rules: [makeRule({ property: 'geom', operator: 's_intersects' })],
      },
    ]);
    expect(queryRequiresGeometry(group)).toBe(true);
  });
});
