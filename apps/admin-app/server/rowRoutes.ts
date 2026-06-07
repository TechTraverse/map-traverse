/**
 * Row-level CRUD over uploaded PostGIS collections (tables in the `uploads`
 * schema, tracked in `map_admin.uploaded_datasets`). These routes sit alongside
 * the dataset-level routes in `dataRoutes.ts` and share the same `gis` pool and
 * `requireAuth` middleware.
 *
 * tipg (the read path) is NOT refreshed here: row edits don't change the table
 * schema, so the catalog tipg discovered at boot is still valid. We only
 * recompute the per-dataset stats (feature_count, bbox, updated_at) after each
 * mutation, inside the same transaction.
 *
 * Safety model: the table name is resolved from `uploaded_datasets` then
 * re-validated with `isValidIdentifier`; column identifiers (sort, filter,
 * property keys, geometry column) are validated with `isValidColumnName` AND
 * confirmed to exist in the introspected schema before being quoted into SQL.
 * Every value is a bind parameter. Geometry I/O is GeoJSON in EPSG:4326.
 */
import type express from 'express';
import type { Pool, PoolClient } from 'pg';
import { isValidIdentifier, isValidColumnName } from './sanitizeTableName.js';
import { introspectCollection, type CollectionSchema } from './columnIntrospection.js';
import {
  buildInsert,
  buildUpdate,
  buildRowsQuery,
  parsePaging,
  mapRowToApi,
  RowValidationError,
} from './rowSql.js';

export interface RowRouteDeps {
  app: express.Express;
  pool: Pool;
  requireAuth: express.RequestHandler;
}

const INTEGER_UDTS = new Set(['int2', 'int4', 'int8']);

/** Resolve a dataset id → its (validated) uploads table name, or send an error. */
async function resolveTable(
  pool: Pool,
  id: string,
  res: express.Response,
): Promise<string | null> {
  const found = await pool.query(
    'SELECT table_name FROM map_admin.uploaded_datasets WHERE id = $1',
    [id],
  );
  if (found.rows.length === 0) {
    res.status(404).json({ error: 'Dataset not found' });
    return null;
  }
  const tableName = (found.rows[0] as { table_name: string }).table_name;
  if (!isValidIdentifier(tableName)) {
    res.status(400).json({ error: 'Refusing to address unsafe table identifier' });
    return null;
  }
  return tableName;
}

/**
 * Confirm the introspected identifiers we splice into SQL (PK + geometry column)
 * are safe and present. ogr2ogr-loaded tables always have a PK, but guard anyway
 * so a malformed/PK-less table fails closed with a 400 rather than bad SQL.
 */
function validateSchemaIdentifiers(schema: CollectionSchema, res: express.Response): boolean {
  if (!isValidColumnName(schema.primaryKey)) {
    res.status(400).json({ error: 'Collection has no usable primary key' });
    return false;
  }
  if (schema.geometry && !isValidColumnName(schema.geometry.column)) {
    res.status(400).json({ error: 'Collection has an unsafe geometry column name' });
    return false;
  }
  return true;
}

/**
 * Reject malformed property keys BEFORE introspection so an injection-shaped key
 * short-circuits to 400 without touching PostGIS. (Existence — "is this a real,
 * editable column" — is enforced later by buildInsert/buildUpdate.) Returns the
 * first offending key, or null if all keys are well-formed.
 */
function firstMalformedKey(properties: Record<string, unknown>): string | null {
  for (const key of Object.keys(properties ?? {})) {
    if (!isValidColumnName(key)) return key;
  }
  return null;
}

/** True if the schema's PK column is an integer type (so non-numeric ids are invalid). */
function pkIsInteger(schema: CollectionSchema): boolean {
  const pk = schema.columns.find(c => c.isPrimaryKey);
  return !!pk && INTEGER_UDTS.has(pk.udtName);
}

/**
 * Validate inbound GeoJSON via PostGIS. Returns true if the geometry parses and
 * is OGC-valid; otherwise sends a 400 and returns false. Handles both
 * ST_IsValid=false and ST_GeomFromGeoJSON parse errors (malformed GeoJSON).
 */
async function checkGeometry(
  client: PoolClient,
  geometry: unknown,
  res: express.Response,
): Promise<boolean> {
  try {
    const valid = await client.query('SELECT ST_IsValid(ST_GeomFromGeoJSON($1)) AS ok', [
      JSON.stringify(geometry),
    ]);
    if (!(valid.rows[0] as { ok: boolean }).ok) {
      res.status(400).json({ error: 'Invalid geometry' });
      return false;
    }
    return true;
  } catch {
    res.status(400).json({ error: 'Invalid geometry' });
    return false;
  }
}

