/** Build a GeoJSON Polygon from two corner points [lng, lat]. */
export function buildBoxPolygon(
  corner1: [number, number],
  corner2: [number, number],
): GeoJSON.Polygon {
  const [lng1, lat1] = corner1;
  const [lng2, lat2] = corner2;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng1, lat1],
      [lng2, lat1],
      [lng2, lat2],
      [lng1, lat2],
      [lng1, lat1],
    ]],
  };
}

/** Build a GeoJSON Feature for the box draw preview rectangle. */
export function buildBoxDrawData(
  corner1: [number, number],
  corner2: [number, number],
): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: buildBoxPolygon(corner1, corner2),
  };
}
