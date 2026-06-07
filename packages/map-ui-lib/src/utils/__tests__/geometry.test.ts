import { describe, expect, it } from 'vitest';
import {
  coordinateListToGeometry,
  geometryToCoordinateList,
  isValidGeometry,
} from '../geometry';

describe('isValidGeometry', () => {
  it('accepts a valid Point', () => {
    expect(isValidGeometry({ type: 'Point', coordinates: [10, 20] })).toBe(true);
  });

  it('accepts boundary positions', () => {
    expect(isValidGeometry({ type: 'Point', coordinates: [-180, -90] })).toBe(true);
    expect(isValidGeometry({ type: 'Point', coordinates: [180, 90] })).toBe(true);
  });

  it('rejects out-of-range longitude / latitude', () => {
    expect(isValidGeometry({ type: 'Point', coordinates: [181, 0] })).toBe(false);
    expect(isValidGeometry({ type: 'Point', coordinates: [0, 91] })).toBe(false);
    expect(isValidGeometry({ type: 'Point', coordinates: [0, -91] })).toBe(false);
  });

  it('rejects non-numeric / non-finite positions', () => {
    expect(isValidGeometry({ type: 'Point', coordinates: ['a', 'b'] })).toBe(false);
    expect(isValidGeometry({ type: 'Point', coordinates: [NaN, 0] })).toBe(false);
    expect(isValidGeometry({ type: 'Point', coordinates: [0] })).toBe(false);
  });

  it('validates LineString (>= 2 positions)', () => {
    expect(isValidGeometry({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })).toBe(true);
    expect(isValidGeometry({ type: 'LineString', coordinates: [[0, 0]] })).toBe(false);
  });

  it('validates MultiPoint', () => {
    expect(isValidGeometry({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] })).toBe(true);
    expect(isValidGeometry({ type: 'MultiPoint', coordinates: [] })).toBe(false);
  });

  it('validates MultiLineString', () => {
    expect(
      isValidGeometry({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] }),
    ).toBe(true);
    expect(
      isValidGeometry({ type: 'MultiLineString', coordinates: [[[0, 0]]] }),
    ).toBe(false);
  });

  it('validates Polygon rings (closed, >= 4 positions)', () => {
    expect(
      isValidGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }),
    ).toBe(true);
  });

  it('rejects unclosed Polygon rings', () => {
    expect(
      isValidGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }),
    ).toBe(false);
  });

  it('rejects too-short Polygon rings', () => {
    expect(
      isValidGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] }),
    ).toBe(false);
  });

  it('validates MultiPolygon', () => {
    expect(
      isValidGeometry({
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]],
      }),
    ).toBe(true);
  });

  it('validates (possibly nested) GeometryCollection', () => {
    expect(
      isValidGeometry({
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [0, 0] },
          { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        ],
      }),
    ).toBe(true);
    expect(
      isValidGeometry({
        type: 'GeometryCollection',
        geometries: [{ type: 'Point', coordinates: [999, 0] }],
      }),
    ).toBe(false);
  });

  it('rejects unknown types and non-objects', () => {
    expect(isValidGeometry({ type: 'Wat', coordinates: [] })).toBe(false);
    expect(isValidGeometry(null)).toBe(false);
    expect(isValidGeometry(undefined)).toBe(false);
    expect(isValidGeometry('POINT (1 2)')).toBe(false);
    expect(isValidGeometry(42)).toBe(false);
  });
});

describe('geometryToCoordinateList', () => {
  it('flattens a Point', () => {
    expect(geometryToCoordinateList({ type: 'Point', coordinates: [1, 2] })).toEqual([[1, 2]]);
  });

  it('flattens a LineString', () => {
    expect(
      geometryToCoordinateList({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }),
    ).toEqual([[0, 0], [1, 1]]);
  });

  it('flattens a single-ring Polygon', () => {
    expect(
      geometryToCoordinateList({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
      }),
    ).toEqual([[0, 0], [1, 0], [1, 1], [0, 0]]);
  });

  it('returns null for a Polygon with holes', () => {
    expect(
      geometryToCoordinateList({
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 0]],
          [[2, 2], [4, 2], [4, 4], [2, 2]],
        ],
      }),
    ).toBeNull();
  });

  it('returns null for multi/collection types', () => {
    expect(geometryToCoordinateList({ type: 'MultiPolygon', coordinates: [] })).toBeNull();
    expect(geometryToCoordinateList({ type: 'MultiPoint', coordinates: [[0, 0]] })).toBeNull();
    expect(geometryToCoordinateList({ type: 'GeometryCollection', geometries: [] })).toBeNull();
    expect(geometryToCoordinateList(null)).toBeNull();
  });
});

describe('coordinateListToGeometry', () => {
  it('builds a Point from the first coordinate', () => {
    expect(coordinateListToGeometry([[1, 2], [3, 4]], 'Point')).toEqual({
      type: 'Point',
      coordinates: [1, 2],
    });
  });

  it('builds a LineString', () => {
    expect(coordinateListToGeometry([[0, 0], [1, 1]], 'LineString')).toEqual({
      type: 'LineString',
      coordinates: [[0, 0], [1, 1]],
    });
  });

  it('auto-closes a Polygon ring', () => {
    expect(coordinateListToGeometry([[0, 0], [1, 0], [1, 1]], 'Polygon')).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    });
  });

  it('leaves an already-closed Polygon ring intact', () => {
    expect(coordinateListToGeometry([[0, 0], [1, 0], [1, 1], [0, 0]], 'Polygon')).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    });
  });

  it('drops invalid coordinate rows before building', () => {
    expect(
      coordinateListToGeometry(
        [[0, 0], [NaN, 1] as unknown as number[], [1, 1], [2, 2]],
        'LineString',
      ),
    ).toEqual({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] });
  });

  it('returns null when too few coordinates for the kind', () => {
    expect(coordinateListToGeometry([], 'Point')).toBeNull();
    expect(coordinateListToGeometry([[0, 0]], 'LineString')).toBeNull();
    expect(coordinateListToGeometry([[0, 0], [1, 1]], 'Polygon')).toBeNull();
  });

  it('round-trips simple geometries through coordinate lists', () => {
    const point: GeoJSON.Geometry = { type: 'Point', coordinates: [5, 6] };
    expect(
      coordinateListToGeometry(geometryToCoordinateList(point)!, 'Point'),
    ).toEqual(point);

    const line: GeoJSON.Geometry = { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] };
    expect(
      coordinateListToGeometry(geometryToCoordinateList(line)!, 'LineString'),
    ).toEqual(line);

    const poly: GeoJSON.Geometry = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    };
    expect(
      coordinateListToGeometry(geometryToCoordinateList(poly)!, 'Polygon'),
    ).toEqual(poly);
  });
});
