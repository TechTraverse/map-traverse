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

  const countRes = await pool.query(`SELECT count(*)::int AS n FROM ${rel}`);
  const featureCount = (countRes.rows[0]?.n as number) ?? 0;

  const metaRes = await pool.query(
    `SELECT GeometryType(geom) AS gt, ST_SRID(geom) AS srid
       FROM ${rel}
      WHERE geom IS NOT NULL
      LIMIT 1`,
  );
  const geometryType = (metaRes.rows[0]?.gt as string | null) ?? null;
  const srid = (metaRes.rows[0]?.srid as number | undefined) ?? 4326;

  let bbox: [number, number, number, number] | null = null;
  if (featureCount > 0 && geometryType) {
    const extentRes = await pool.query(
      `SELECT ST_XMin(e) AS minx, ST_YMin(e) AS miny, ST_XMax(e) AS maxx, ST_YMax(e) AS maxy
         FROM (SELECT ST_Extent(geom) AS e FROM ${rel}) s`,
    );
    const r = extentRes.rows[0] as { minx: number; miny: number; maxx: number; maxy: number } | undefined;
    if (r && r.minx != null) {
      bbox = [Number(r.minx), Number(r.miny), Number(r.maxx), Number(r.maxy)];
    }
  }

  return { geometryType, srid, featureCount, bbox };
}

/** Best-effort drop of a (possibly partial) table after a failed ingest. */
export async function dropTable(pool: Pool, table: string): Promise<void> {
  if (!isValidIdentifier(table)) return;
  await pool.query(`DROP TABLE IF EXISTS ${qualified(table)}`);
}
