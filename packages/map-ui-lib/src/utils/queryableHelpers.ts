import type { OgcQueryables, QueryableProperty } from './ogcApi';
import { fetchQueryables, fetchFeatures } from './ogcApi';
import type { AvailableProperty } from '../types';

const GEOMETRY_REF_PATTERN = /geojson\.org\/schema\/(\w+)\.json/;

/** Returns true if the property definition references a GeoJSON geometry $ref. */
export function isGeometryProperty(prop: QueryableProperty): boolean {
  return !!prop.$ref && GEOMETRY_REF_PATTERN.test(prop.$ref);
}

/**
 * Extracts the geometry type name from a geojson.org schema $ref.
 * e.g. "https://geojson.org/schema/Point.json" → "Point"
 */
export function extractGeometryType(ref: string): string | null {
  const match = GEOMETRY_REF_PATTERN.exec(ref);
  return match ? match[1] : null;
}

/**
 * Maps a GeoJSON geometry type name to a MapLibre style type.
 * Returns null for geometry collection or unrecognised types.
 * Note: Point maps to 'circle' by default; 'symbol' is a manual choice.
 */
export function geometryTypeToStyleType(geomType: string): 'fill' | 'line' | 'circle' | 'symbol' | null {
  const lower = geomType.toLowerCase();
  if (lower.includes('polygon')) return 'fill';
  if (lower.includes('linestring')) return 'line';
  if (lower.includes('point')) return 'circle';
  return null;
}

/**
 * Maps a GeoJSON geometry type name to all suitable MapLibre style types.
 * Point returns both 'circle' and 'symbol'; others return a single type.
 * Returns an empty array for geometry collection or unrecognised types.
 */
export function geometryTypeToStyleTypes(geomType: string): ('fill' | 'line' | 'circle' | 'symbol')[] {
  const lower = geomType.toLowerCase();
  if (lower.includes('polygon')) return ['fill'];
  if (lower.includes('linestring')) return ['line'];
  if (lower.includes('point')) return ['circle', 'symbol'];
  return [];
}

/**
 * Scans all properties in a queryables document for a geometry $ref and
 * returns the derived style type, or null if none found.
 */
export function detectGeometryTypeFromQueryables(
  queryables: OgcQueryables,
): 'fill' | 'line' | 'circle' | 'symbol' | null {
  for (const prop of Object.values(queryables.properties)) {
    if (prop.$ref) {
      const geomType = extractGeometryType(prop.$ref);
      if (geomType) return geometryTypeToStyleType(geomType);
    }
  }
  return null;
}

/**
 * Scans all properties in a queryables document for a geometry $ref and
 * returns all suitable style types, or an empty array if none found.
 */
export function detectGeometryStyleTypesFromQueryables(
  queryables: OgcQueryables,
): ('fill' | 'line' | 'circle' | 'symbol')[] {
  for (const prop of Object.values(queryables.properties)) {
    if (prop.$ref) {
      const geomType = extractGeometryType(prop.$ref);
      if (geomType) return geometryTypeToStyleTypes(geomType);
    }
  }
  return [];
}

/**
 * Filters out geometry properties and maps the rest to AvailableProperty[].
 */
export function toAvailableProperties(queryables: OgcQueryables): AvailableProperty[] {
  return Object.entries(queryables.properties)
    .filter(([, prop]) => !isGeometryProperty(prop))
    .map(([name, prop]) => ({
      name,
      title: prop.title,
      type: prop.type,
      format: prop.format,
      enum: prop.enum,
      minimum: prop.minimum,
      maximum: prop.maximum,
    }));
}

/**
 * Detects the geometry type for a collection and returns the corresponding
 * MapLibre style type. Tries queryables first, falls back to fetching one feature.
 * Returns null if detection fails.
 */
export async function detectStyleTypeForCollection(
  baseUrl: string,
  collectionId: string,
): Promise<'fill' | 'line' | 'circle' | 'symbol' | null> {
  try {
    const queryables = await fetchQueryables(baseUrl, collectionId);
    const styleType = detectGeometryTypeFromQueryables(queryables);
    if (styleType) return styleType;
  } catch { /* fall through */ }

  try {
    const fc = await fetchFeatures(baseUrl, collectionId, { limit: 1 });
    const geomType = fc.features[0]?.geometry?.type;
    if (typeof geomType === 'string') return geometryTypeToStyleType(geomType);
  } catch { /* ignore */ }

  return null;
}

/**
 * Detects all suitable style types for a collection.
 * Tries queryables first, falls back to fetching one feature.
 * Returns an empty array if detection fails.
 */
export async function detectStyleTypesForCollection(
  baseUrl: string,
  collectionId: string,
): Promise<('fill' | 'line' | 'circle' | 'symbol')[]> {
  try {
    const queryables = await fetchQueryables(baseUrl, collectionId);
    const styleTypes = detectGeometryStyleTypesFromQueryables(queryables);
    if (styleTypes.length > 0) return styleTypes;
  } catch { /* fall through */ }

  try {
    const fc = await fetchFeatures(baseUrl, collectionId, { limit: 1 });
    const geomType = fc.features[0]?.geometry?.type;
    if (typeof geomType === 'string') return geometryTypeToStyleTypes(geomType);
  } catch { /* ignore */ }

  return [];
}

/**
 * Converts a snake_case or camelCase property name to a human-readable label.
 * e.g. "pop_est" → "Pop Est", "countryName" → "Country Name"
 */
export function humanizePropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
