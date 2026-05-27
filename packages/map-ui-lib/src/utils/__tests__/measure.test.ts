import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateArea,
  calculateMeasurement,
  defaultUnitForMode,
  buildMeasureGeometryData,
  buildMeasurePointsData,
  formatMeasurement,
  UNITS_FOR_MODE,
  UNIT_LABELS,
} from '../measure';

// 1° of longitude at the equator is ~111.319 km.
const EQUATOR_SEGMENT: [number, number][] = [
  [0, 0],
  [1, 0],
];

// A 1°×1° polygon at the equator is ~12,309 km².
const EQUATOR_SQUARE: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

describe('calculateDistance', () => {
  it('returns 0 for fewer than 2 points', () => {
    expect(calculateDistance([], 'km')).toBe(0);
    expect(calculateDistance([[0, 0]], 'km')).toBe(0);
  });

  it('defaults to km when unit omitted', () => {
    expect(calculateDistance(EQUATOR_SEGMENT)).toBeCloseTo(111.2, 0);
  });

  it('returns km for a 1° equatorial segment (~111 km)', () => {
    expect(calculateDistance(EQUATOR_SEGMENT, 'km')).toBeCloseTo(111, 0);
  });

  it('converts km → mi', () => {
    const km = calculateDistance(EQUATOR_SEGMENT, 'km');
    const mi = calculateDistance(EQUATOR_SEGMENT, 'mi');
    expect(mi / km).toBeCloseTo(0.621371, 4);
  });

  it('converts km → m', () => {
    const km = calculateDistance(EQUATOR_SEGMENT, 'km');
    const m = calculateDistance(EQUATOR_SEGMENT, 'm');
    expect(m / km).toBeCloseTo(1000, 0);
  });

  it('converts km → ft', () => {
    const km = calculateDistance(EQUATOR_SEGMENT, 'km');
    const ft = calculateDistance(EQUATOR_SEGMENT, 'ft');
    expect(ft / km).toBeCloseTo(3280.84, 1);
  });
});

describe('calculateArea', () => {
  it('returns 0 for fewer than 3 points', () => {
    expect(calculateArea([], 'km2')).toBe(0);
    expect(calculateArea([[0, 0], [1, 0]], 'km2')).toBe(0);
  });

  it('defaults to km2 when unit omitted', () => {
    const area = calculateArea(EQUATOR_SQUARE);
    expect(area).toBeGreaterThan(10000);
    expect(area).toBeLessThan(15000);
  });

  it('returns km² for a 1°×1° equatorial polygon', () => {
    const area = calculateArea(EQUATOR_SQUARE, 'km2');
    expect(area).toBeGreaterThan(10000);
    expect(area).toBeLessThan(15000);
  });

  it('converts m² → mi²', () => {
    const km2 = calculateArea(EQUATOR_SQUARE, 'km2');
    const mi2 = calculateArea(EQUATOR_SQUARE, 'mi2');
    // mi2 should be smaller than km2 by ~0.386
    expect(mi2 / km2).toBeCloseTo(0.386, 1);
  });

  it('converts m² → ha', () => {
    const km2 = calculateArea(EQUATOR_SQUARE, 'km2');
    const ha = calculateArea(EQUATOR_SQUARE, 'ha');
    // 1 km² = 100 ha
    expect(ha / km2).toBeCloseTo(100, 0);
  });

  it('converts m² → acres', () => {
    const ha = calculateArea(EQUATOR_SQUARE, 'ha');
    const acres = calculateArea(EQUATOR_SQUARE, 'acres');
    // 1 ha ≈ 2.471 acres
    expect(acres / ha).toBeCloseTo(2.471, 1);
  });
});

describe('calculateMeasurement', () => {
  it('returns null for distance with <2 points', () => {
    expect(calculateMeasurement('distance', [[0, 0]], 'km')).toBeNull();
  });

  it('returns null for area with <3 points', () => {
    expect(calculateMeasurement('area', [[0, 0], [1, 0]], 'km2')).toBeNull();
  });

  it('returns {value, unit} for distance mode', () => {
    const result = calculateMeasurement('distance', EQUATOR_SEGMENT, 'km');
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('km');
    expect(result!.value).toBeCloseTo(111, 0);
  });

  it('returns {value, unit} for area mode', () => {
    const result = calculateMeasurement('area', EQUATOR_SQUARE, 'km2');
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('km2');
    expect(result!.value).toBeGreaterThan(10000);
  });
});

