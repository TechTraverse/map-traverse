/**
 * Ingest orchestration: take a downloaded upload, drive ogr2ogr into the
 * `uploads` schema, collect stats, and clean up. Network/DB/process side
 * effects live here; the pure pieces (`ogr`, `formats`, `identifiers`, `unzip`)
 * are unit-tested separately and this layer is covered by integration tests.
 */
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type { FormatId, IngestResponse, LayerInfo } from './types.js';
import { FORMATS } from './formats.js';
import { buildOgr2OgrArgs, buildOgrInfoArgs, buildPgConn } from './ogr.js';
import { extractShapefileZip } from './unzip.js';
import { collectTableStats, dropTable } from './db.js';

const SCHEMA = 'uploads';
const OGR_TIMEOUT_MS = Number(process.env.INGEST_OGR_TIMEOUT_MS ?? 5 * 60 * 1000);
const OGR_MAX_BUFFER = 16 * 1024 * 1024;

export class BadRequestError extends Error {}
export class NeedsLayerError extends Error {
  constructor(public layers: LayerInfo[]) {
    super('This file contains multiple layers; choose one to import');
    this.name = 'NeedsLayerError';
  }
}
export class OgrError extends Error {
  constructor(message: string, public stderr: string) {
    super(message);
    this.name = 'OgrError';
  }
}

interface RunResult {
  stdout: string;
  stderr: string;
}

function run(cmd: string, args: string[], timeout = OGR_TIMEOUT_MS): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: OGR_MAX_BUFFER }, (err, stdout, stderr) => {
      if (err) {
        const e = new OgrError(`${cmd} failed: ${err.message}`, String(stderr).slice(-4000));
        reject(e);
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

interface OgrInfoLayer {
  name: string;
  featureCount?: number;
  geometryFields?: Array<{ type?: string; coordinateSystem?: unknown }>;
}

interface SourceInspection {
  layers: LayerInfo[];
  hasSourceCrs: boolean;
}

/** Inspect a source with `ogrinfo -json` to enumerate layers + detect a CRS. */
export async function inspectSource(srcPath: string): Promise<SourceInspection> {
  const { stdout } = await run('ogrinfo', buildOgrInfoArgs(srcPath));
  let parsed: { layers?: OgrInfoLayer[] };
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new OgrError('Could not parse ogrinfo output', stdout.slice(-2000));
  }
  const rawLayers = parsed.layers ?? [];
  const layers: LayerInfo[] = rawLayers.map(l => ({
    name: l.name,
    geometryType: l.geometryFields?.[0]?.type,
    featureCount: l.featureCount,
  }));
  const hasSourceCrs = rawLayers.some(l =>
    l.geometryFields?.some(g => g.coordinateSystem != null),
  );
  return { layers, hasSourceCrs };
}

export interface IngestOptions {
  pool: Pool;
  filePath: string;
  format: FormatId;
  table: string;
  srs?: string;
  geomField?: string;
  layer?: string;
}

/**
 * Run a full ingest. Resolves with stats on success; throws
 * `NeedsLayerError` (multi-layer, no layer chosen), `BadRequestError`
 * (aspatial / no geometry), or `OgrError` (load failure).
 */
export async function ingestFile(opts: IngestOptions): Promise<IngestResponse> {
  const workDir = path.join(os.tmpdir(), `ingest-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // 1. Resolve the actual file ogr2ogr should read.
    let srcPath = opts.filePath;
    let hasPrj = false;
    if (opts.format === 'shp-zip') {
      const extracted = await extractShapefileZip(opts.filePath, workDir);
      srcPath = extracted.shpPath;
      hasPrj = extracted.hasPrj;
    }

    // 2. Inspect: enumerate layers, detect a source CRS.
    const inspection = await inspectSource(srcPath);
    const spatialLayers = inspection.layers.filter(
      l => l.geometryType && l.geometryType.toLowerCase() !== 'none',
    );

    if (spatialLayers.length === 0) {
      throw new BadRequestError('No spatial layer found — uploads must contain geometry');
    }

    // 3. Multi-layer containers need an explicit layer choice.
    const def = FORMATS[opts.format];
    if (def.multiLayer && spatialLayers.length > 1 && !opts.layer) {
      throw new NeedsLayerError(spatialLayers);
    }
    if (opts.layer && !spatialLayers.some(l => l.name === opts.layer)) {
      throw new BadRequestError(`Layer "${opts.layer}" not found in file`);
    }

    const hasSourceCrs = opts.format === 'shp-zip' ? hasPrj : inspection.hasSourceCrs;
    const crsAssumed = !hasSourceCrs && !opts.srs;

    // 4. Load via ogr2ogr.
    const pgConn = buildPgConn({
      host: process.env.INGEST_DB_HOST ?? 'localhost',
      port: Number(process.env.INGEST_DB_PORT ?? 5432),
      database: process.env.INGEST_DB_NAME ?? 'gis',
      user: process.env.INGEST_DB_USER ?? 'postgres',
      password: process.env.INGEST_DB_PASSWORD ?? 'postgres',
    });
    const args = buildOgr2OgrArgs({
      schema: SCHEMA,
      table: opts.table,
      pgConn,
      srcPath,
      format: opts.format,
      hasSourceCrs,
      srs: opts.srs,
      geomField: opts.geomField,
      layer: opts.layer ?? (def.multiLayer ? spatialLayers[0].name : undefined),
    });

    try {
      await run('ogr2ogr', args);
    } catch (err) {
      // Never leave a half-written table behind.
      await dropTable(opts.pool, opts.table).catch(() => undefined);
      throw err;
    }

    // 5. Collect stats.
    const stats = await collectTableStats(opts.pool, opts.table);
    if (stats.featureCount === 0 || !stats.geometryType) {
      await dropTable(opts.pool, opts.table).catch(() => undefined);
      throw new BadRequestError('Ingest produced no spatial features');
    }

    return {
      table: opts.table,
      schema: SCHEMA,
      geometryType: stats.geometryType,
      srid: stats.srid,
      featureCount: stats.featureCount,
      bbox: stats.bbox,
      crsAssumed,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Best-effort sweep of stale temp dirs older than `maxAgeMs`. */
export async function sweepStaleTempDirs(maxAgeMs = 6 * 60 * 60 * 1000, now = Date.now()): Promise<void> {
  const tmp = os.tmpdir();
  let entries: string[];
  try {
    entries = await fs.readdir(tmp);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter(name => name.startsWith('ingest-'))
      .map(async name => {
        const full = path.join(tmp, name);
        try {
          const st = await fs.stat(full);
          if (now - st.mtimeMs > maxAgeMs) {
            await fs.rm(full, { recursive: true, force: true });
          }
        } catch {
          // ignore
        }
      }),
  );
}
