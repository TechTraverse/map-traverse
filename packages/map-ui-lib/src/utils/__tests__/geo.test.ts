import { describe, it, expect } from 'vitest';
import {
  bboxFromGeometry,
  combineGeometries,
  featureCollectionFromGeometries,
  zoomToFeature,
  DEFAULT_POINT_ZOOM,
  DEFAULT_POLYGON_MAX_ZOOM,
} from '../geo';

describe('bboxFromGeometry', () => {
  it('pads a bare Point so min/max differ', () => {
    const bbox = bboxFromGeometry({ type: 'Point', coordinates: [-122, 37] });
    expect(bbox).not.toBeNull();
    expect(bbox![0]).toBeLessThan(bbox![2]);
    expect(bbox![1]).toBeLessThan(bbox![3]);
  });

  it('computes the axis-aligned bbox of a polygon', () => {
    const bbox = bboxFromGeometry({
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]],
    });
    expect(bbox).toEqual([0, 0, 10, 5]);
  });

  it('returns null for an empty geometry', () => {
    expect(bboxFromGeometry({ type: 'Polygon', coordinates: [] })).toBeNull();
  });
});

describe('combineGeometries', () => {
  it('returns null for empty input', () => {
    expect(combineGeometries([])).toBeNull();
  });

  it('returns the single geometry unchanged when only one is given', () => {
    const g = { type: 'Point', coordinates: [0, 0] };
    expect(combineGeometries([g])).toBe(g);
  });

  it('wraps multiple geometries in a GeometryCollection', () => {
    const a = { type: 'Point', coordinates: [0, 0] };
    const b = { type: 'Point', coordinates: [1, 1] };
    expect(combineGeometries([a, b])).toEqual({
      type: 'GeometryCollection',
      geometries: [a, b],
    });
  });
});

describe('zoomToFeature', () => {
  it('returns null for missing geometry', () => {
    expect(zoomToFeature(null)).toBeNull();
    expect(zoomToFeature(undefined)).toBeNull();
  });

  it('returns a flyTo instruction for a Point with the default point zoom', () => {
    const result = zoomToFeature({ type: 'Point', coordinates: [-122.5, 37.5] });
    expect(result).toEqual({
      type: 'flyTo',
      center: [-122.5, 37.5],
      zoom: DEFAULT_POINT_ZOOM,
    });
  });

  it('honours pointZoom override', () => {
    const result = zoomToFeature(
      { type: 'Point', coordinates: [0, 0] },
      { pointZoom: 12 },
    );
    expect(result).toMatchObject({ type: 'flyTo', zoom: 12 });
  });

  it('clamps point zoom to layerMaxZoom', () => {
    const result = zoomToFeature(
      { type: 'Point', coordinates: [0, 0] },
      { pointZoom: 18, layerMaxZoom: 14 },
    );
    expect(result).toMatchObject({ type: 'flyTo', zoom: 14 });
  });

  it('clamps point zoom up to layerMinZoom', () => {
    const result = zoomToFeature(
      { type: 'Point', coordinates: [0, 0] },
      { pointZoom: 4, layerMinZoom: 8 },
    );
    expect(result).toMatchObject({ type: 'flyTo', zoom: 8 });
  });

  it('returns a fitBounds instruction for a Polygon', () => {
    const result = zoomToFeature({
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]],
    });
    expect(result).toEqual({
      type: 'fitBounds',
      bbox: [0, 0, 10, 5],
      padding: 50,
      maxZoom: DEFAULT_POLYGON_MAX_ZOOM,
    });
  });

  it('caps polygon maxZoom by layerMaxZoom', () => {
    const result = zoomToFeature(
      { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      { maxZoom: 20, layerMaxZoom: 14 },
    );
    expect(result).toMatchObject({ type: 'fitBounds', maxZoom: 14 });
  });

  it('uses flyTo for a degenerate polygon collapsed to a single point', () => {
    const result = zoomToFeature({
      type: 'Polygon',
      coordinates: [[[5, 5], [5, 5], [5, 5], [5, 5]]],
    });
    expect(result).toMatchObject({ type: 'flyTo', center: [5, 5] });
  });
});

describe('featureCollectionFromGeometries', () => {
  it('returns null when given no usable geometries', () => {
    expect(featureCollectionFromGeometries([])).toBeNull();
    expect(featureCollectionFromGeometries([null, undefined])).toBeNull();
  });

  it('wraps each geometry in a Feature and skips null/undefined', () => {
    const a = { type: 'Point', coordinates: [0, 0] };
    const b = { type: 'Point', coordinates: [1, 1] };
    const fc = featureCollectionFromGeometries([a, null, b, undefined]);
    expect(fc).not.toBeNull();
    expect(fc!.type).toBe('FeatureCollection');
    expect(fc!.features).toHaveLength(2);
    expect(fc!.features[0]).toMatchObject({ type: 'Feature', geometry: a });
    expect(fc!.features[1]).toMatchObject({ type: 'Feature', geometry: b });
  });
});
