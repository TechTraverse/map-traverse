import { describe, it, expect } from 'vitest';
import {
  detectGeometryTypesFromFeatures,
  buildDefaultStylesForGeometryTypes,
} from '../queryableHelpers';

describe('detectGeometryTypesFromFeatures', () => {
  it('returns empty array for empty features', () => {
    expect(detectGeometryTypesFromFeatures([])).toEqual([]);
  });

  it('returns distinct geometry types', () => {
    const features = [
      { geometry: { type: 'Point' } },
      { geometry: { type: 'Point' } },
      { geometry: { type: 'Polygon' } },
    ];
    const result = detectGeometryTypesFromFeatures(features);
    expect(result).toContain('Point');
    expect(result).toContain('Polygon');
    expect(result).toHaveLength(2);
  });

  it('handles null/undefined geometry', () => {
    const features = [
      { geometry: null },
      { geometry: { type: 'LineString' } },
      {},
    ];
    expect(detectGeometryTypesFromFeatures(features)).toEqual(['LineString']);
  });
});

describe('buildDefaultStylesForGeometryTypes', () => {
  it('returns empty array for unknown geometry types', () => {
    expect(buildDefaultStylesForGeometryTypes([])).toEqual([]);
    expect(buildDefaultStylesForGeometryTypes(['GeometryCollection'])).toEqual([]);
  });

  it('returns single fill style for polygon-only collection (no geometryFilter)', () => {
    const styles = buildDefaultStylesForGeometryTypes(['Polygon', 'MultiPolygon']);
    expect(styles).toHaveLength(1);
    expect(styles[0].type).toBe('fill');
    expect(styles[0].geometryFilter).toBeUndefined();
  });

  it('returns single circle style for point-only collection (no geometryFilter)', () => {
    const styles = buildDefaultStylesForGeometryTypes(['Point']);
    expect(styles).toHaveLength(1);
    expect(styles[0].type).toBe('circle');
    expect(styles[0].geometryFilter).toBeUndefined();
  });

  it('returns single line style for linestring-only collection (no geometryFilter)', () => {
    const styles = buildDefaultStylesForGeometryTypes(['LineString']);
    expect(styles).toHaveLength(1);
    expect(styles[0].type).toBe('line');
    expect(styles[0].geometryFilter).toBeUndefined();
  });

  it('returns multiple styles with geometryFilter for mixed collection', () => {
    const styles = buildDefaultStylesForGeometryTypes(['Polygon', 'Point']);
    expect(styles).toHaveLength(2);

    const fillStyle = styles.find((s) => s.type === 'fill');
    expect(fillStyle).toBeDefined();
    expect(fillStyle?.geometryFilter).toEqual(['Polygon', 'MultiPolygon']);

    const circleStyle = styles.find((s) => s.type === 'circle');
    expect(circleStyle).toBeDefined();
    expect(circleStyle?.geometryFilter).toEqual(['Point', 'MultiPoint']);
  });

  it('handles all three geometry families in mixed collection', () => {
    const styles = buildDefaultStylesForGeometryTypes(['Polygon', 'LineString', 'Point']);
    expect(styles).toHaveLength(3);
    expect(styles.map((s) => s.type)).toEqual(expect.arrayContaining(['fill', 'line', 'circle']));
    for (const style of styles) {
      expect(style.geometryFilter).toBeDefined();
    }
  });
});
