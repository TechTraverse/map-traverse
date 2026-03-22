import type { ExportFormatOption } from '../components/ExportModal/ExportModal';

export const DEFAULT_EXPORT_FORMATS: ExportFormatOption[] = [
  { id: 'csv', label: 'CSV', extension: '.csv', description: 'Comma-separated values' },
  { id: 'geojson', label: 'GeoJSON', extension: '.geojson', description: 'GeoJSON format' },
  { id: 'kml', label: 'KML', extension: '.kml', description: 'Google Earth' },
  { id: 'shapefile', label: 'Shapefile', extension: '.zip', description: 'Esri Shapefile' },
  { id: 'flatgeobuf', label: 'FlatGeobuf', extension: '.fgb', description: 'FlatGeobuf' },
  { id: 'geopackage', label: 'GeoPackage', extension: '.gpkg', description: 'OGC GeoPackage' },
];
