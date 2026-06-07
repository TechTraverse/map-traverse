/**
 * PostGIS access for post-ingest introspection (geometry type, SRID, count,
 * extent) and table teardown on failure. ogr2ogr does the actual load; this
 * pool only reads stats and, on error, drops a partial table.
 */
import { Pool } from 'pg';
import { isValidIdentifier } from './identifiers.js';

export function createPool(): Pool {
  return new Pool({
    host: process.env.INGEST_DB_HOST ?? 'localhost',
    port: Number(process.env.INGEST_DB_PORT ?? 5432),
    database: process.env.INGEST_DB_NAME ?? 'gis',
    user: process.env.INGEST_DB_USER ?? 'postgres',
    password: process.env.INGEST_DB_PASSWORD ?? 'postgres',
  });
}

export interface TableStats {
  geometryType: string | null;
  srid: number;
  featureCount: number;
  bbox: [number, number, number, number] | null;
}

const SCHEMA = 'uploads';

function qualified(table: string): string {
  if (!isValidIdentifier(table)) {
    throw new Error(`Refusing to query unsafe identifier: ${table}`);
  }
  // Both parts validated/constant — safe to interpolate.
  return `"${SCHEMA}"."${table}"`;
}

/** Read geometry type / SRID / feature count / bbox for a freshly loaded table. */
export async function collectTableStats(pool: Pool, table: string): Promise<TableStats> {
  const rel = qualified(table);

  // Single scan: count, a representative geometry type + SRID (aggregates skip
  // NULL geom), and the extent envelope — instead of three separate scans.
  const res = await pool.query(
    `SELECT count(*)::int AS n,
            min(GeometryType(geom)) AS gt,
            min(ST_SRID(geom))::int AS srid,
            ST_XMin(ST_Extent(geom)) AS minx, ST_YMin(ST_Extent(geom)) AS miny,
            ST_XMax(ST_Extent(geom)) AS maxx, ST_YMax(ST_Extent(geom)) AS maxy
       FROM ${rel}`,
  );
  const row = res.rows[0] as {
    n: number; gt: string | null; srid: number | null;
    minx: number | null; miny: number | null; maxx: number | null; maxy: number | null;
  };

  const bbox: [number, number, number, number] | null =
    row.minx != null ? [Number(row.minx), Number(row.miny), Number(row.maxx), Number(row.maxy)] : null;

  return {
    geometryType: row.gt ?? null,
    srid: row.srid ?? 4326,
    featureCount: row.n ?? 0,
    bbox,
  };
}

/** Best-effort drop of a (possibly partial) table after a failed ingest. */
export async function dropTable(pool: Pool, table: string): Promise<void> {
  if (!isValidIdentifier(table)) return;
  await pool.query(`DROP TABLE IF EXISTS ${qualified(table)}`);
}
