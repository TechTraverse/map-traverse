/**
 * Pure SQL builders for row-level CRUD over uploaded PostGIS collections.
 *
 * These are deliberately DB-free so they can be unit-tested without a database:
 * every function takes a `CollectionSchema` (resolved upstream by
 * `introspectCollection`) plus the request payload and returns a parameterized
 * `{ text, values }`. Identifiers are validated with `isValidColumnName` and
 * confirmed to exist in the schema before being spliced (double-quoted) into
 * SQL; all column *values* are passed as bind parameters, never interpolated.
 *
 * Geometry I/O is GeoJSON in EPSG:4326. Inbound geometry is parsed with
 * `ST_GeomFromGeoJSON`, tagged 4326, transformed to the column SRID, and (when
 * the column's declared type is a MULTI* type) promoted via `ST_Multi` so a
 * single Polygon/LineString/Point round-trips into a Multi* column.
 */
import type { CollectionColumn, CollectionSchema } from './columnIntrospection.js';
import { isValidColumnName } from './sanitizeTableName.js';

export interface SqlQuery {
  text: string;
  values: unknown[];
}

/** Thrown when a payload references an unknown / unsafe column. Maps to HTTP 400. */
export class RowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RowValidationError';
  }
}

const UPLOADS = 'uploads';

/** Quote a column identifier that has already been validated as safe. */
export function q(name: string): string {
  return `"${name}"`;
}

/** Attribute columns = everything that isn't the PK or the geometry column. */
function attributeColumns(schema: CollectionSchema): CollectionColumn[] {
  return schema.columns.filter(c => !c.isPrimaryKey && !c.isGeometry);
}

/** Editable column names = the attribute columns, as a lookup set. */
function editableColumns(schema: CollectionSchema): Set<string> {
  return new Set(attributeColumns(schema).map(c => c.name));
}

/**
 * SQL expression that converts an inbound GeoJSON bind param (at $paramIndex,
 * a JSON string) into a geometry in the column's SRID, promoting to MULTI* when
 * the column's declared type requires it.
 */
export function geometryExpr(paramIndex: number, srid: number, declaredType: string): string {
  const base = `ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}), 4326), ${Number(srid)})`;
  return declaredType.toUpperCase().startsWith('MULTI') ? `ST_Multi(${base})` : base;
}

/**
 * SELECT clause that yields a row in the API shape: the PK column (by its real
 * name), every non-PK non-geometry column, and the geometry rendered as GeoJSON
 * (aliased back to the geometry column's name). Pair with `mapRowToApi`.
 */
export function rowSelectClause(schema: CollectionSchema): string {
  const exprs: string[] = [q(schema.primaryKey)];
  for (const c of attributeColumns(schema)) {
    exprs.push(q(c.name));
  }
  if (schema.geometry) {
    exprs.push(`ST_AsGeoJSON(${q(schema.geometry.column)})::json AS ${q(schema.geometry.column)}`);
  }
  return exprs.join(', ');
}

/** Map a raw pg row (selected via `rowSelectClause`) into the API shape. */
export function mapRowToApi(
  schema: CollectionSchema,
  raw: Record<string, unknown>,
): { id: unknown; properties: Record<string, unknown>; geometry: unknown } {
  const properties: Record<string, unknown> = {};
  for (const c of attributeColumns(schema)) {
    properties[c.name] = raw[c.name];
  }
  return {
    id: raw[schema.primaryKey],
    properties,
    geometry: schema.geometry ? (raw[schema.geometry.column] ?? null) : null,
  };
}

/** Validate that every property key is a safe, known, editable column. */
function assertEditableKeys(schema: CollectionSchema, properties: Record<string, unknown>): void {
  const editable = editableColumns(schema);
  for (const key of Object.keys(properties ?? {})) {
    if (!isValidColumnName(key)) {
      throw new RowValidationError(`Invalid column name: ${JSON.stringify(key)}`);
    }
    if (!editable.has(key)) {
      throw new RowValidationError(`Unknown or non-editable column: ${key}`);
    }
  }
}

/**
 * Build an INSERT for a new row. `geometry` is GeoJSON (any singlepart or
 * multipart geometry) or null. Returns `{ text, values }`; RETURNING yields the
 * inserted row in the API shape (feed through `mapRowToApi`).
 */
