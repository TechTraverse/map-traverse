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
