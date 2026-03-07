import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import { pool, initDb } from './db.js';
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

function getEnvironments(): string[] {
  return (process.env.ADMIN_ENVIRONMENTS ?? 'production')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
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

// --- Environments ---

app.get('/api/environments', (_req, res) => {
  res.json(getEnvironments());
});

const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/;

// --- Config endpoints ---

// GET /api/configs — list all configs (optional ?env= filter)
app.get('/api/configs', async (req, res) => {
  try {
    const env = req.query.env as string | undefined;
    let query =
      'SELECT id, name, description, is_published, environment, created_at, updated_at FROM map_configs';
    const params: string[] = [];
    if (env) {
      query += ' WHERE environment = $1';
      params.push(env);
    }
    query += ' ORDER BY updated_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// GET /api/configs/published — list published configs for an environment
app.get('/api/configs/published', async (req, res) => {
  try {
    const env = (req.query.env as string | undefined) ?? 'production';
    const result = await pool.query(
      'SELECT id, name, description FROM map_configs WHERE is_published = true AND environment = $1 ORDER BY name',
      [env],
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
      const env = (req.query.env as string | undefined) ?? 'production';
      const result = await pool.query(
        'SELECT config FROM map_configs WHERE name = $1 AND is_published = true AND environment = $2',
        [req.params.id, env],
      );
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
  const { name, description, config, environment } = req.body as {
    name: string;
    description?: string;
    config?: unknown;
    environment?: string;
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

  const env = environment ?? 'production';
  const environments = getEnvironments();
  if (!environments.includes(env)) {
    res.status(400).json({ error: `Invalid environment: ${env}. Valid: ${environments.join(', ')}` });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO map_configs (name, description, config, environment) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description ?? null, JSON.stringify(config ?? {}), env],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServerError(res, err);
  }
});

// PUT /api/configs/:id — update config, snapshot current state as a version (protected)
app.put('/api/configs/:id', requireAuth, async (req, res) => {
  const { name, description, config, environment } = req.body as {
    name?: string;
    description?: string;
    config?: unknown;
    environment?: string;
  };

  if (name !== undefined && !NAME_REGEX.test(name)) {
    res.status(400).json({ error: 'name must be a slug (lowercase letters, numbers, hyphens only, e.g. "my-config")' });
    return;
  }

  if (environment !== undefined) {
    const environments = getEnvironments();
    if (!environments.includes(environment)) {
      res.status(400).json({ error: `Invalid environment: ${environment}. Valid: ${environments.join(', ')}` });
      return;
    }
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
      environment: string;
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
        'UPDATE map_configs SET name = $1, description = $2, config = $3, environment = $4, updated_at = now() WHERE id = $5 RETURNING *',
        [
          name ?? row.name,
          description ?? row.description,
          JSON.stringify(config ?? row.config),
          environment ?? row.environment,
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

// POST /api/configs/:id/publish — publish within the config's environment (protected)
app.post('/api/configs/:id/publish', requireAuth, async (req, res) => {
  try {
    const configResult = await pool.query(
      'SELECT name, environment FROM map_configs WHERE id = $1',
      [req.params.id],
    );
    if (configResult.rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const { name, environment: env } = configResult.rows[0] as { name: string; environment: string };

    // Check for name conflict among published configs in same environment
    const conflict = await pool.query(
      'SELECT id FROM map_configs WHERE name = $1 AND environment = $2 AND is_published = true AND id != $3',
      [name, env, req.params.id],
    );
    if (conflict.rows.length > 0) {
      res.status(409).json({ error: `A published config named "${name}" already exists in the "${env}" environment` });
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
      'UPDATE map_configs SET is_published = false, updated_at = now() WHERE id = $1 RETURNING *',
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
