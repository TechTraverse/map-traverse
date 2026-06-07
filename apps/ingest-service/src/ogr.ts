/**
 * Pure builder for the `ogr2ogr` argument vector. Kept free of side effects so
 * it can be exhaustively unit-tested. Critically, every value is a separate
 * argv element passed to `execFile` (never a shell string), so request-supplied
 * values cannot inject shell or ogr2ogr options.
 */
import type { FormatId } from './types.js';

export interface OgrBuildOptions {
  /** Destination schema (always `uploads`). */
  schema: string;
  /** Sanitized destination table name. */
  table: string;
  /** PostgreSQL connection string (the `PG:host=... password=...` form). */
  pgConn: string;
  /** Path to the local source file ogr2ogr should read. */
  srcPath: string;
  format: FormatId;
  /** True if the source declares its own CRS (.prj, embedded, CRS84, etc.). */
  hasSourceCrs: boolean;
  /** Source SRS override (e.g. `EPSG:2232`), used only when no source CRS. */
  srs?: string;
  /** CSV WKT geometry column name(s), comma-separated. */
  geomField?: string;
  /** Sublayer to import from a multi-layer GeoPackage / KML. */
  layer?: string;
}

const DEFAULT_CSV_GEOM_NAMES = 'geom,wkt,the_geom,geometry';

/**
 * Open options that make GDAL treat a CSV's WKT column as geometry. These must
 * be supplied to BOTH `ogr2ogr` (the load) and `ogrinfo` (the preflight
 * inspection) — without them ogrinfo sees an aspatial table and the ingest is
 * rejected as "No spatial layer found" before ogr2ogr ever runs.
 */
function csvOpenOptions(geomField?: string): string[] {
  const geomNames = geomField?.trim() || DEFAULT_CSV_GEOM_NAMES;
  return [
    '-oo', `GEOM_POSSIBLE_NAMES=${geomNames}`,
    '-oo', 'KEEP_GEOM_COLUMNS=NO',
    '-oo', 'AUTODETECT_TYPE=YES',
  ];
}

/**
 * Build the argv for `execFile('ogr2ogr', argv)`. Order follows
 * `docker/seed/load-shapefiles.sh`: `-f PostgreSQL <dst> <src> [layer] <opts>`.
 */
export function buildOgr2OgrArgs(opts: OgrBuildOptions): string[] {
  const dest = `${opts.schema}.${opts.table}`;
  const args: string[] = ['-f', 'PostgreSQL', opts.pgConn];

  // Open options must precede the source path.
  if (opts.format === 'csv') {
    args.push(...csvOpenOptions(opts.geomField));
  }

  args.push(opts.srcPath);

  // Positional sublayer selector (GeoPackage / KML) comes right after the src.
  if (opts.layer) {
    args.push(opts.layer);
  }

  args.push(
    '-nln', dest,
    '-nlt', 'PROMOTE_TO_MULTI',
    '-lco', 'GEOMETRY_NAME=geom',
    // Use `ogc_fid` (not `gid`) for the generated FID column. Exported files
    // routinely carry their own `gid` attribute; when GDAL types it as a
    // non-Integer (GeoPackage→String, Shapefile→Real, KML→String) ogr2ogr
    // aborts with "Wrong field type for gid". `ogc_fid` is GDAL's own PG
    // default and won't collide with user attributes, while still giving tipg
    // a usable integer id.
    '-lco', 'FID=ogc_fid',
    '-lco', `SCHEMA=${opts.schema}`,
    '-lco', 'SPATIAL_INDEX=GIST',
    '-t_srs', 'EPSG:4326',
    '-overwrite',
    '--config', 'PG_USE_COPY', 'YES',
  );

  // Self-repair a missing/short .shx sidecar so a slightly-malformed shapefile
  // still loads instead of failing outright.
  if (opts.format === 'shp-zip') {
    args.push('--config', 'SHAPE_RESTORE_SHX', 'YES');
  }

  // Only assert a source SRS when the file doesn't carry its own — otherwise we
  // let GDAL read the native CRS and just reproject with -t_srs.
  if (!opts.hasSourceCrs) {
    args.push('-s_srs', opts.srs?.trim() || 'EPSG:4326');
  }

  return args;
}

export interface OgrInfoOptions {
  format?: FormatId;
  /** CSV WKT geometry column name(s), comma-separated. */
  geomField?: string;
}

/**
 * Build the `ogrinfo -json -ro -so <src>` argv used for layer/geometry
 * preflight. For CSV the same WKT open-options as the load must be applied
 * (and, like ogr2ogr, they must precede the source path) so GDAL recognizes
 * the geometry column during inspection.
 */
export function buildOgrInfoArgs(srcPath: string, opts: OgrInfoOptions = {}): string[] {
  const args = ['-json', '-ro', '-so'];
  if (opts.format === 'csv') {
    args.push(...csvOpenOptions(opts.geomField));
  }
  args.push(srcPath);
  return args;
}

/**
 * Validate a caller-supplied source SRS before it reaches `-s_srs`. GDAL would
 * otherwise happily treat an arbitrary string as a virtual-filesystem path
 * (e.g. `/vsicurl/http://attacker/evil.prj`) — an SSRF vector. Restrict to
 * authority-coded CRS forms.
 */
const SRS_RE = /^(?:(?:EPSG|ESRI|IAU|IGNF|SR-ORG):[0-9A-Za-z]+|OGC:CRS84|CRS84)$/i;
export function isValidSrs(srs: string): boolean {
  return SRS_RE.test(srs.trim());
}

/** Validate a CSV WKT geometry column name (or comma-separated candidates). */
const GEOM_FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*$/;
export function isValidGeomField(name: string): boolean {
  return GEOM_FIELD_RE.test(name.trim());
}

/** Compose the PG connection string ogr2ogr understands from discrete fields. */
export function buildPgConn(cfg: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): string {
  return `PG:host=${cfg.host} port=${cfg.port} dbname=${cfg.database} user=${cfg.user} password=${cfg.password}`;
}
