/**
 * "My Data" endpoints: upload a GIS file, list/inspect uploaded datasets, and
 * delete them. Uploads are forwarded to the ingest sidecar (which runs ogr2ogr
 * into the `uploads` PostGIS schema); tipg then serves them as
 * `uploads.<table>` collections under the auto-detected `tipg-local` source.
 *
 * Registered from `index.ts` so it reuses the app's `requireAuth` middleware and
 * shared `pool`. Kept in a module (rather than inline) so the route tests can
 * mock the sidecar/tipg via `global.fetch`.
 */
import express from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs/promises';
import type { Pool } from 'pg';
import { sanitizeTableName, isValidIdentifier } from './sanitizeTableName.js';

/** Mirrors the sidecar's IngestResponse — see apps/ingest-service/src/types.ts. */
interface IngestResult {
  table: string;
  schema: string;
  format: string;
  geometryType: string | null;
  srid: number;
  featureCount: number;
  bbox: [number, number, number, number] | null;
  crsAssumed: boolean;
}

const INGEST_SERVICE_URL = process.env.INGEST_SERVICE_URL ?? 'http://localhost:8081';
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 100) * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.geojson', '.json', '.csv', '.kml', '.zip', '.fgb', '.gpkg']);

const TIPG_SOURCE_ID = 'tipg-local';

function extname(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i).toLowerCase();
}

export interface DataRouteDeps {
  app: express.Express;
  pool: Pool;
  requireAuth: express.RequestHandler;
}

/**
 * Best-effort tipg catalog refresh after an upload/delete so newly created (or
 * dropped) `uploads.*` tables surface without a container restart. Entirely
 * non-fatal: the data is already loaded/dropped by the time we get here.
 *
 * Preferred path is `TIPG_REFRESH_URL` — an internal URL reachable from inside
 * the server container (the per-source `metadata.refreshUrl` is a *browser-origin*
 * URL and is often unreachable server-side under Docker). If unset, fall back to
 * pinging the stored refreshUrl of each feature source.
 */
async function refreshTipg(pool: Pool): Promise<boolean> {
  try {
    const internal = process.env.TIPG_REFRESH_URL;
    if (internal) {
      try {
        await fetch(internal, { signal: AbortSignal.timeout(15_000) });
        return true;
      } catch {
        return false;
      }
    }
    const result = await pool.query(
      "SELECT metadata FROM map_admin.ogc_sources WHERE source_type = 'features'",
    );
    let refreshed = false;
    for (const row of result.rows as Array<{ metadata: { refreshUrl?: string } | null }>) {
      const refreshUrl = row.metadata?.refreshUrl;
      if (!refreshUrl) continue;
      try {
        await fetch(refreshUrl, { signal: AbortSignal.timeout(15_000) });
        refreshed = true;
      } catch {
        // ignore individual source failures
      }
    }
    return refreshed;
  } catch {
    return false;
  }
}

/**
 * Derive a tipg items preview URL for an uploaded collection. Uses a public tipg
 * base (`TIPG_PUBLIC_URL`) if configured, else any known local feature source's
 * URL. Best-effort — returns null if none is known.
 */
async function previewUrlFor(pool: Pool, collection: string): Promise<string | null> {
  let base = process.env.TIPG_PUBLIC_URL?.replace(/\/+$/, '') ?? null;
  if (!base) {
    const result = await pool.query(
      "SELECT url FROM map_admin.ogc_sources WHERE source_type = 'features' ORDER BY created_at LIMIT 1",
    );
    if (result.rows.length === 0) return null;
    base = (result.rows[0] as { url: string }).url.replace(/\/+$/, '');
  }
  return `${base}/collections/${collection}/items?f=json&limit=100`;
}

