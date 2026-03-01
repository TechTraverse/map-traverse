import { describe, it, expect } from 'vitest';
import {
  isExpression,
  expressionType,
  expressionColors,
  expressionEntries,
} from '../expressionColors';

describe('isExpression', () => {
  it('returns true for arrays', () => {
    expect(isExpression(['match', ['get', 'x'], 'a', '#fff', '#000'])).toBe(true);
  });

  it('returns false for strings', () => {
    expect(isExpression('#ff0000')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isExpression(undefined)).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(isExpression(42)).toBe(false);
  });
});

describe('expressionType', () => {
  it('returns "match" for match expressions', () => {
    expect(expressionType(['match', ['get', 'x'], 'a', '#fff', '#000'])).toBe('match');
  });

  it('returns "interpolate" for interpolate expressions', () => {
    expect(expressionType(['interpolate', ['linear'], ['get', 'x'], 0, '#fff', 1, '#000'])).toBe(
      'interpolate'
    );
  });

  it('returns null for unknown expression types', () => {
    expect(expressionType(['case', true, '#fff', '#000'])).toBe(null);
  });

  it('returns null for empty arrays', () => {
    expect(expressionType([])).toBe(null);
  });
});

describe('expressionColors', () => {
  it('extracts colors from match expression', () => {
    const expr = ['match', ['get', 'region'], 'Europe', '#4a90d9', 'Africa', '#e74c3c', '#95a5a6'];
    expect(expressionColors(expr)).toEqual(['#4a90d9', '#e74c3c', '#95a5a6']);
  });

  it('extracts colors from interpolate expression', () => {
    const expr = ['interpolate', ['linear'], ['get', 'pop'], 0, '#ffffcc', 100, '#253494'];
    expect(expressionColors(expr)).toEqual(['#ffffcc', '#253494']);
  });

  it('returns empty array for unknown expression types', () => {
    expect(expressionColors(['case', true, '#fff', '#000'])).toEqual([]);
  });

  it('handles single-category match expression', () => {
    const expr = ['match', ['get', 'x'], 'a', '#ff0000', '#000000'];
    expect(expressionColors(expr)).toEqual(['#ff0000', '#000000']);
  });

  it('returns empty array for empty expression', () => {
    expect(expressionColors([])).toEqual([]);
  });
});

describe('expressionEntries', () => {
  it('extracts label/color pairs from match expression', () => {
    const expr = ['match', ['get', 'region'], 'Europe', '#4a90d9', 'Africa', '#e74c3c', '#95a5a6'];
    expect(expressionEntries(expr)).toEqual([
      { label: 'Europe', color: '#4a90d9' },
      { label: 'Africa', color: '#e74c3c' },
      { label: 'Other', color: '#95a5a6' },
    ]);
  });

  it('extracts label/color pairs from interpolate expression', () => {
    const expr = [
      'interpolate',
      ['linear'],
      ['get', 'pop'],
      0, '#ffffcc',
      1000000, '#41b6c4',
      10000000, '#253494',
    ];
    expect(expressionEntries(expr)).toEqual([
      { label: '0', color: '#ffffcc' },
      { label: '1000000', color: '#41b6c4' },
      { label: '10000000', color: '#253494' },
    ]);
  });

  it('handles single-category match expression', () => {
    const expr = ['match', ['get', 'x'], 'only', '#ff0000', '#cccccc'];
    expect(expressionEntries(expr)).toEqual([
      { label: 'only', color: '#ff0000' },
      { label: 'Other', color: '#cccccc' },
    ]);
  });

  it('converts numeric match keys to strings', () => {
    const expr = ['match', ['get', 'code'], 1, '#ff0000', 2, '#00ff00', '#000000'];
    expect(expressionEntries(expr)).toEqual([
      { label: '1', color: '#ff0000' },
      { label: '2', color: '#00ff00' },
      { label: 'Other', color: '#000000' },
    ]);
  });

  it('returns empty array for unknown expression types', () => {
    expect(expressionEntries(['case', true, '#fff', '#000'])).toEqual([]);
  });

  it('returns empty array for empty expression', () => {
    expect(expressionEntries([])).toEqual([]);
  });
});
