import { describe, expect, it } from 'vitest';
import { geojsonGeometryToWkt, wktToGeojsonGeometry } from '../wkt';

describe('wktToGeojsonGeometry', () => {
  it('parses Point', () => {
    expect(wktToGeojsonGeometry('POINT (1 2)')).toEqual({ type: 'Point', coordinates: [1, 2] });
  });

  it('parses negative / decimal Point', () => {
    expect(wktToGeojsonGeometry('POINT (-74.006 40.7128)')).toEqual({
      type: 'Point',
      coordinates: [-74.006, 40.7128],
    });
  });

  it('parses MultiPoint in parenthesized member form', () => {
    expect(wktToGeojsonGeometry('MULTIPOINT ((1 2), (3 4))')).toEqual({
      type: 'MultiPoint',
      coordinates: [[1, 2], [3, 4]],
    });
  });

  it('parses MultiPoint in bare member form', () => {
    expect(wktToGeojsonGeometry('MULTIPOINT (1 2, 3 4)')).toEqual({
      type: 'MultiPoint',
      coordinates: [[1, 2], [3, 4]],
    });
  });

  it('parses LineString', () => {
    expect(wktToGeojsonGeometry('LINESTRING (0 0, 1 1, 2 2)')).toEqual({
      type: 'LineString',
      coordinates: [[0, 0], [1, 1], [2, 2]],
    });
  });

  it('parses MultiLineString', () => {
    expect(wktToGeojsonGeometry('MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))')).toEqual({
      type: 'MultiLineString',
      coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
    });
  });

  it('parses Polygon', () => {
    expect(wktToGeojsonGeometry('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    });
  });

  it('parses Polygon with a hole', () => {
    expect(
      wktToGeojsonGeometry(
        'POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 4 2, 4 4, 2 4, 2 2))',
      ),
    ).toEqual({
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
      ],
    });
  });

  it('parses MultiPolygon', () => {
    expect(
      wktToGeojsonGeometry('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)), ((2 2, 3 2, 3 3, 2 2)))'),
    ).toEqual({
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[2, 2], [3, 2], [3, 3], [2, 2]]],
      ],
    });
  });

  it('parses GeometryCollection', () => {
    expect(
      wktToGeojsonGeometry('GEOMETRYCOLLECTION (POINT (0 0), LINESTRING (0 0, 1 1))'),
    ).toEqual({
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [0, 0] },
        { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      ],
    });
  });

  it('parses nested GeometryCollection', () => {
    expect(
      wktToGeojsonGeometry(
        'GEOMETRYCOLLECTION (POINT (0 0), GEOMETRYCOLLECTION (POINT (1 1), LINESTRING (2 2, 3 3)))',
      ),
    ).toEqual({
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [0, 0] },
        {
          type: 'GeometryCollection',
          geometries: [
            { type: 'Point', coordinates: [1, 1] },
            { type: 'LineString', coordinates: [[2, 2], [3, 3]] },
          ],
        },
      ],
    });
  });

  it('is case-insensitive for keywords', () => {
    expect(wktToGeojsonGeometry('point (1 2)')).toEqual({ type: 'Point', coordinates: [1, 2] });
    expect(wktToGeojsonGeometry('Polygon ((0 0, 1 0, 1 1, 0 0))')).toEqual({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
    });
  });

  it('tolerates extra / irregular whitespace', () => {
    expect(wktToGeojsonGeometry('  POINT(1    2)  ')).toEqual({ type: 'Point', coordinates: [1, 2] });
    expect(wktToGeojsonGeometry('LINESTRING(0 0,1 1)')).toEqual({
      type: 'LineString',
      coordinates: [[0, 0], [1, 1]],
    });
  });

  it('parses EMPTY geometries to empty coordinates', () => {
    expect(wktToGeojsonGeometry('POINT EMPTY')).toEqual({ type: 'Point', coordinates: [] });
    expect(wktToGeojsonGeometry('LINESTRING EMPTY')).toEqual({
      type: 'LineString',
      coordinates: [],
    });
    expect(wktToGeojsonGeometry('POLYGON EMPTY')).toEqual({ type: 'Polygon', coordinates: [] });
    expect(wktToGeojsonGeometry('GEOMETRYCOLLECTION EMPTY')).toEqual({
      type: 'GeometryCollection',
      geometries: [],
    });
  });

  describe('malformed inputs return null (never throw)', () => {
    const bad = [
      '',
      '   ',
      'NONSENSE',
      'POINT',
      'POINT (1)',
      'POINT (1 2',
      'POINT 1 2)',
      'POINT (1 2) trailing',
      'LINESTRING ()',
      'POLYGON (0 0, 1 1)',
      'MULTIPOLYGON ((0 0))',
      'GEOMETRYCOLLECTION (POINT)',
      'POINT (a b)',
    ];
    for (const w of bad) {
      it(`returns null for ${JSON.stringify(w)}`, () => {
        expect(wktToGeojsonGeometry(w)).toBeNull();
      });
    }

    it('returns null for non-string input', () => {
      // @ts-expect-error testing runtime tolerance
      expect(wktToGeojsonGeometry(null)).toBeNull();
      // @ts-expect-error testing runtime tolerance
      expect(wktToGeojsonGeometry(undefined)).toBeNull();
      // @ts-expect-error testing runtime tolerance
      expect(wktToGeojsonGeometry(42)).toBeNull();
    });
  });

  describe('round-trip geojson -> wkt -> geojson', () => {
    const samples: GeoJSON.Geometry[] = [
      { type: 'Point', coordinates: [1, 2] },
      { type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] },
      { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 2]] },
      { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] },
      { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
          [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
        ],
      },
      {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 0]]],
          [[[2, 2], [3, 2], [3, 3], [2, 2]]],
        ],
      },
      {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [0, 0] },
          { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        ],
      },
    ];
    for (const g of samples) {
      it(`round-trips ${g.type}`, () => {
        const wkt = geojsonGeometryToWkt(g);
        expect(wktToGeojsonGeometry(wkt)).toEqual(g);
      });
    }
  });
});
