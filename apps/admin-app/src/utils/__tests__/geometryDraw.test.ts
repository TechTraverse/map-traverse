import { describe, it, expect } from 'vitest';
import {
  drawModeForGeometry,
  defaultDrawMode,
  featuresToGeometry,
  geometryToDrawFeatures,
} from '../geometryDraw';

const point: GeoJSON.Point = { type: 'Point', coordinates: [-105, 39] };
const line: GeoJSON.LineString = { type: 'LineString', coordinates: [[0, 0], [1, 1]] };
const poly: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
};
const multipoly: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]],
};

function feat(geometry: GeoJSON.Geometry): GeoJSON.Feature {
  return { type: 'Feature', properties: {}, geometry };
}

describe('drawModeForGeometry', () => {
  it('maps simple types to terra-draw modes', () => {
    expect(drawModeForGeometry(point)).toBe('point');
    expect(drawModeForGeometry(line)).toBe('linestring');
    expect(drawModeForGeometry(poly)).toBe('polygon');
  });

  it('returns null for multi/collection/null', () => {
    expect(drawModeForGeometry(multipoly)).toBeNull();
    expect(drawModeForGeometry(null)).toBeNull();
    expect(drawModeForGeometry({ type: 'GeometryCollection', geometries: [] })).toBeNull();
  });
});

describe('defaultDrawMode', () => {
  it('derives a mode from the declared collection type', () => {
    expect(defaultDrawMode('Point')).toBe('point');
    expect(defaultDrawMode('MultiPoint')).toBe('point');
    expect(defaultDrawMode('LineString')).toBe('linestring');
    expect(defaultDrawMode('MultiLineString')).toBe('linestring');
    expect(defaultDrawMode('MultiPolygon')).toBe('polygon');
  });

  it('defaults to polygon when unknown', () => {
    expect(defaultDrawMode(undefined)).toBe('polygon');
    expect(defaultDrawMode('Geometry')).toBe('polygon');
  });
});

describe('featuresToGeometry', () => {
  it('returns null for empty/missing stores', () => {
    expect(featuresToGeometry([])).toBeNull();
    expect(featuresToGeometry(null)).toBeNull();
    expect(featuresToGeometry(undefined)).toBeNull();
  });

  it('returns the last feature geometry', () => {
    expect(featuresToGeometry([feat(point)])).toEqual(point);
    expect(featuresToGeometry([feat(point), feat(poly)])).toEqual(poly);
  });
});

describe('geometryToDrawFeatures', () => {
  it('wraps a simple geometry with mode + id', () => {
    const [f] = geometryToDrawFeatures(poly, 'abc');
    expect(f.id).toBe('abc');
    expect((f.properties as { mode: string }).mode).toBe('polygon');
    expect(f.geometry).toEqual(poly);
  });

  it('returns [] for null / multi / collection', () => {
    expect(geometryToDrawFeatures(null, 'x')).toEqual([]);
    expect(geometryToDrawFeatures(multipoly, 'x')).toEqual([]);
  });
});
