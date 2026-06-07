// Pure, framework-agnostic helpers for validating and reshaping GeoJSON
// geometries used by the GeometryEditor. No React / map dependencies.
//
// Note: we intentionally do NOT import `parseCoordinate` from the
// CoordinateDisplay component here — these helpers operate on already-numeric
// coordinate lists, and pulling a component module (which imports react-icons)
// into the utils layer would be a needless dependency. Text parsing of typed
// coordinates is the editor component's job.

/** A `[lng, lat]` position with optional extra ordinates (z/m). */
function isPosition(pos: unknown): pos is number[] {
  if (!Array.isArray(pos) || pos.length < 2) return false;
  for (let i = 0; i < pos.length; i++) {
    const n = pos[i];
    if (typeof n !== 'number' || !Number.isFinite(n)) return false;
  }
  const [lng, lat] = pos as number[];
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function isPositionArray(arr: unknown, min: number): boolean {
  return Array.isArray(arr) && arr.length >= min && arr.every(isPosition);
}

/** A linear ring: >= 4 positions, first === last (closed). */
function isClosedRing(ring: unknown): boolean {
  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) return false;
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  return first[0] === last[0] && first[1] === last[1];
}

function isPolygonRings(rings: unknown): boolean {
  return Array.isArray(rings) && rings.length >= 1 && rings.every(isClosedRing);
}

/**
 * Structural validation of a GeoJSON geometry. Checks the `type`, the
 * coordinate-array shape for that type, and that every position is a valid
 * `[lng, lat]` pair with `lng ∈ [-180, 180]` and `lat ∈ [-90, 90]`.
 *
 * Polygon rings must have >= 4 positions and be explicitly closed (first
 * position equals last). Never throws — returns `false` for anything malformed.
 */
export function isValidGeometry(geom: unknown): geom is GeoJSON.Geometry {
  if (!geom || typeof geom !== 'object') return false;
  const g = geom as { type?: unknown; coordinates?: unknown; geometries?: unknown };
  switch (g.type) {
    case 'Point':
      return isPosition(g.coordinates);
    case 'MultiPoint':
      return isPositionArray(g.coordinates, 1);
    case 'LineString':
      return isPositionArray(g.coordinates, 2);
    case 'MultiLineString':
      return (
        Array.isArray(g.coordinates) &&
        g.coordinates.length >= 1 &&
        g.coordinates.every((l) => isPositionArray(l, 2))
      );
    case 'Polygon':
      return isPolygonRings(g.coordinates);
    case 'MultiPolygon':
      return (
        Array.isArray(g.coordinates) &&
        g.coordinates.length >= 1 &&
        g.coordinates.every(isPolygonRings)
      );
    case 'GeometryCollection':
      return (
        Array.isArray(g.geometries) &&
        g.geometries.length >= 0 &&
        g.geometries.every(isValidGeometry)
      );
    default:
      return false;
  }
}

/** Simple geometry types the structured coordinate editor can represent. */
export type SimpleGeometryKind = 'Point' | 'LineString' | 'Polygon';

/**
 * Flatten a Point / LineString / single-ring Polygon to a `[lng, lat][]` list
 * for the structured coordinate editor.
 *
 * Returns `null` for types it cannot represent simply — MultiPoint,
 * MultiLineString, MultiPolygon, GeometryCollection, or a Polygon with holes
 * (more than one ring). Those are handled by the WKT / Draw tabs instead.
 */
export function geometryToCoordinateList(geom: unknown): number[][] | null {
  if (!geom || typeof geom !== 'object') return null;
  const g = geom as { type?: unknown; coordinates?: unknown };
  switch (g.type) {
    case 'Point': {
      const c = g.coordinates as unknown;
      return Array.isArray(c) && c.length >= 2 ? [[c[0] as number, c[1] as number]] : null;
    }
    case 'LineString': {
      const c = g.coordinates as unknown;
      if (!Array.isArray(c)) return null;
      return c.map((pos) => [(pos as number[])[0], (pos as number[])[1]]);
    }
    case 'Polygon': {
      const rings = g.coordinates as unknown;
      // Only single-ring polygons (no holes) are representable as a flat list.
      if (!Array.isArray(rings) || rings.length !== 1 || !Array.isArray(rings[0])) return null;
      return (rings[0] as number[][]).map((pos) => [pos[0], pos[1]]);
    }
    default:
      return null;
  }
}

/**
 * Build a simple geometry from a `[lng, lat][]` list.
 *
 * - `Point` uses the first coordinate.
 * - `LineString` requires >= 2 coordinates.
 * - `Polygon` requires >= 3 coordinates and auto-closes the ring (so the result
 *   has >= 4 positions).
 *
 * Coordinates that aren't finite `[lng, lat]` pairs are dropped. Returns `null`
 * if too few valid coordinates remain for the requested kind.
 */
export function coordinateListToGeometry(
  coords: number[][],
  kind: SimpleGeometryKind,
): GeoJSON.Geometry | null {
  if (!Array.isArray(coords)) return null;
  const clean: number[][] = coords
    .filter(
      (c) =>
        Array.isArray(c) &&
        c.length >= 2 &&
        typeof c[0] === 'number' &&
        typeof c[1] === 'number' &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1]),
    )
    .map((c) => [c[0], c[1]]);

  switch (kind) {
    case 'Point':
      return clean.length >= 1
        ? { type: 'Point', coordinates: clean[0] as GeoJSON.Position }
        : null;
    case 'LineString':
      return clean.length >= 2
        ? { type: 'LineString', coordinates: clean as GeoJSON.Position[] }
        : null;
    case 'Polygon': {
      if (clean.length < 3) return null;
      const ring = [...clean];
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
      return { type: 'Polygon', coordinates: [ring] as GeoJSON.Position[][] };
    }
    default:
      return null;
  }
}
