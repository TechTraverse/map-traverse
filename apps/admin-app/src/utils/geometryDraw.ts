/**
 * Pure helpers bridging terra-draw's feature store (an array of GeoJSON
 * Features) and the single GeoJSON geometry the GeometryEditor is controlled
 * by. Kept dependency-free (plain GeoJSON in/out, no terra-draw import) so it
 * can be unit-tested under vitest without a map/WebGL.
 *
 * The draw map edits ONE geometry at a time and only handles the simple types
 * terra-draw draws natively (Point / LineString / Polygon). Multi* and
 * GeometryCollection are edited via the WKT/Coordinates tabs; the server
 * coerces a drawn single geometry up to the collection's Multi type on write.
 */

export type DrawMode = 'point' | 'linestring' | 'polygon';

/** terra-draw modes a given geometry type can be seeded into / edited as. */
export function drawModeForGeometry(geometry: GeoJSON.Geometry | null): DrawMode | null {
  switch (geometry?.type) {
    case 'Point':
      return 'point';
    case 'LineString':
      return 'linestring';
    case 'Polygon':
      return 'polygon';
    default:
      return null;
  }
}

/** Map a collection's declared geometry type to the draw mode to default to. */
export function defaultDrawMode(geometryType?: string): DrawMode {
  const t = (geometryType ?? '').toUpperCase();
  if (t.includes('POINT')) return 'point';
  if (t.includes('LINESTRING') || t.includes('LINE')) return 'linestring';
  return 'polygon';
}

/**
 * Reduce a terra-draw snapshot to the single geometry the editor tracks. We
 * keep the LAST feature in the store (the most recently drawn/edited one) and
 * return its geometry, or null when the store is empty.
 */
export function featuresToGeometry(
  features: Array<GeoJSON.Feature> | undefined | null,
): GeoJSON.Geometry | null {
  if (!features || features.length === 0) return null;
  const last = features[features.length - 1];
  return last?.geometry ?? null;
}

/**
 * Wrap a geometry as terra-draw seed features. terra-draw requires each feature
 * to carry a `properties.mode` matching a registered mode and a stable id.
 * Returns [] for null / unsupported (Multi*, GeometryCollection) geometries —
 * those are not seeded into the map.
 */
export function geometryToDrawFeatures(
  geometry: GeoJSON.Geometry | null,
  id: string,
): GeoJSON.Feature[] {
  const mode = drawModeForGeometry(geometry);
  if (!mode || !geometry) return [];
  return [
    {
      id,
      type: 'Feature',
      properties: { mode },
      geometry,
    },
  ];
}
