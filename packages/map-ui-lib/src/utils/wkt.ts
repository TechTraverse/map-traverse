type Coord = [number, number];
type Ring = Coord[];

function coordToWkt(coord: Coord): string {
  return `${coord[0]} ${coord[1]}`;
}

function ringToWkt(ring: Ring): string {
  return ring.map(coordToWkt).join(', ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function geojsonGeometryToWkt(geometry: any): string {
  if (!geometry || !geometry.type) return '';

  switch (geometry.type) {
    case 'Point':
      return `POINT (${coordToWkt(geometry.coordinates)})`;

    case 'MultiPoint':
      return `MULTIPOINT (${(geometry.coordinates as Coord[]).map((c) => `(${coordToWkt(c)})`).join(', ')})`;

    case 'LineString':
      return `LINESTRING (${ringToWkt(geometry.coordinates)})`;

    case 'MultiLineString':
      return `MULTILINESTRING (${(geometry.coordinates as Ring[]).map((r) => `(${ringToWkt(r)})`).join(', ')})`;

    case 'Polygon':
      return `POLYGON (${(geometry.coordinates as Ring[]).map((r) => `(${ringToWkt(r)})`).join(', ')})`;

    case 'MultiPolygon':
      return `MULTIPOLYGON (${(geometry.coordinates as Ring[][]).map((poly) => `(${poly.map((r) => `(${ringToWkt(r)})`).join(', ')})`).join(', ')})`;

    case 'GeometryCollection':
      return `GEOMETRYCOLLECTION (${(geometry.geometries as unknown[]).map(geojsonGeometryToWkt).join(', ')})`;

    default:
      return '';
  }
}
