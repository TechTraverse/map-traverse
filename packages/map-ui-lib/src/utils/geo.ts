export type BBox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

function extractCoords(geometry: Record<string, unknown>): number[][] {
  const type = geometry.type as string;
  const coordinates = geometry.coordinates as unknown;

  if (type === 'Point') return [coordinates as number[]];
  if (type === 'MultiPoint' || type === 'LineString') return coordinates as number[][];
  if (type === 'MultiLineString' || type === 'Polygon') return (coordinates as number[][][]).flat();
  if (type === 'MultiPolygon') return (coordinates as number[][][][]).flat(2);
  if (type === 'GeometryCollection') {
    return ((geometry.geometries as Record<string, unknown>[]) ?? []).flatMap(extractCoords);
  }
  return [];
}

const POINT_PADDING = 0.01; // ~1km at equator

/**
 * Combines multiple geometries into a single geometry.
 * Returns the geometry directly if only one, or a GeometryCollection if multiple.
 * Returns null if the array is empty.
 */
export function combineGeometries(geometries: Record<string, unknown>[]): Record<string, unknown> | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];
  return { type: 'GeometryCollection', geometries };
}

/**
 * Wraps a list of geometries into a GeoJSON FeatureCollection suitable for a
 * map highlight source. Null/undefined geometries are skipped. Returns `null`
 * if no usable geometries remain (so callers can clear the highlight).
 */
export function featureCollectionFromGeometries(
  geometries: Array<Record<string, unknown> | null | undefined>,
): GeoJSON.FeatureCollection | null {
  const features: GeoJSON.Feature[] = [];
  for (const geometry of geometries) {
    if (!geometry) continue;
    features.push({
      type: 'Feature',
      properties: {},
      geometry: geometry as unknown as GeoJSON.Geometry,
    });
  }
  if (features.length === 0) return null;
  return { type: 'FeatureCollection', features };
}

export function bboxFromGeometry(geometry: Record<string, unknown>): BBox | null {
  const coords = extractCoords(geometry);
  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Add padding for point geometries
  if (minLng === maxLng && minLat === maxLat) {
    minLng -= POINT_PADDING;
    minLat -= POINT_PADDING;
    maxLng += POINT_PADDING;
    maxLat += POINT_PADDING;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Returns the unpadded (raw) bbox from a geometry without the point-padding fudge.
 * Used by {@link zoomToFeature} to distinguish true point/zero-area geometries
 * from polygon/line geometries that happen to be very small.
 */
function rawBboxFromGeometry(geometry: Record<string, unknown>): BBox | null {
  const coords = extractCoords(geometry);
  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

function isZeroArea(bbox: BBox): boolean {
  return bbox[0] === bbox[2] && bbox[1] === bbox[3];
}

function bboxCenter(bbox: BBox): [number, number] {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

/** Default target zoom used when fitting to a point/zero-area feature. */
export const DEFAULT_POINT_ZOOM = 16;
/** Default cap applied to {@link ZoomToFeatureOptions.maxZoom} for polygon/line geometries. */
export const DEFAULT_POLYGON_MAX_ZOOM = 18;

export interface ZoomToFeatureOptions {
  /** Layer's configured minZoom — result.zoom will be clamped ≥ this. */
  layerMinZoom?: number;
  /** Layer's configured maxZoom — result.zoom will be clamped ≤ this. */
  layerMaxZoom?: number;
  /** Preferred zoom for point geometries. Defaults to {@link DEFAULT_POINT_ZOOM}. */
  pointZoom?: number;
  /** Padding in px applied when using fitBounds. */
  padding?: number;
  /** Cap passed to fitBounds so very small polygons don't zoom to level 22. */
  maxZoom?: number;
}

/**
 * A fitBounds-style instruction: "fit this bbox in the viewport with padding,
 * but don't zoom past `maxZoom`". The app layer converts this to
 * `map.fitBounds(bbox, { padding, maxZoom })`.
 *
 * Note: MapLibre's `fitBounds` does not accept a `minZoom` option, so we don't
 * expose one on the instruction. The layer's `minZoom` is enforced by the map's
 * layer definition (tiles below that zoom simply don't render) rather than by
 * the fit itself.
 */
export interface ZoomToBoundsInstruction {
  type: 'fitBounds';
  bbox: BBox;
  padding: number;
  maxZoom: number;
}

/**
 * A flyTo-style instruction: "center the viewport on this point at this zoom".
 * The app layer converts this to `map.flyTo({ center, zoom })`.
 */
export interface ZoomToCenterInstruction {
  type: 'flyTo';
  center: [number, number];
  zoom: number;
}

export type ZoomToFeatureInstruction = ZoomToBoundsInstruction | ZoomToCenterInstruction;

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let result = value;
  if (min != null && result < min) result = min;
  if (max != null && result > max) result = max;
  return result;
}

/**
 * Compute an instruction for zooming a map to a feature so that:
 * - Point/zero-area geometries center at a sensible zoom (not zoomed out to the
 *   bbox padding fallback).
 * - Polygon/line geometries fit their bbox with padding, capped at `maxZoom` so
 *   tiny features don't snap to max zoom.
 * - The layer's configured `minZoom`/`maxZoom` are respected as bounds.
 *
 * Returns `null` if the geometry has no usable coordinates.
 */
export function zoomToFeature(
  geometry: Record<string, unknown> | null | undefined,
  options: ZoomToFeatureOptions = {},
): ZoomToFeatureInstruction | null {
  if (!geometry) return null;
  const bbox = rawBboxFromGeometry(geometry);
  if (!bbox) return null;

  const {
    layerMinZoom,
    layerMaxZoom,
    pointZoom = DEFAULT_POINT_ZOOM,
    padding = 50,
    maxZoom = DEFAULT_POLYGON_MAX_ZOOM,
  } = options;

  if (isZeroArea(bbox)) {
    // Point-like geometry: use flyTo with an appropriate zoom so we actually
    // zoom in. Prefer the layer's maxZoom if it's tighter than our default,
    // then clamp to the layer's [minZoom, maxZoom] range.
    const desired = layerMaxZoom != null ? Math.min(pointZoom, layerMaxZoom) : pointZoom;
    return {
      type: 'flyTo',
      center: bboxCenter(bbox),
      zoom: clamp(desired, layerMinZoom, layerMaxZoom),
    };
  }

  // Polygon/line: fit the bbox. Cap maxZoom by the layer's maxZoom so we don't
  // tell the map to zoom past what the layer supports.
  const effectiveMaxZoom = layerMaxZoom != null ? Math.min(maxZoom, layerMaxZoom) : maxZoom;
  return {
    type: 'fitBounds',
    bbox,
    padding,
    maxZoom: effectiveMaxZoom,
  };
}