/**
 * Recompute per-dataset stats after a mutation. Runs on the SAME client/tx as
 * the mutation so a rolled-back edit doesn't leave stale counts. No tipg refresh.
 */
async function recomputeStats(
  client: PoolClient,
  datasetId: string,
  tableName: string,
  geomColumn: string | null,
): Promise<void> {
  const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM uploads."${tableName}"`);
  const featureCount = (countRes.rows[0] as { n: number }).n;

  let bbox: [number, number, number, number] | null = null;
  if (geomColumn) {
    const extRes = await client.query(
      `SELECT ST_XMin(e) AS minx, ST_YMin(e) AS miny, ST_XMax(e) AS maxx, ST_YMax(e) AS maxy
         FROM (SELECT ST_Extent("${geomColumn}") AS e FROM uploads."${tableName}") q`,
    );
    const r = extRes.rows[0] as
      | { minx: number | null; miny: number; maxx: number; maxy: number }
      | undefined;
    if (r && r.minx != null) bbox = [r.minx, r.miny, r.maxx, r.maxy];
  }

  await client.query(
    `UPDATE map_admin.uploaded_datasets
        SET feature_count = $2, bbox = $3, updated_at = now()
      WHERE id = $1`,
    [datasetId, featureCount, bbox ? JSON.stringify(bbox) : null],
  );
}

export function registerRowRoutes({ app, pool, requireAuth }: RowRouteDeps): void {
  // GET /api/data/:id/schema — introspected column/geometry/PK metadata.
  app.get('/api/data/:id/schema', requireAuth, async (req, res) => {
    try {
      const tableName = await resolveTable(pool, req.params.id, res);
      if (!tableName) return;
      const schema = await introspectCollection(pool, tableName);
      res.json({ ...schema, table: `uploads.${tableName}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to read collection schema' });
    }
  });

  // GET /api/data/:id/rows — paged, optionally filtered/sorted rows.
  app.get('/api/data/:id/rows', requireAuth, async (req, res) => {
    try {
      const tableName = await resolveTable(pool, req.params.id, res);
      if (!tableName) return;

      const q = req.query as Record<string, string | undefined>;

      // Format-validate column identifiers BEFORE hitting PostGIS so malformed
      // input short-circuits to 400 without touching the geometry catalog.
      if (q.sort !== undefined && !isValidColumnName(q.sort)) {
        res.status(400).json({ error: 'Invalid sort column' });
        return;
      }
      if (q.filterColumn !== undefined && !isValidColumnName(q.filterColumn)) {
        res.status(400).json({ error: 'Invalid filter column' });
        return;
      }

      const schema = await introspectCollection(pool, tableName);
      if (!validateSchemaIdentifiers(schema, res)) return;
      const columnNames = new Set(schema.columns.map(c => c.name));

      const sort = q.sort ?? schema.primaryKey;
      if (!columnNames.has(sort)) {
        res.status(400).json({ error: `Unknown sort column: ${sort}` });
        return;
      }
      if (q.filterColumn !== undefined && !columnNames.has(q.filterColumn)) {
        res.status(400).json({ error: `Unknown filter column: ${q.filterColumn}` });
        return;
      }

      const paging = parsePaging(q);
      const { rows: rowsQuery, count: countQuery } = buildRowsQuery(schema, tableName, {
        paging,
        sort,
        filterColumn: q.filterColumn,
        filter: q.filter,
      });

      const [rowsResult, countResult] = await Promise.all([
        pool.query(rowsQuery.text, rowsQuery.values),
        pool.query(countQuery.text, countQuery.values),
      ]);

      res.json({
        rows: (rowsResult.rows as Record<string, unknown>[]).map(r => mapRowToApi(schema, r)),
        total: (countResult.rows[0] as { total: number }).total,
        limit: paging.limit,
        offset: paging.offset,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to read rows' });
    }
  });

  // POST /api/data/:id/rows — insert a row.
  app.post('/api/data/:id/rows', requireAuth, async (req, res) => {
    const client = await pool.connect();
    let began = false;
    try {
      const tableName = await resolveTable(pool, req.params.id, res);
      if (!tableName) return;

      const body = req.body as { properties?: Record<string, unknown>; geometry?: unknown };
      const properties = body.properties ?? {};
      const geometry = body.geometry ?? null;

      const badKey = firstMalformedKey(properties);
      if (badKey !== null) {
        res.status(400).json({ error: `Invalid column name: ${JSON.stringify(badKey)}` });
        return;
      }

      const schema = await introspectCollection(pool, tableName);
      if (!validateSchemaIdentifiers(schema, res)) return;

      let insert;
      try {
        insert = buildInsert(schema, tableName, properties, geometry);
      } catch (e) {
        if (e instanceof RowValidationError) {
          res.status(400).json({ error: e.message });
          return;
        }
        throw e;
      }

      // Reject invalid geometry up front (clean 400 rather than a SQL error).
      if (geometry != null && schema.geometry) {
        if (!(await checkGeometry(client, geometry, res))) return;
      }

      await client.query('BEGIN');
      began = true;
      const inserted = await client.query(insert.text, insert.values);
      await recomputeStats(client, req.params.id, tableName, schema.geometry?.column ?? null);
      await client.query('COMMIT');
      began = false;

      res.status(201).json(mapRowToApi(schema, inserted.rows[0] as Record<string, unknown>));
    } catch (err) {
      if (began) await client.query('ROLLBACK').catch(() => undefined);
      console.error(err);
      res.status(500).json({ error: 'Insert failed' });
    } finally {
      client.release();
    }
  });

  // PUT /api/data/:id/rows/:rowId — update a row by PK value.
  app.put('/api/data/:id/rows/:rowId', requireAuth, async (req, res) => {
    const client = await pool.connect();
    let began = false;
    try {
      const tableName = await resolveTable(pool, req.params.id, res);
      if (!tableName) return;

      const body = req.body as { properties?: Record<string, unknown>; geometry?: unknown };
      const properties = body.properties ?? {};
      // Distinguish "absent" from "null": only touch geometry when the key is present.
      const geometry = 'geometry' in body ? body.geometry : undefined;

      const badKey = firstMalformedKey(properties);
      if (badKey !== null) {
        res.status(400).json({ error: `Invalid column name: ${JSON.stringify(badKey)}` });
        return;
      }

      const schema = await introspectCollection(pool, tableName);
      if (!validateSchemaIdentifiers(schema, res)) return;

      if (pkIsInteger(schema) && !/^-?\d+$/.test(req.params.rowId)) {
        res.status(400).json({ error: 'Invalid row id' });
        return;
      }

      let update;
      try {
        update = buildUpdate(schema, tableName, properties, geometry, req.params.rowId);
      } catch (e) {
        if (e instanceof RowValidationError) {
          res.status(400).json({ error: e.message });
          return;
        }
        throw e;
      }

      if (geometry != null && schema.geometry) {
        if (!(await checkGeometry(client, geometry, res))) return;
      }

      await client.query('BEGIN');
      began = true;
      const updated = await client.query(update.text, update.values);
      if (updated.rows.length === 0) {
        await client.query('ROLLBACK');
        began = false;
        res.status(404).json({ error: 'Row not found' });
        return;
      }
      await recomputeStats(client, req.params.id, tableName, schema.geometry?.column ?? null);
      await client.query('COMMIT');
      began = false;

      res.json(mapRowToApi(schema, updated.rows[0] as Record<string, unknown>));
    } catch (err) {
      if (began) await client.query('ROLLBACK').catch(() => undefined);
      console.error(err);
      res.status(500).json({ error: 'Update failed' });
    } finally {
      client.release();
    }
  });

  // DELETE /api/data/:id/rows/:rowId — delete a row by PK value.
  app.delete('/api/data/:id/rows/:rowId', requireAuth, async (req, res) => {
    const client = await pool.connect();
    let began = false;
    try {
      const tableName = await resolveTable(pool, req.params.id, res);
      if (!tableName) return;

      const schema = await introspectCollection(pool, tableName);
      if (!validateSchemaIdentifiers(schema, res)) return;
      if (pkIsInteger(schema) && !/^-?\d+$/.test(req.params.rowId)) {
        res.status(400).json({ error: 'Invalid row id' });
        return;
      }

      await client.query('BEGIN');
      began = true;
      const deleted = await client.query(
        `DELETE FROM uploads."${tableName}" WHERE "${schema.primaryKey}" = $1`,
        [req.params.rowId],
      );
      if ((deleted.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        began = false;
        res.status(404).json({ error: 'Row not found' });
        return;
      }
      await recomputeStats(client, req.params.id, tableName, schema.geometry?.column ?? null);
      await client.query('COMMIT');
      began = false;

      res.json({ deleted: req.params.rowId });
    } catch (err) {
      if (began) await client.query('ROLLBACK').catch(() => undefined);
      console.error(err);
      res.status(500).json({ error: 'Delete failed' });
    } finally {
      client.release();
    }
  });
}
