import { describe, it, expect } from 'vitest';
import { formatCellValue, compareValues, applyColumnOrder } from '../tableUtils';

describe('formatCellValue', () => {
  it('returns "--" for null and undefined', () => {
    expect(formatCellValue(null)).toBe('--');
    expect(formatCellValue(undefined)).toBe('--');
  });

  it('formats booleans as Yes/No', () => {
    expect(formatCellValue(true)).toBe('Yes');
    expect(formatCellValue(false)).toBe('No');
  });

  it('stringifies objects', () => {
    expect(formatCellValue({ a: 1 })).toBe('{"a":1}');
    expect(formatCellValue([1, 2])).toBe('[1,2]');
  });

  it('converts numbers and strings to string', () => {
    expect(formatCellValue(42)).toBe('42');
    expect(formatCellValue('hello')).toBe('hello');
  });
});

describe('compareValues', () => {
  it('treats two nulls as equal', () => {
    expect(compareValues(null, null)).toBe(0);
    expect(compareValues(undefined, undefined)).toBe(0);
  });

  it('sorts null before non-null', () => {
    expect(compareValues(null, 'a')).toBeLessThan(0);
    expect(compareValues('a', null)).toBeGreaterThan(0);
  });

  it('compares numbers numerically', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(10, 3)).toBeGreaterThan(0);
    expect(compareValues(5, 5)).toBe(0);
  });

  it('compares numeric strings numerically', () => {
    expect(compareValues('10', '3')).toBeGreaterThan(0);
    expect(compareValues('2', '10')).toBeLessThan(0);
  });

  it('compares non-numeric strings lexicographically', () => {
    expect(compareValues('apple', 'banana')).toBeLessThan(0);
    expect(compareValues('banana', 'apple')).toBeGreaterThan(0);
    expect(compareValues('same', 'same')).toBe(0);
  });

  it('handles mixed types gracefully', () => {
    // Non-numeric string vs number → string comparison
    expect(compareValues('abc', 123)).not.toBeNaN();
  });
});

describe('applyColumnOrder', () => {
  const base = ['name', 'age', 'city', 'email'];

  it('returns base columns when no order is provided', () => {
    expect(applyColumnOrder(base, undefined)).toEqual(base);
    expect(applyColumnOrder(base, [])).toEqual(base);
  });

  it('reorders columns according to the given order', () => {
    expect(applyColumnOrder(base, ['city', 'name', 'age', 'email'])).toEqual([
      'city',
      'name',
      'age',
      'email',
    ]);
  });

  it('ignores unknown columns in the order', () => {
    expect(applyColumnOrder(base, ['gone', 'city', 'name'])).toEqual([
      'city',
      'name',
      'age',
      'email',
    ]);
  });

  it('appends new base columns not in the order', () => {
    expect(applyColumnOrder(base, ['age', 'name'])).toEqual([
      'age',
      'name',
      'city',
      'email',
    ]);
  });

  it('handles completely disjoint order (all unknown)', () => {
    expect(applyColumnOrder(base, ['x', 'y', 'z'])).toEqual(base);
  });
});
