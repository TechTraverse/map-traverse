import type { GeoJsonFeature } from './ogcApi';

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
  const { fields, includeGeometry = false, delimiter = ',' } = options;

  if (features.length === 0) return '';

  const allKeys =
    fields ?? [...new Set(features.flatMap((f) => Object.keys(f.properties ?? {})))];

  const headers = includeGeometry ? [...allKeys, 'geometry'] : allKeys;

  const rows = features.map((feature) => {
    const cells = allKeys.map((key) =>
      escapeCell(featurePropertyValue(feature, key), delimiter),
    );
    if (includeGeometry) {
      cells.push(escapeCell(JSON.stringify(feature.geometry), delimiter));
    }
    return cells.join(delimiter);
  });

  return [headers.map((h) => escapeCell(h, delimiter)).join(delimiter), ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
