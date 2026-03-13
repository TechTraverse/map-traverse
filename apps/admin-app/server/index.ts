import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { pool, initDb } from './db.js';
import { inspectOgcSource, normalizeUrl } from './inspect.js';
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';

// Augment session with our custom fields
declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
  }
}

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const PgSession = connectPgSimple(session);

const corsOrigins = process.env.CORS_ORIGINS;
app.use(cors({
  credentials: true,
  origin: corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : true,
}));
app.use(express.json({ limit: '1mb' }));

// Session middleware
app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
    },
  }),
);

// --- Helpers ---

function handleServerError(res: express.Response, err: unknown): void {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

// --- Auth middleware ---

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  // If no password hash configured, skip auth (dev mode)
  if (!process.env.ADMIN_PASSWORD_HASH) {
    next();
    return;
  }
  if (!req.session.authenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// --- Auth endpoints (public) ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!process.env.ADMIN_PASSWORD_HASH) {
    // Auth not configured — set session anyway for consistency
    req.session.authenticated = true;
    req.session.username = username ?? 'dev';
    res.json({ ok: true });
    return;
  }

  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' });
    return;
  }

  const expectedUsername = process.env.ADMIN_USERNAME ?? 'admin';
  if (username !== expectedUsername) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  try {
    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ ok: true });
  } catch (err) {
    handleServerError(res, err);
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!process.env.ADMIN_PASSWORD_HASH) {
    // 501 = auth not configured (client treats this as "open access")
    res.status(501).json({ configured: false });
    return;
  }
  if (!req.session.authenticated) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ username: req.session.username });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --- Health check ---

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ status: 'error' });
  }
});

const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/;

// --- Config endpoints ---

