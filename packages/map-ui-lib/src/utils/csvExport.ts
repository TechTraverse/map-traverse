import type { GeoJsonFeature } from './ogcApi';
import { geojsonGeometryToWkt } from './wkt';
import { downloadBlob } from './download';

export interface CsvExportOptions {
  fields?: string[];
  includeGeometry?: boolean;
  delimiter?: string;
}

function escapeCell(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function featurePropertyValue(feature: GeoJsonFeature, key: string): string {
  const val = (feature.properties ?? {})[key];
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function featuresToCsv(
  features: GeoJsonFeature[],
  options: CsvExportOptions = {},
): string {
  const { fields, includeGeometry = true, delimiter = ',' } = options;

  if (features.length === 0) return '';

  const allKeys =
    fields ?? [...new Set(features.flatMap((f) => Object.keys(f.properties ?? {})))];

  const headers = includeGeometry ? [...allKeys, 'geometry'] : allKeys;

  const rows = features.map((feature) => {
    const cells = allKeys.map((key) =>
      escapeCell(featurePropertyValue(feature, key), delimiter),
    );
    if (includeGeometry) {
      cells.push(escapeCell(geojsonGeometryToWkt(feature.geometry), delimiter));
    }
    return cells.join(delimiter);
  });

  return [headers.map((h) => escapeCell(h, delimiter)).join(delimiter), ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
