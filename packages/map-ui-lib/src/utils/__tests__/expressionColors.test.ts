import { describe, it, expect } from 'vitest';
import {
  isExpression,
  expressionType,
  expressionColors,
  expressionEntries,
  expressionPropertyName,
  getPrimaryColor,
  getShapeForStyleType,
} from '../expressionColors';
import type { StyleConfig } from '../../types';

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

describe('expressionPropertyName', () => {
  it('extracts property from match expression', () => {
    const expr = ['match', ['get', 'region'], 'Europe', '#4a90d9', '#95a5a6'];
    expect(expressionPropertyName(expr)).toBe('region');
  });

  it('extracts property from interpolate expression', () => {
    const expr = ['interpolate', ['linear'], ['get', 'POP_EST'], 0, '#ffffcc', 1000000, '#253494'];
    expect(expressionPropertyName(expr)).toBe('POP_EST');
  });

  it('returns null for unsupported expression types', () => {
    expect(expressionPropertyName(['case', true, '#fff', '#000'])).toBe(null);
  });

  it('returns null when get expression is missing', () => {
    expect(expressionPropertyName(['match', 'not-an-array', 'a', '#fff', '#000'])).toBe(null);
  });

  it('returns null for empty expression', () => {
    expect(expressionPropertyName([])).toBe(null);
  });

  it('returns null when property is not a string', () => {
    expect(expressionPropertyName(['match', ['get', 42], 'a', '#fff', '#000'])).toBe(null);
  });
});

describe('getPrimaryColor', () => {
  it('returns fill-color for fill style', () => {
    const style: StyleConfig = { type: 'fill', paint: { 'fill-color': '#ff0000', 'fill-opacity': 1 } };
    expect(getPrimaryColor(style)).toBe('#ff0000');
  });

  it('returns line-color for line style', () => {
    const style: StyleConfig = { type: 'line', paint: { 'line-color': '#00ff00', 'line-width': 1, 'line-opacity': 1 } };
    expect(getPrimaryColor(style)).toBe('#00ff00');
  });

  it('returns circle-color for circle style', () => {
    const style: StyleConfig = { type: 'circle', paint: { 'circle-color': '#0000ff', 'circle-radius': 5, 'circle-opacity': 1 } };
    expect(getPrimaryColor(style)).toBe('#0000ff');
  });

  it('returns text-color for symbol style', () => {
    const style: StyleConfig = { type: 'symbol', paint: { 'text-color': '#abcdef' } };
    expect(getPrimaryColor(style)).toBe('#abcdef');
  });

  it('returns icon-color when text-color is absent for symbol style', () => {
    const style: StyleConfig = { type: 'symbol', paint: { 'icon-color': '#123456' } };
    expect(getPrimaryColor(style)).toBe('#123456');
  });

  it('returns expression array when fill-color is an expression', () => {
    const expr = ['match', ['get', 'type'], 'a', '#fff', '#000'];
    const style: StyleConfig = { type: 'fill', paint: { 'fill-color': expr, 'fill-opacity': 1 } };
    expect(getPrimaryColor(style)).toBe(expr);
  });

  it('returns fallback #000000 when color property is missing', () => {
    const style: StyleConfig = { type: 'symbol', paint: {} };
    expect(getPrimaryColor(style)).toBe('#000000');
  });
});

describe('getShapeForStyleType', () => {
  it('returns square for fill style', () => {
    const style: StyleConfig = { type: 'fill', paint: { 'fill-color': '#000', 'fill-opacity': 1 } };
    expect(getShapeForStyleType(style)).toBe('square');
  });

  it('returns line for line style', () => {
    const style: StyleConfig = { type: 'line', paint: { 'line-color': '#000', 'line-width': 1, 'line-opacity': 1 } };
    expect(getShapeForStyleType(style)).toBe('line');
  });

  it('returns circle for circle style', () => {
    const style: StyleConfig = { type: 'circle', paint: { 'circle-color': '#000', 'circle-radius': 5, 'circle-opacity': 1 } };
    expect(getShapeForStyleType(style)).toBe('circle');
  });

  it('returns circle for symbol style', () => {
    const style: StyleConfig = { type: 'symbol', paint: {} };
    expect(getShapeForStyleType(style)).toBe('circle');
  });
});
