import { describe, it, expect } from 'vitest';
import {
  getOperatorsForType,
  isSpatialOperator,
  getDefaultValue,
} from '../operatorOptions';

describe('getOperatorsForType', () => {
  it('returns string operators for "string" type', () => {
    const ops = getOperatorsForType('string');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', 'like', 'in', 'isNull']);
  });

  it('returns numeric operators for "integer" type', () => {
    const ops = getOperatorsForType('integer');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', '>', '>=', '<', '<=', 'between', 'isNull']);
  });

  it('returns numeric operators for "number" type', () => {
    const ops = getOperatorsForType('number');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', '>', '>=', '<', '<=', 'between', 'isNull']);
  });

  it('returns datetime operators for "date-time" propertyType', () => {
    const ops = getOperatorsForType('date-time');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', 't_after', 't_before', 't_during', 'isNull']);
  });

  it('returns spatial operators for "geometry" type', () => {
    const ops = getOperatorsForType('geometry');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['s_intersects', 's_within', 's_dwithin']);
  });

  it('returns datetime operators when format is "date-time" regardless of propertyType', () => {
    const ops = getOperatorsForType('string', 'date-time');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', 't_after', 't_before', 't_during', 'isNull']);
  });

  it('falls back to string operators for unknown type', () => {
    const ops = getOperatorsForType('boolean');
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', 'like', 'in', 'isNull']);
  });

  it('falls back to string operators when no type is provided', () => {
    const ops = getOperatorsForType();
    const values = ops.map((o) => o.value);
    expect(values).toEqual(['=', '<>', 'like', 'in', 'isNull']);
  });

  it('returns OperatorOption objects with value and label', () => {
    const ops = getOperatorsForType('string');
    for (const op of ops) {
      expect(op).toHaveProperty('value');
      expect(op).toHaveProperty('label');
      expect(typeof op.value).toBe('string');
      expect(typeof op.label).toBe('string');
    }
  });
});

describe('isSpatialOperator', () => {
  it('returns true for s_intersects', () => {
    expect(isSpatialOperator('s_intersects')).toBe(true);
  });

  it('returns true for s_within', () => {
    expect(isSpatialOperator('s_within')).toBe(true);
  });

  it('returns true for s_dwithin', () => {
    expect(isSpatialOperator('s_dwithin')).toBe(true);
  });

  it('returns false for non-spatial operators', () => {
    expect(isSpatialOperator('=')).toBe(false);
    expect(isSpatialOperator('<>')).toBe(false);
    expect(isSpatialOperator('like')).toBe(false);
    expect(isSpatialOperator('in')).toBe(false);
    expect(isSpatialOperator('isNull')).toBe(false);
    expect(isSpatialOperator('between')).toBe(false);
    expect(isSpatialOperator('t_after')).toBe(false);
    expect(isSpatialOperator('t_before')).toBe(false);
    expect(isSpatialOperator('t_during')).toBe(false);
  });
});

describe('getDefaultValue', () => {
  it('returns null value for isNull operator', () => {
    expect(getDefaultValue('isNull')).toEqual({ kind: 'static', value: null });
  });

  it('returns lower/upper range for between operator', () => {
    expect(getDefaultValue('between')).toEqual({
      kind: 'static',
      value: { lower: 0, upper: 100 },
    });
  });

  it('returns start/end range for t_during operator', () => {
    expect(getDefaultValue('t_during')).toEqual({
      kind: 'static',
      value: { start: '', end: '' },
    });
  });

  it('returns empty array for in operator', () => {
    expect(getDefaultValue('in')).toEqual({ kind: 'static', value: [] });
  });

  it('returns null value for spatial operators', () => {
    expect(getDefaultValue('s_intersects')).toEqual({ kind: 'static', value: null });
    expect(getDefaultValue('s_within')).toEqual({ kind: 'static', value: null });
    expect(getDefaultValue('s_dwithin')).toEqual({ kind: 'static', value: null });
  });

  it('returns 0 for comparison operators', () => {
    expect(getDefaultValue('>')).toEqual({ kind: 'static', value: 0 });
    expect(getDefaultValue('>=')).toEqual({ kind: 'static', value: 0 });
    expect(getDefaultValue('<')).toEqual({ kind: 'static', value: 0 });
    expect(getDefaultValue('<=')).toEqual({ kind: 'static', value: 0 });
  });

  it('returns empty string for default/equals operators', () => {
    expect(getDefaultValue('=')).toEqual({ kind: 'static', value: '' });
    expect(getDefaultValue('<>')).toEqual({ kind: 'static', value: '' });
    expect(getDefaultValue('like')).toEqual({ kind: 'static', value: '' });
  });

  it('always returns an object with kind "static"', () => {
    const operators = [
      '=', '<>', 'like', 'in', 'isNull', 'between',
      '>', '>=', '<', '<=',
      't_after', 't_before', 't_during',
      's_intersects', 's_within', 's_dwithin',
    ] as const;
    for (const op of operators) {
      expect(getDefaultValue(op)).toHaveProperty('kind', 'static');
    }
  });
});
