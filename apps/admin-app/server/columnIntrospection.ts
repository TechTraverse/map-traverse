/**
 * Resolve the live schema of an uploaded PostGIS collection (a table under the
 * `uploads` schema) directly from the catalog. Nothing is assumed about the
 * primary key, geometry column, or SRID — ogr2ogr's output varies by source
 * format (ogc_fid vs gid vs fid; geom vs wkb_geometry; 4326 vs the source CRS),
 * so the row CRUD routes introspect rather than hardcode.
 *
 * All queries are parameterized; the table name reaches here only after the
 * caller has validated it via `isValidIdentifier`.
 */
import type { Pool } from 'pg';

export interface CollectionColumn {
  name: string;
  dataType: string;
  udtName: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isGeometry: boolean;
}

export interface CollectionSchema {
  primaryKey: string;
  geometry: { column: string; type: string; srid: number } | null;
  columns: CollectionColumn[];
}

const UPLOADS_SCHEMA = 'uploads';

export async function introspectCollection(
  pool: Pool,
  tableName: string,
): Promise<CollectionSchema> {
  // The three catalog lookups are independent — fire them concurrently.
  const [colsResult, geomResult, pkResult] = await Promise.all([
    // Columns (name, type, nullability) in declaration order.
    pool.query(
      `SELECT column_name, data_type, udt_name, is_nullable, ordinal_position
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      [UPLOADS_SCHEMA, tableName],
    ),
    // Geometry column + declared geometry type + SRID from PostGIS.
    pool.query(
      `SELECT f_geometry_column, type, srid
         FROM geometry_columns
        WHERE f_table_schema = $1 AND f_table_name = $2
        LIMIT 1`,
      [UPLOADS_SCHEMA, tableName],
    ),
    // Primary key column name.
    pool.query(
      `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY kcu.ordinal_position
        LIMIT 1`,
      [UPLOADS_SCHEMA, tableName],
    ),
  ]);

  const geomRow = geomResult.rows[0] as
    | { f_geometry_column: string; type: string; srid: number }
    | undefined;
  const geometry = geomRow
    ? { column: geomRow.f_geometry_column, type: geomRow.type, srid: Number(geomRow.srid) }
    : null;

  const primaryKey = (pkResult.rows[0] as { column_name: string } | undefined)?.column_name ?? '';

  const geometryColumn = geometry?.column;
  const columns: CollectionColumn[] = (
    colsResult.rows as Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
    }>
  ).map(row => ({
    name: row.column_name,
    dataType: row.data_type,
    udtName: row.udt_name,
    nullable: row.is_nullable === 'YES',
    isPrimaryKey: row.column_name === primaryKey,
    isGeometry: row.column_name === geometryColumn,
  }));

  return { primaryKey, geometry, columns };
}