describe('defaultUnitForMode', () => {
  it('returns km for distance mode', () => {
    expect(defaultUnitForMode('distance')).toBe('km');
  });

  it('returns km2 for area mode', () => {
    expect(defaultUnitForMode('area')).toBe('km2');
  });
});

describe('buildMeasureGeometryData', () => {
  it('returns null for fewer than 2 points', () => {
    expect(buildMeasureGeometryData('distance', [])).toBeNull();
    expect(buildMeasureGeometryData('distance', [[0, 0]])).toBeNull();
  });

  it('returns LineString feature for distance mode with 2+ points', () => {
    const feature = buildMeasureGeometryData('distance', EQUATOR_SEGMENT);
    expect(feature).not.toBeNull();
    expect(feature!.type).toBe('Feature');
    expect(feature!.geometry.type).toBe('LineString');
    expect((feature!.geometry as GeoJSON.LineString).coordinates).toEqual(EQUATOR_SEGMENT);
  });

  it('returns LineString feature for area mode with only 2 points', () => {
    const feature = buildMeasureGeometryData('area', EQUATOR_SEGMENT);
    expect(feature).not.toBeNull();
    expect(feature!.geometry.type).toBe('LineString');
  });

  it('returns Polygon feature for area mode with 3+ points (auto-closed ring)', () => {
    const feature = buildMeasureGeometryData('area', EQUATOR_SQUARE);
    expect(feature).not.toBeNull();
    expect(feature!.geometry.type).toBe('Polygon');
    const ring = (feature!.geometry as GeoJSON.Polygon).coordinates[0];
    expect(ring).toHaveLength(EQUATOR_SQUARE.length + 1);
    expect(ring[ring.length - 1]).toEqual(EQUATOR_SQUARE[0]);
  });
});

describe('buildMeasurePointsData', () => {
  it('returns null when no points', () => {
    expect(buildMeasurePointsData([])).toBeNull();
  });

  it('returns FeatureCollection of Points', () => {
    const fc = buildMeasurePointsData(EQUATOR_SEGMENT);
    expect(fc).not.toBeNull();
    expect(fc!.type).toBe('FeatureCollection');
    expect(fc!.features).toHaveLength(2);
    expect(fc!.features[0].geometry.type).toBe('Point');
    expect((fc!.features[0].geometry as GeoJSON.Point).coordinates).toEqual([0, 0]);
  });
});

describe('formatMeasurement', () => {
  it('formats tiny values with < threshold', () => {
    expect(formatMeasurement({ value: 0.005, unit: 'km' })).toBe('< 0.01 km');
  });

  it('formats small values with 2 decimals', () => {
    expect(formatMeasurement({ value: 12.345, unit: 'km' })).toBe('12.35 km');
  });

  it('formats medium values with 1 decimal', () => {
    expect(formatMeasurement({ value: 1234.5, unit: 'km' })).toBe('1234.5 km');
  });

  it('formats large values with no decimals and locale grouping', () => {
    const result = formatMeasurement({ value: 12345, unit: 'km' });
    expect(result).toMatch(/^[\d,.\s]+ km$/);
    expect(result).toContain('km');
  });

  it('uses the right unit label (km² instead of km2)', () => {
    expect(formatMeasurement({ value: 50, unit: 'km2' })).toBe('50.00 km²');
  });

  it('uses the acres → ac label', () => {
    expect(formatMeasurement({ value: 50, unit: 'acres' })).toBe('50.00 ac');
  });
});

describe('UNITS_FOR_MODE and UNIT_LABELS', () => {
  it('exposes distance units', () => {
    expect(UNITS_FOR_MODE.distance).toEqual(['km', 'mi', 'm', 'ft']);
  });

  it('exposes area units', () => {
    expect(UNITS_FOR_MODE.area).toEqual(['km2', 'mi2', 'ha', 'acres']);
  });

  it('labels all known units', () => {
    expect(UNIT_LABELS.km).toBe('km');
    expect(UNIT_LABELS.km2).toBe('km²');
    expect(UNIT_LABELS.mi2).toBe('mi²');
    expect(UNIT_LABELS.ha).toBe('ha');
    expect(UNIT_LABELS.acres).toBe('ac');
  });
});
