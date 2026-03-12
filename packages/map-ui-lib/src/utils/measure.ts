import turfLength from '@turf/length';
import turfArea from '@turf/area';
import { lineString, polygon } from '@turf/helpers';

export type MeasureMode = 'distance' | 'area';
export type DistanceUnit = 'km' | 'mi' | 'm' | 'ft';
export type AreaUnit = 'km2' | 'mi2' | 'ha' | 'acres';
export type MeasureUnit = DistanceUnit | AreaUnit;

export interface Measurement {
  value: number;
  unit: MeasureUnit;
}

export const UNITS_FOR_MODE = {
  distance: ['km', 'mi', 'm', 'ft'] as DistanceUnit[],
  area: ['km2', 'mi2', 'ha', 'acres'] as AreaUnit[],
} as const;

export const UNIT_LABELS: Record<MeasureUnit, string> = {
  km: 'km',
  mi: 'mi',
  m: 'm',
  ft: 'ft',
  km2: 'km²',
  mi2: 'mi²',
  ha: 'ha',
  acres: 'ac',
};

// Conversion factors from km
const KM_FACTORS: Record<DistanceUnit, number> = {
  km: 1,
  mi: 0.621371,
  m: 1000,
  ft: 3280.84,
};

// Conversion factors from m²
const M2_FACTORS: Record<AreaUnit, number> = {
  km2: 1e-6,
  mi2: 3.861e-7,
  ha: 1e-4,
  acres: 0.000247105,
};

/**
 * Calculate distance along a series of points.
 * Points are [lng, lat] (GeoJSON order).
 * Returns 0 if fewer than 2 points.
 */
export function calculateDistance(
  points: [number, number][],
  unit: DistanceUnit = 'km',
): number {
  if (points.length < 2) return 0;
  const line = lineString(points);
  const km = turfLength(line, { units: 'kilometers' });
  return km * KM_FACTORS[unit];
}

/**
 * Calculate area of a polygon defined by points.
 * Points are [lng, lat] (GeoJSON order). The ring is auto-closed.
 * Returns 0 if fewer than 3 points.
 */
export function calculateArea(
  points: [number, number][],
  unit: AreaUnit = 'km2',
): number {
  if (points.length < 3) return 0;
  const closed = [...points, points[0]];
  const poly = polygon([closed]);
  const m2 = turfArea(poly);
  return m2 * M2_FACTORS[unit];
}

/**
 * Calculate measurement for the given mode and points.
 * Returns null if insufficient points.
 */
export function calculateMeasurement(
  mode: MeasureMode,
  points: [number, number][],
  unit: MeasureUnit,
): Measurement | null {
  if (mode === 'distance' && points.length >= 2) {
    return { value: calculateDistance(points, unit as DistanceUnit), unit };
  }
  if (mode === 'area' && points.length >= 3) {
    return { value: calculateArea(points, unit as AreaUnit), unit };
  }
  return null;
}

/**
 * Returns the default unit for a given measure mode.
 */
export function defaultUnitForMode(mode: MeasureMode): MeasureUnit {
  return mode === 'distance' ? 'km' : 'km2';
}

/**
 * Build GeoJSON data for measure geometry (line or polygon).
 * Returns null if fewer than 2 points.
 */
export function buildMeasureGeometryData(
  mode: MeasureMode,
  points: [number, number][],
): GeoJSON.Feature | null {
  if (points.length < 2) return null;
  return {
    type: 'Feature',
    geometry: mode === 'area' && points.length >= 3
      ? { type: 'Polygon', coordinates: [[...points, points[0]]] }
      : { type: 'LineString', coordinates: points },
    properties: {},
  };
}

/**
 * Build GeoJSON FeatureCollection for measure point markers.
 * Returns null if no points.
 */
export function buildMeasurePointsData(
  points: [number, number][],
): GeoJSON.FeatureCollection | null {
  if (points.length === 0) return null;
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: p },
      properties: {},
    })),
  };
}

/**
 * Format a measurement value for display.
 */
export function formatMeasurement(measurement: Measurement): string {
  const { value, unit } = measurement;
  const label = UNIT_LABELS[unit];

  if (value < 0.01) return `< 0.01 ${label}`;
  if (value < 100) return `${value.toFixed(2)} ${label}`;
  if (value < 10000) return `${value.toFixed(1)} ${label}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${label}`;
}
