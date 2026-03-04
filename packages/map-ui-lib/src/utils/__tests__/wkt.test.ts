import { describe, expect, it } from 'vitest';
import { geojsonGeometryToWkt } from '../wkt';

describe('geojsonGeometryToWkt', () => {
  it('converts Point', () => {
    expect(geojsonGeometryToWkt({ type: 'Point', coordinates: [1, 2] })).toBe('POINT (1 2)');
  });

  it('converts MultiPoint', () => {
    expect(
      geojsonGeometryToWkt({ type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] }),
    ).toBe('MULTIPOINT ((1 2), (3 4))');
  });

  it('converts LineString', () => {
    expect(
      geojsonGeometryToWkt({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] }),
    ).toBe('LINESTRING (0 0, 1 1, 2 2)');
  });

  it('converts MultiLineString', () => {
    expect(
      geojsonGeometryToWkt({
        type: 'MultiLineString',
        coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
      }),
    ).toBe('MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))');
  });

  it('converts Polygon', () => {
    expect(
      geojsonGeometryToWkt({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }),
    ).toBe('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))');
  });

  it('converts Polygon with hole', () => {
    expect(
      geojsonGeometryToWkt({
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
          [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
        ],
      }),
    ).toBe('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 4 2, 4 4, 2 4, 2 2))');
  });

  it('converts MultiPolygon', () => {
    expect(
      geojsonGeometryToWkt({
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 0]]],
          [[[2, 2], [3, 2], [3, 3], [2, 2]]],
        ],
      }),
    ).toBe('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)), ((2 2, 3 2, 3 3, 2 2)))');
  });

  it('converts GeometryCollection', () => {
    expect(
      geojsonGeometryToWkt({
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [0, 0] },
          { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        ],
      }),
    ).toBe('GEOMETRYCOLLECTION (POINT (0 0), LINESTRING (0 0, 1 1))');
  });

  it('returns empty string for null', () => {
    expect(geojsonGeometryToWkt(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(geojsonGeometryToWkt(undefined)).toBe('');
  });

  it('returns empty string for unknown type', () => {
    expect(geojsonGeometryToWkt({ type: 'Unknown', coordinates: [] })).toBe('');
  });
});
