import { describe, it, expect } from 'vitest';
import { propertyFiltersToCql2, type PropertyFilter } from '../propertyFilters';

describe('propertyFiltersToCql2', () => {
  const countriesFilters: PropertyFilter[] = [
    { id: '1', layerId: 'countries', property: 'continent', value: 'Africa' },
    { id: '2', layerId: 'countries', property: 'name', value: 'Kenya' },
  ];
  const citiesFilters: PropertyFilter[] = [
    { id: '3', layerId: 'cities', property: 'country', value: 'Kenya' },
  ];

  it('returns null when no filters match the layer', () => {
    expect(propertyFiltersToCql2(citiesFilters, 'countries')).toBeNull();
  });

  it('returns null when the filter list is empty', () => {
    expect(propertyFiltersToCql2([], 'countries')).toBeNull();
  });

  it('skips rows with empty property or empty value', () => {
    const draftRows: PropertyFilter[] = [
      { id: 'a', layerId: 'countries', property: '', value: 'Africa' },
      { id: 'b', layerId: 'countries', property: 'continent', value: '' },
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
});