export function registerDataRoutes({ app, pool, requireAuth }: DataRouteDeps): void {
  const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_EXTENSIONS.has(extname(file.originalname))) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${extname(file.originalname) || file.originalname}`));
      }
    },
  });

  // GET /api/data — list uploaded datasets (open, like GET /api/sources).
  app.get('/api/data', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, table_name, label, original_filename, format, geometry_type,
                srid, feature_count, bbox, crs_assumed, created_by, created_at, updated_at
           FROM map_admin.uploaded_datasets
          ORDER BY created_at DESC`,
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/data/:id — single dataset + derived collection id + preview URL.
  app.get('/api/data/:id', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM map_admin.uploaded_datasets WHERE id = $1',
        [req.params.id],
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Dataset not found' });
        return;
      }
      const row = result.rows[0] as { table_name: string };
      const collection = `uploads.${row.table_name}`;
      res.json({
        ...row,
        sourceId: TIPG_SOURCE_ID,
        collection,
        previewUrl: await previewUrlFor(pool, collection),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Wrap multer so file-filter / size-limit errors become clean JSON rather
  // than Express's default HTML 500.
  const uploadSingle: express.RequestHandler = (req, res, next) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const tooLarge = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
        res.status(tooLarge ? 413 : 400).json({ error: (err as Error).message });
        return;
      }
      next();
    });
  };

  // POST /api/data/upload — ingest a file via the sidecar (protected).
  app.post('/api/data/upload', requireAuth, uploadSingle, async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }
    const filePath = req.file.path;
    try {
      const body = req.body as {
        format?: string;
        label?: string;
        srs?: string;
        geomField?: string;
        layer?: string;
        replace?: string;
      };
      const table = sanitizeTableName(body.label || req.file.originalname);
      if (!isValidIdentifier(table)) {
        res.status(400).json({ error: 'Could not derive a valid table name' });
        return;
      }

      // Collision policy: reject by default, allow explicit replace.
      const replace = body.replace === 'true';
      const existing = await pool.query(
        'SELECT id FROM map_admin.uploaded_datasets WHERE table_name = $1',
        [table],
      );
      if (existing.rows.length > 0 && !replace) {
        res.status(409).json({
          error: `A dataset named "${table}" already exists`,
          table,
          conflict: true,
        });
        return;
      }

      // Forward the file to the sidecar as multipart/form-data.
      const form = new FormData();
      const buf = await fs.readFile(filePath);
      form.append('file', new Blob([buf]), req.file.originalname);
      form.append('table', table);
      form.append('schema', 'uploads');
      form.append('format', body.format || 'auto');
      if (body.srs) form.append('srs', body.srs);
      if (body.geomField) form.append('geomField', body.geomField);
      if (body.layer) form.append('layer', body.layer);

      const sidecarRes = await fetch(`${INGEST_SERVICE_URL}/ingest`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });
      const payload = (await sidecarRes.json().catch(() => ({}))) as Record<string, unknown>;

      if (!sidecarRes.ok) {
        // Pass through multi-layer prompts and busy/validation errors verbatim.
        res.status(sidecarRes.status === 429 ? 503 : sidecarRes.status).json(payload);
        return;
      }

      const ingest = payload as unknown as IngestResult;
      const bbox = ingest.bbox ? JSON.stringify(ingest.bbox) : null;
      // Re-check existence on fresh data: the ingest above can take minutes, so
      // the earlier `existing` snapshot may be stale. Decide INSERT vs UPDATE now.
      const current = await pool.query(
        'SELECT id FROM map_admin.uploaded_datasets WHERE table_name = $1',
        [table],
      );
      const isReplace = current.rows.length > 0;
      let saved;
      try {
        saved = isReplace
        ? await pool.query(
            `UPDATE map_admin.uploaded_datasets SET
               label = $2, original_filename = $3, format = $4, geometry_type = $5,
               srid = $6, feature_count = $7, bbox = $8, crs_assumed = $9, updated_at = now()
             WHERE table_name = $1 RETURNING *`,
            [
              table, body.label || null, req.file.originalname, ingest.format,
              ingest.geometryType, ingest.srid, ingest.featureCount, bbox, ingest.crsAssumed,
            ],
          )
        : await pool.query(
            `INSERT INTO map_admin.uploaded_datasets
               (table_name, label, original_filename, format, geometry_type, srid,
                feature_count, bbox, crs_assumed, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
              table, body.label || null, req.file.originalname, ingest.format,
              ingest.geometryType, ingest.srid, ingest.featureCount, bbox, ingest.crsAssumed,
              req.session.username ?? null,
            ],
          );
      } catch (dbErr) {
        // Lost a race with a concurrent upload of the same name (UNIQUE table_name).
        if ((dbErr as { code?: string }).code === '23505') {
          res.status(409).json({ error: `A dataset named "${table}" already exists`, table, conflict: true });
          return;
        }
        throw dbErr;
      }

      const tipgRefreshed = await refreshTipg(pool);
      res.status(201).json({
        ...saved.rows[0],
        sourceId: TIPG_SOURCE_ID,
        collection: `uploads.${table}`,
        tipgRefreshed,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ingest failed' });
    } finally {
      await fs.rm(filePath, { force: true }).catch(() => undefined);
    }
  });

  // DELETE /api/data/:id — drop the table + tracking row, refresh tipg (protected).
  app.delete('/api/data/:id', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      const found = await client.query(
        'SELECT table_name FROM map_admin.uploaded_datasets WHERE id = $1',
        [req.params.id],
      );
      if (found.rows.length === 0) {
        res.status(404).json({ error: 'Dataset not found' });
        return;
      }
      const tableName = (found.rows[0] as { table_name: string }).table_name;
      if (!isValidIdentifier(tableName)) {
        res.status(400).json({ error: 'Refusing to drop unsafe identifier' });
        return;
      }

      await client.query('BEGIN');
      // Schema is the hardcoded literal `uploads`; identifier is regex-validated.
      await client.query(`DROP TABLE IF EXISTS uploads."${tableName}"`);
      await client.query('DELETE FROM map_admin.uploaded_datasets WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');

      const tipgRefreshed = await refreshTipg(pool);
      res.json({ deleted: req.params.id, tipgRefreshed });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error(err);
      res.status(500).json({ error: 'Delete failed' });
    } finally {
      client.release();
    }
  });
}
