import { describe, it, expect } from 'vitest';
import { propertyFiltersToCql2, type PropertyFilter } from '../propertyFilters';

describe('propertyFiltersToCql2', () => {
  const countriesFilters: PropertyFilter[] = [
    { id: '1', layerId: 'countries', property: 'continent', propertyType: 'string', value: 'Africa' },
    { id: '2', layerId: 'countries', property: 'name', propertyType: 'string', value: 'Kenya' },
  ];
  const citiesFilters: PropertyFilter[] = [
    { id: '3', layerId: 'cities', property: 'country', propertyType: 'string', value: 'Kenya' },
  ];

  it('returns null when no filters match the layer', () => {
    expect(propertyFiltersToCql2(citiesFilters, 'countries')).toBeNull();
  });

  it('returns null when the filter list is empty', () => {
    expect(propertyFiltersToCql2([], 'countries')).toBeNull();
  });

  it('skips rows with empty property or empty value', () => {
    const draftRows: PropertyFilter[] = [
      { id: 'a', layerId: 'countries', property: '', propertyType: 'string', value: 'Africa' },
      { id: 'b', layerId: 'countries', property: 'continent', propertyType: 'string', value: '' },
    ];
    expect(propertyFiltersToCql2(draftRows, 'countries')).toBeNull();
  });

  it('compiles a single-row layer to a bare eq expression', () => {
    const result = propertyFiltersToCql2(citiesFilters, 'cities');
    expect(result).toEqual({
      op: '=',
      args: [{ property: 'country' }, 'Kenya'],
    });
  });

  it('ANDs multiple rows for the same layer', () => {
    const result = propertyFiltersToCql2(countriesFilters, 'countries');
    expect(result).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'continent' }, 'Africa'] },
        { op: '=', args: [{ property: 'name' }, 'Kenya'] },
      ],
    });
  });

  it('ignores rows from other layers when compiling for a specific layerId', () => {
    const mixed = [...countriesFilters, ...citiesFilters];
    const result = propertyFiltersToCql2(mixed, 'cities');
    expect(result).toEqual({
      op: '=',
      args: [{ property: 'country' }, 'Kenya'],
    });
  });

  // --- Numeric filters ---

  it('compiles numeric eq filter', () => {
    const filters: PropertyFilter[] = [
      { id: 'n1', layerId: 'layer', property: 'pop', propertyType: 'number', value: { value: 1000, operator: 'eq' } },
    ];
    expect(propertyFiltersToCql2(filters, 'layer')).toEqual({
      op: '=', args: [{ property: 'pop' }, 1000],
    });
  });

  it('compiles numeric gt filter', () => {
    const filters: PropertyFilter[] = [
      { id: 'n2', layerId: 'layer', property: 'pop', propertyType: 'number', value: { value: 500, operator: 'gt' } },
    ];
    expect(propertyFiltersToCql2(filters, 'layer')).toEqual({
      op: '>', args: [{ property: 'pop' }, 500],
    });
  });

  it('compiles numeric lt filter', () => {
    const filters: PropertyFilter[] = [
      { id: 'n3', layerId: 'layer', property: 'pop', propertyType: 'number', value: { value: 100, operator: 'lt' } },
    ];
    expect(propertyFiltersToCql2(filters, 'layer')).toEqual({
      op: '<', args: [{ property: 'pop' }, 100],
    });
  });

  it('compiles numeric between filter', () => {
    const filters: PropertyFilter[] = [
      { id: 'n4', layerId: 'layer', property: 'pop', propertyType: 'number', value: { min: 100, max: 999 } },
    ];
    expect(propertyFiltersToCql2(filters, 'layer')).toEqual({
      op: 'and',
      args: [
        { op: '>=', args: [{ property: 'pop' }, 100] },
        { op: '<=', args: [{ property: 'pop' }, 999] },
      ],
    });
  });

  // --- Datetime filters ---

  it('compiles datetime range filter (both start and end)', () => {
    const filters: PropertyFilter[] = [
      {
        id: 'd1', layerId: 'events', property: 'created',
        propertyType: 'datetime',
        value: { start: '2024-01-01T00:00', end: '2024-12-31T23:59' },
      },
    ];
    expect(propertyFiltersToCql2(filters, 'events')).toEqual({
      op: 't_during',
      args: [
        { property: 'created' },
        { interval: ['2024-01-01T00:00', '2024-12-31T23:59'] },
      ],
    });
  });

  it('compiles datetime start-only filter', () => {
    const filters: PropertyFilter[] = [
      {
        id: 'd2', layerId: 'events', property: 'created',
        propertyType: 'datetime',
        value: { start: '2024-06-01T00:00', end: '' },
      },
    ];
    expect(propertyFiltersToCql2(filters, 'events')).toEqual({
      op: 't_after',
      args: [{ property: 'created' }, { timestamp: '2024-06-01T00:00' }],
    });
  });

  it('compiles datetime end-only filter', () => {
    const filters: PropertyFilter[] = [
      {
        id: 'd3', layerId: 'events', property: 'created',
        propertyType: 'datetime',
        value: { start: '', end: '2024-06-01T00:00' },
      },
    ];
    expect(propertyFiltersToCql2(filters, 'events')).toEqual({
      op: 't_before',
      args: [{ property: 'created' }, { timestamp: '2024-06-01T00:00' }],
    });
  });

  it('skips datetime filter with both start and end empty', () => {
    const filters: PropertyFilter[] = [
      {
        id: 'd4', layerId: 'events', property: 'created',
        propertyType: 'datetime',
        value: { start: '', end: '' },
      },
    ];
    expect(propertyFiltersToCql2(filters, 'events')).toBeNull();
  });

  // --- Mixed filters ---

  it('ANDs string, numeric, and datetime filters for the same layer', () => {
    const filters: PropertyFilter[] = [
      { id: 'm1', layerId: 'layer', property: 'name', propertyType: 'string', value: 'Test' },
      { id: 'm2', layerId: 'layer', property: 'count', propertyType: 'number', value: { value: 10, operator: 'gte' } },
      { id: 'm3', layerId: 'layer', property: 'date', propertyType: 'datetime', value: { start: '2024-01-01T00:00', end: '' } },
    ];
    const result = propertyFiltersToCql2(filters, 'layer');
    expect(result).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'name' }, 'Test'] },
        { op: '>=', args: [{ property: 'count' }, 10] },
        { op: 't_after', args: [{ property: 'date' }, { timestamp: '2024-01-01T00:00' }] },
      ],
    });
  });
});
