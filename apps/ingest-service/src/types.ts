/**
 * Contract types shared between the ingest sidecar and the admin-app server.
 *
 * The admin-app forwards uploads to `POST /ingest` and relies on these shapes;
 * its route tests mock the sidecar with `IngestResponse`. The contract test
 * (`__tests__/contract.test.ts`) pins the real service output against this type
 * so the mock can't silently drift.
 */

/** The GIS formats we accept, matching the map-client's export formats. */
export type FormatId = 'geojson' | 'csv' | 'kml' | 'shp-zip' | 'fgb' | 'gpkg';

export const FORMAT_IDS: readonly FormatId[] = [
  'geojson',
  'csv',
  'kml',
  'shp-zip',
  'fgb',
  'gpkg',
] as const;

/** A layer discovered inside a multi-layer container (GeoPackage / KML). */
export interface LayerInfo {
  name: string;
  geometryType?: string;
  featureCount?: number;
}

/** Request fields accepted by `POST /ingest` (alongside the `file` part). */
export interface IngestRequestFields {
  /** One of the 6 format ids, or `auto` to detect from extension + magic bytes. */
  format: FormatId | 'auto';
  /** Pre-sanitized destination table name (no schema prefix). */
  table: string;
  /** Always `uploads`; validated against an allowlist server-side. */
  schema: string;
  /** Override source SRS, e.g. `EPSG:2232`, used when the file declares none. */
  srs?: string;
  /** CSV WKT geometry column name(s), comma-separated. */
  geomField?: string;
  /** Which sublayer to import from a multi-layer GeoPackage / KML. */
  layer?: string;
}

/** Successful ingest result. */
export interface IngestResponse {
  table: string;
  schema: string;
  /** The resolved format that was ingested (never `auto`). */
  format: FormatId;
  geometryType: string | null;
  srid: number;
  featureCount: number;
  bbox: [number, number, number, number] | null;
  /** True when no source CRS was found and 4326 was assumed. */
  crsAssumed: boolean;
}

/** 400 returned when a multi-layer file needs the caller to pick a layer. */
export interface NeedsLayerResponse {
  error: string;
  needsLayer: true;
  layers: LayerInfo[];
}

/** Generic error envelope (4xx/5xx). */
export interface IngestErrorResponse {
  error: string;
  /** Tail of ogr2ogr stderr on 5xx, truncated. */
  stderr?: string;
}