export function buildInsert(
  schema: CollectionSchema,
  tableName: string,
  properties: Record<string, unknown>,
  geometry: unknown | null,
): SqlQuery {
  assertEditableKeys(schema, properties);

  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const [key, val] of Object.entries(properties ?? {})) {
    cols.push(q(key));
    placeholders.push(`$${i++}`);
    values.push(val);
  }

  if (geometry != null && schema.geometry) {
    values.push(JSON.stringify(geometry));
    placeholders.push(geometryExpr(i++, schema.geometry.srid, schema.geometry.type));
    cols.push(q(schema.geometry.column));
  }

  const target = `${UPLOADS}.${q(tableName)}`;
  const text =
    cols.length === 0
      ? `INSERT INTO ${target} DEFAULT VALUES RETURNING ${rowSelectClause(schema)}`
      : `INSERT INTO ${target} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${rowSelectClause(schema)}`;

  return { text, values };
}

/**
 * Build an UPDATE for an existing row by PK value. `geometry` semantics:
 *   - undefined → geometry column left untouched
 *   - null      → geometry column set to NULL
 *   - GeoJSON   → geometry column replaced (transformed / promoted as needed)
 */
export function buildUpdate(
  schema: CollectionSchema,
  tableName: string,
  properties: Record<string, unknown>,
  geometry: unknown | null | undefined,
  rowId: unknown,
): SqlQuery {
  assertEditableKeys(schema, properties);

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const [key, val] of Object.entries(properties ?? {})) {
    sets.push(`${q(key)} = $${i++}`);
    values.push(val);
  }

  if (geometry !== undefined && schema.geometry) {
    if (geometry === null) {
      sets.push(`${q(schema.geometry.column)} = NULL`);
    } else {
      values.push(JSON.stringify(geometry));
      sets.push(`${q(schema.geometry.column)} = ${geometryExpr(i++, schema.geometry.srid, schema.geometry.type)}`);
    }
  }

  if (sets.length === 0) {
    throw new RowValidationError('No fields to update');
  }

  values.push(rowId);
  const whereIdx = i;
  const text =
    `UPDATE ${UPLOADS}.${q(tableName)} SET ${sets.join(', ')} ` +
    `WHERE ${q(schema.primaryKey)} = $${whereIdx} RETURNING ${rowSelectClause(schema)}`;

  return { text, values };
}

export interface PagingParams {
  limit: number;
  offset: number;
  order: 'ASC' | 'DESC';
}

/** Parse + clamp paging/sort-direction query params (pure; DB-free). */
export function parsePaging(query: {
  limit?: unknown;
  offset?: unknown;
  order?: unknown;
}): PagingParams {
  const rawLimit = Number.parseInt(String(query.limit ?? ''), 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, rawLimit)) : 50;

  const rawOffset = Number.parseInt(String(query.offset ?? ''), 10);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  const order = String(query.order ?? '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { limit, offset, order };
}

/**
 * Build the paged SELECT (and matching COUNT) for GET rows. `sort`/`filterColumn`
 * must already be validated (format + existence). Returns both queries with their
 * bind values.
 */
export function buildRowsQuery(
  schema: CollectionSchema,
  tableName: string,
  opts: {
    paging: PagingParams;
    sort: string;
    filterColumn?: string;
    filter?: string;
  },
): { rows: SqlQuery; count: SqlQuery } {
  const target = `${UPLOADS}.${q(tableName)}`;
  const whereParts: string[] = [];
  const filterValues: unknown[] = [];

  if (opts.filterColumn && opts.filter != null && opts.filter !== '') {
    filterValues.push(opts.filter);
    whereParts.push(`${q(opts.filterColumn)}::text ILIKE '%' || $1 || '%'`);
  }
  const whereClause = whereParts.length ? ` WHERE ${whereParts.join(' AND ')}` : '';

  // rows query: filter param(s) first, then limit/offset.
  const limitIdx = filterValues.length + 1;
  const offsetIdx = filterValues.length + 2;
  const rows: SqlQuery = {
    text:
      `SELECT ${rowSelectClause(schema)} FROM ${target}${whereClause} ` +
      `ORDER BY ${q(opts.sort)} ${opts.paging.order} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values: [...filterValues, opts.paging.limit, opts.paging.offset],
  };

  const count: SqlQuery = {
    text: `SELECT COUNT(*)::int AS total FROM ${target}${whereClause}`,
    values: [...filterValues],
  };

  return { rows, count };
}