// GET /api/configs — list all configs
app.get('/api/configs', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, is_published, is_default, created_at, updated_at FROM map_configs ORDER BY updated_at DESC',
    );
    res.json(result.rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/configs/published — list published configs
app.get('/api/configs/published', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, is_default FROM map_configs WHERE is_published = true ORDER BY name',
    );
    res.json(result.rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/configs/:id — get by UUID or by published name
app.get('/api/configs/:id', async (req, res) => {
  try {
    if (UUID_REGEX.test(req.params.id)) {
      // UUID lookup — return full config row
      const result = await pool.query('SELECT * FROM map_configs WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      res.json(result.rows[0]);
    } else {
      // Name lookup — return just the config JSON for published configs
      let result;
      if (req.params.id === 'default') {
        // Resolve "default" to the config marked as default
        result = await pool.query(
          'SELECT config FROM map_configs WHERE is_default = true AND is_published = true',
        );
      } else {
        result = await pool.query(
          'SELECT config FROM map_configs WHERE name = $1 AND is_published = true',
          [req.params.id],
        );
      }
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      res.json((result.rows[0] as { config: unknown }).config);
    }
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs — create new config (protected)
app.post('/api/configs', requireAuth, async (req, res) => {
  const { name, description, config } = req.body as {
    name: string;
    description?: string;
    config?: unknown;
  };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!NAME_REGEX.test(name)) {
    res.status(400).json({ error: 'name must be a slug (lowercase letters, numbers, hyphens only, e.g. "my-config")' });
    return;
  }

  if (config) {
    const validation = safeValidateMapConfig(config);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid config', details: validation.error.errors });
      return;
    }
  }

  try {
    const result = await pool.query(
      'INSERT INTO map_configs (name, description, config) VALUES ($1, $2, $3) RETURNING *',
      [name, description ?? null, JSON.stringify(config ?? {})],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// PUT /api/configs/:id — update config, snapshot current state as a version (protected)
app.put('/api/configs/:id', requireAuth, async (req, res) => {
  const { name, description, config } = req.body as {
    name?: string;
    description?: string;
    config?: unknown;
  };

  if (name !== undefined && !NAME_REGEX.test(name)) {
    res.status(400).json({ error: 'name must be a slug (lowercase letters, numbers, hyphens only, e.g. "my-config")' });
    return;
  }

  if (config) {
    const validation = safeValidateMapConfig(config);
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid config', details: validation.error.errors });
      return;
    }
  }

  try {
    const existing = await pool.query('SELECT * FROM map_configs WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const row = existing.rows[0] as {
      name: string;
      description: string | null;
      config: unknown;
    };

    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      // Snapshot current state into version history
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM config_versions WHERE config_id = $1',
        [req.params.id],
      );
      const nextVersion = (versionResult.rows[0] as { next_version: number }).next_version;
      await client.query(
        `INSERT INTO config_versions (config_id, version_number, name, description, config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.id,
          nextVersion,
          row.name,
          row.description,
          JSON.stringify(row.config),
          req.session.username ?? null,
        ],
      );
      result = await client.query(
        'UPDATE map_configs SET name = $1, description = $2, config = $3, updated_at = now() WHERE id = $4 RETURNING *',
        [
          name ?? row.name,
          description ?? row.description,
          JSON.stringify(config ?? row.config),
          req.params.id,
        ],
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// DELETE /api/configs/:id (protected)
app.delete('/api/configs/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM map_configs WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json({ deleted: req.params.id });
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs/:id/publish (protected)
app.post('/api/configs/:id/publish', requireAuth, async (req, res) => {
  try {
    const configResult = await pool.query(
      'SELECT name FROM map_configs WHERE id = $1',
      [req.params.id],
    );
    if (configResult.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const { name } = configResult.rows[0] as { name: string };

    // Check for name conflict among published configs
    const conflict = await pool.query(
      'SELECT id FROM map_configs WHERE name = $1 AND is_published = true AND id != $2',
      [name, req.params.id],
    );
    if (conflict.rows.length > 0) {
      res.status(409).json({ error: `A published config named "${name}" already exists` });
      return;
    }

    const result = await pool.query(
      'UPDATE map_configs SET is_published = true, updated_at = now() WHERE id = $1 RETURNING *',
      [req.params.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs/:id/unpublish — unpublish a config (protected)
app.post('/api/configs/:id/unpublish', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE map_configs SET is_published = false, is_default = false, updated_at = now() WHERE id = $1 RETURNING *',
      [req.params.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs/:id/set-default — mark a published config as the default (protected)
app.post('/api/configs/:id/set-default', requireAuth, async (req, res) => {
  try {
    const configResult = await pool.query(
      'SELECT id, is_published FROM map_configs WHERE id = $1',
      [req.params.id],
    );
    if (configResult.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const { is_published } = configResult.rows[0] as { is_published: boolean };
    if (!is_published) {
      res.status(400).json({ error: 'Config must be published before setting as default' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Unset any existing default
      await client.query(
        'UPDATE map_configs SET is_default = false, updated_at = now() WHERE is_default = true',
      );
      // Set the new default
      const result = await client.query(
        'UPDATE map_configs SET is_default = true, updated_at = now() WHERE id = $1 RETURNING *',
        [req.params.id],
      );
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs/:id/unset-default — remove default flag (protected)
app.post('/api/configs/:id/unset-default', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE map_configs SET is_default = false, updated_at = now() WHERE id = $1 RETURNING *',
      [req.params.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/configs/:id/versions — list version history
app.get('/api/configs/:id/versions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, version_number, name, created_by, created_at
       FROM config_versions WHERE config_id = $1
       ORDER BY version_number DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/configs/:id/versions/:versionId — full version detail
app.get('/api/configs/:id/versions/:versionId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM config_versions WHERE id = $1 AND config_id = $2',
      [req.params.versionId, req.params.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/configs/:id/restore/:versionId — restore a version (protected)
app.post('/api/configs/:id/restore/:versionId', requireAuth, async (req, res) => {
  try {
    const configResult = await pool.query('SELECT * FROM map_configs WHERE id = $1', [
      req.params.id,
    ]);
    if (configResult.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    const versionResult = await pool.query(
      'SELECT * FROM config_versions WHERE id = $1 AND config_id = $2',
      [req.params.versionId, req.params.id],
    );
    if (versionResult.rows.length === 0) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    const current = configResult.rows[0] as {
      name: string;
      description: string | null;
      config: unknown;
    };
    const version = versionResult.rows[0] as {
      name: string;
      description: string | null;
      config: unknown;
    };

    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      // Snapshot current state before overwriting
      const versionCountResult = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM config_versions WHERE config_id = $1',
        [req.params.id],
      );
      const nextVersion = (versionCountResult.rows[0] as { next_version: number }).next_version;
      await client.query(
        `INSERT INTO config_versions (config_id, version_number, name, description, config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.params.id,
          nextVersion,
          current.name,
          current.description,
          JSON.stringify(current.config),
          req.session.username ?? null,
        ],
      );
      // Restore version data
      result = await client.query(
        'UPDATE map_configs SET name = $1, description = $2, config = $3, updated_at = now() WHERE id = $4 RETURNING *',
        [version.name, version.description, JSON.stringify(version.config), req.params.id],
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// --- Source endpoints ---

const SOURCE_ID_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// GET /api/sources — list all saved sources
app.get('/api/sources', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ogc_sources ORDER BY updated_at DESC',
    );
    res.json(result.rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/sources/:id — get single source by UUID
app.get('/api/sources/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ogc_sources WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/sources/:id/usage — list configs using this source
app.get('/api/sources/:id/usage', async (req, res) => {
  try {
    const sourceResult = await pool.query('SELECT source_id FROM ogc_sources WHERE id = $1', [req.params.id]);
    if (sourceResult.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    const sourceId = (sourceResult.rows[0] as { source_id: string }).source_id;
    const result = await pool.query(
      `SELECT id, name FROM map_configs
       WHERE EXISTS (
         SELECT 1 FROM jsonb_array_elements(config->'sources') AS s
         WHERE s->>'id' = $1
       )`,
      [sourceId],
    );
    res.json({ configs: result.rows });
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/sources/test-connection — server-side connection test (protected)
app.post('/api/sources/test-connection', requireAuth, async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  try {
    const testUrl = normalizeUrl(url).replace(/\/$/, '');
    const response = await fetch(`${testUrl}/conformance?f=json`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      res.json({ status: 'success' });
    } else {
      res.json({ status: 'error', error: `HTTP ${response.status} ${response.statusText}` });
    }
  } catch (err) {
    res.json({ status: 'error', error: err instanceof Error ? err.message : 'Network error' });
  }
});

// POST /api/sources — create a new source (protected)
app.post('/api/sources', requireAuth, async (req, res) => {
  const { source_id, url, label, tile_matrix_set_id, metadata } = req.body as {
    source_id?: string;
    url?: string;
    label?: string;
    tile_matrix_set_id?: string;
    metadata?: unknown;
  };

  if (!source_id || !url) {
    res.status(400).json({ error: 'source_id and url are required' });
    return;
  }
  if (!SOURCE_ID_REGEX.test(source_id)) {
    res.status(400).json({ error: 'source_id must be a slug (lowercase letters, numbers, hyphens only)' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO ogc_sources (source_id, url, label, tile_matrix_set_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [source_id, url, label ?? null, tile_matrix_set_id ?? 'WebMercatorQuad'],
    );
    const row = result.rows[0] as { id: string };

    if (metadata) {
      // Client provided metadata (client-side inspection) — save directly
      const updated = await pool.query(
        'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
        [JSON.stringify(metadata), row.id],
      );
      res.status(201).json(updated.rows[0]);
    } else {
      // No metadata provided — auto-inspect server-side (fallback)
      try {
        const inspected = await inspectOgcSource(url);
        const updated = await pool.query(
          'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
          [JSON.stringify(inspected), row.id],
        );
        res.status(201).json(updated.rows[0]);
      } catch {
        // Inspection failed — return source without metadata
        res.status(201).json(result.rows[0]);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: `A source with id "${source_id}" already exists` });
      return;
    }
    handleServerError(res, err);
  }
});

// PUT /api/sources/:id — update a source (protected)
app.put('/api/sources/:id', requireAuth, async (req, res) => {
  const { source_id, url, label, tile_matrix_set_id, metadata } = req.body as {
    source_id?: string;
    url?: string;
    label?: string;
    tile_matrix_set_id?: string;
    metadata?: unknown;
  };

  if (source_id !== undefined && !SOURCE_ID_REGEX.test(source_id)) {
    res.status(400).json({ error: 'source_id must be a slug (lowercase letters, numbers, hyphens only)' });
    return;
  }

  try {
    const existing = await pool.query('SELECT * FROM ogc_sources WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    const row = existing.rows[0] as {
      source_id: string;
      url: string;
      label: string | null;
      tile_matrix_set_id: string;
    };

    const newUrl = url ?? row.url;
    const result = await pool.query(
      `UPDATE ogc_sources SET source_id = $1, url = $2, label = $3, tile_matrix_set_id = $4, updated_at = now()
       WHERE id = $5 RETURNING *`,
      [
        source_id ?? row.source_id,
        newUrl,
        label !== undefined ? (label || null) : row.label,
        tile_matrix_set_id ?? row.tile_matrix_set_id,
        req.params.id,
      ],
    );

    // Re-inspect if URL changed
    if (url && url !== row.url) {
      if (metadata) {
        // Client provided metadata — save directly
        const updated = await pool.query(
          'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
          [JSON.stringify(metadata), req.params.id],
        );
        res.json(updated.rows[0]);
        return;
      }
      // No metadata provided — auto-inspect server-side (fallback)
      try {
        const inspected = await inspectOgcSource(newUrl);
        const updated = await pool.query(
          'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
          [JSON.stringify(inspected), req.params.id],
        );
        res.json(updated.rows[0]);
        return;
      } catch {
        // Inspection failed — return without updated metadata
      }
    }
    res.json(result.rows[0]);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: `A source with that id already exists` });
      return;
    }
    handleServerError(res, err);
  }
});

// PUT /api/sources/:id/metadata — save client-inspected metadata (protected)
app.put('/api/sources/:id/metadata', requireAuth, async (req, res) => {
  const { metadata } = req.body as { metadata?: unknown };
  if (!metadata) {
    res.status(400).json({ error: 'metadata is required' });
    return;
  }
  try {
    const result = await pool.query(
      'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
      [JSON.stringify(metadata), req.params.id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// DELETE /api/sources/:id — delete a source (protected)
app.delete('/api/sources/:id', requireAuth, async (req, res) => {
  try {
    const sourceResult = await pool.query('SELECT source_id FROM ogc_sources WHERE id = $1', [req.params.id]);
    if (sourceResult.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    const sourceId = (sourceResult.rows[0] as { source_id: string }).source_id;

    // Check usage unless force=true
    if (req.query.force !== 'true') {
      const usage = await pool.query(
        `SELECT id, name FROM map_configs
         WHERE EXISTS (
           SELECT 1 FROM jsonb_array_elements(config->'sources') AS s
           WHERE s->>'id' = $1
         )`,
        [sourceId],
      );
      if (usage.rows.length > 0) {
        const names = (usage.rows as { name: string }[]).map(r => r.name).join(', ');
        res.status(409).json({
          error: `Source is in use by configs: ${names}. Use ?force=true to delete anyway.`,
          configs: usage.rows,
        });
        return;
      }
    }

    await pool.query('DELETE FROM ogc_sources WHERE id = $1', [req.params.id]);
    res.json({ deleted: req.params.id });
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/sources/:id/inspect — refresh metadata for a source (protected)
app.post('/api/sources/:id/inspect', requireAuth, async (req, res) => {
  try {
    const sourceResult = await pool.query('SELECT url FROM ogc_sources WHERE id = $1', [req.params.id]);
    if (sourceResult.rows.length === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    const { url } = sourceResult.rows[0] as { url: string };

    const metadata = await inspectOgcSource(url);
    const result = await pool.query(
      'UPDATE ogc_sources SET metadata = $1, metadata_updated_at = now() WHERE id = $2 RETURNING *',
      [JSON.stringify(metadata), req.params.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// POST /api/sources/import — bulk import sources from existing configs (protected)
app.post('/api/sources/import', requireAuth, async (_req, res) => {
  try {
    const configsResult = await pool.query(
      "SELECT config->'sources' AS sources FROM map_configs WHERE config->'sources' IS NOT NULL",
    );

    const seen = new Map<string, { id: string; url: string; label?: string; tileMatrixSetId?: string }>();
    for (const row of configsResult.rows) {
      const sources = (row as { sources: Array<{ id: string; url: string; label?: string; tileMatrixSetId?: string }> }).sources;
      if (!Array.isArray(sources)) continue;
      for (const s of sources) {
        if (s.id && s.url && !seen.has(s.id)) {
          seen.set(s.id, s);
        }
      }
    }

    let imported = 0;
    if (seen.size > 0) {
      const values = Array.from(seen.values());
      const placeholders = values.map((_, i) => {
        const b = i * 4;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
      }).join(', ');
      const params = values.flatMap(s => [
        s.id, s.url, s.label ?? null, s.tileMatrixSetId ?? 'WebMercatorQuad',
      ]);
      const result = await pool.query(
        `INSERT INTO ogc_sources (source_id, url, label, tile_matrix_set_id)
         VALUES ${placeholders}
         ON CONFLICT (source_id) DO NOTHING`,
        params,
      );
      imported = result.rowCount ?? 0;
    }

    res.json({ imported, total: seen.size });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Serve SPA static files (after all API routes)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// JSON 404 for unmatched API routes (must be before SPA catch-all)
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Admin API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
