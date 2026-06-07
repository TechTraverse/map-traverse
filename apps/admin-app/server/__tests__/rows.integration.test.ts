/**
 * Live integration tests for row-level CRUD: real `pg` against a real PostGIS.
 *
 * GATED: skipped unless ROW_CRUD_INTEGRATION=1 (mirrors the ingest sidecar's
 * INGEST_INTEGRATION gate). Connects to the local docker `gis` DB by default
 * (host localhost:5432, user/pass postgres) — override with DB_HOST/DB_PORT/
 * DB_NAME/DB_USER/DB_PASSWORD. Run with:
 *
 *   docker compose up -d postgis
 *   cd apps/admin-app && ROW_CRUD_INTEGRATION=1 pnpm exec vitest run rows.integration
 *
 * Exercises the GeoJSON↔PostGIS round-trip the pg-mem tests can't: ST_GeomFromGeoJSON
 * / ST_AsGeoJSON, single→multi coercion (insert a Polygon into a MultiPolygon column
 * and read back a MultiPolygon), the SRID tag, and the post-mutation stats recompute
 * (feature_count + bbox) on the uploaded_datasets row. A temp table is created in
 * beforeAll and dropped in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';

const RUN = process.env.ROW_CRUD_INTEGRATION === '1';

const TABLE = 'test_rows';

describe.runIf(RUN)('row CRUD integration (real PostGIS)', () => {
  let pool: Pool;
  let app: import('express').Express;
  let datasetId: string;

  const POLYGON = {
    type: 'Polygon',
    coordinates: [[[-106.9, 38.5], [-106.9, 38.7], [-106.7, 38.7], [-106.7, 38.5], [-106.9, 38.5]]],
  };
  const POLYGON2 = {
    type: 'Polygon',
    coordinates: [[[10, 10], [10, 11], [11, 11], [11, 10], [10, 10]]],
  };

  beforeAll(async () => {
    // requireAuth is open when no ADMIN_PASSWORD_HASH is configured (dev mode).
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.NODE_ENV = 'test';

    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'gis',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    });

    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await pool.query('CREATE SCHEMA IF NOT EXISTS uploads');
    await pool.query('CREATE SCHEMA IF NOT EXISTS map_admin');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS map_admin.uploaded_datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name TEXT NOT NULL UNIQUE,
        label TEXT,
        original_filename TEXT NOT NULL,
        format TEXT NOT NULL,
        geometry_type TEXT,
        srid INTEGER DEFAULT 4326,
        feature_count INTEGER,
        bbox JSONB,
        crs_assumed BOOLEAN NOT NULL DEFAULT false,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await pool.query(`DROP TABLE IF EXISTS uploads."${TABLE}"`);
    await pool.query(`
      CREATE TABLE uploads."${TABLE}" (
        ogc_fid serial PRIMARY KEY,
        name text,
        geom geometry(MultiPolygon, 4326)
      )
    `);

    await pool.query('DELETE FROM map_admin.uploaded_datasets WHERE table_name = $1', [TABLE]);
    const ins = await pool.query(
      `INSERT INTO map_admin.uploaded_datasets (table_name, original_filename, format, geometry_type, srid)
       VALUES ($1, 'test.geojson', 'geojson', 'MULTIPOLYGON', 4326) RETURNING id`,
      [TABLE],
    );
    datasetId = ins.rows[0].id as string;

    ({ app } = await import('../index.js'));
  });

  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP TABLE IF EXISTS uploads."${TABLE}"`).catch(() => undefined);
      await pool.query('DELETE FROM map_admin.uploaded_datasets WHERE table_name = $1', [TABLE]).catch(() => undefined);
      await pool.end().catch(() => undefined);
    }
  });

  let createdRowId: number;

  it('GET schema resolves ogc_fid PK + MultiPolygon geometry @ 4326', async () => {
    const res = await request(app).get(`/api/data/${datasetId}/schema`);
    expect(res.status).toBe(200);
    expect(res.body.primaryKey).toBe('ogc_fid');
    expect(res.body.geometry).toMatchObject({ column: 'geom', type: 'MULTIPOLYGON', srid: 4326 });
    expect(res.body.table).toBe(`uploads.${TABLE}`);
  });

  it('POST coerces a single Polygon into a MultiPolygon and returns it as GeoJSON', async () => {
    const res = await request(app)
      .post(`/api/data/${datasetId}/rows`)
      .send({ properties: { name: 'first' }, geometry: POLYGON });
    expect(res.status).toBe(201);
    expect(res.body.properties.name).toBe('first');
    expect(res.body.geometry.type).toBe('MultiPolygon');
    expect(typeof res.body.id).toBe('number');
    createdRowId = res.body.id;

    // SRID is tagged 4326 in storage.
    const srid = await pool.query(`SELECT ST_SRID(geom) AS srid FROM uploads."${TABLE}" WHERE ogc_fid = $1`, [createdRowId]);
    expect(srid.rows[0].srid).toBe(4326);
  });

  it('recomputes feature_count + bbox on the dataset after insert', async () => {
    const ds = await pool.query('SELECT feature_count, bbox FROM map_admin.uploaded_datasets WHERE id = $1', [datasetId]);
    expect(ds.rows[0].feature_count).toBe(1);
    const bbox = ds.rows[0].bbox as [number, number, number, number];
    expect(bbox).toHaveLength(4);
    expect(bbox[0]).toBeCloseTo(-106.9, 5);
    expect(bbox[2]).toBeCloseTo(-106.7, 5);
  });

  it('GET rows returns the inserted row with total', async () => {
    const res = await request(app).get(`/api/data/${datasetId}/rows`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].id).toBe(createdRowId);
    expect(res.body.rows[0].geometry.type).toBe('MultiPolygon');
  });

  it('GET rows supports ILIKE filtering', async () => {
    const hit = await request(app).get(`/api/data/${datasetId}/rows`).query({ filterColumn: 'name', filter: 'fir' });
    expect(hit.body.total).toBe(1);
    const miss = await request(app).get(`/api/data/${datasetId}/rows`).query({ filterColumn: 'name', filter: 'zzz' });
    expect(miss.body.total).toBe(0);
  });

  it('PUT updates properties + geometry and returns the new row', async () => {
    const res = await request(app)
      .put(`/api/data/${datasetId}/rows/${createdRowId}`)
      .send({ properties: { name: 'renamed' }, geometry: POLYGON2 });
    expect(res.status).toBe(200);
    expect(res.body.properties.name).toBe('renamed');
    expect(res.body.geometry.type).toBe('MultiPolygon');

    const ds = await pool.query('SELECT bbox FROM map_admin.uploaded_datasets WHERE id = $1', [datasetId]);
    const bbox = ds.rows[0].bbox as [number, number, number, number];
    expect(bbox[0]).toBeCloseTo(10, 5);
    expect(bbox[2]).toBeCloseTo(11, 5);
  });

  it('PUT 404s for a missing row id', async () => {
    const res = await request(app)
      .put(`/api/data/${datasetId}/rows/999999`)
      .send({ properties: { name: 'nope' }, geometry: null });
    expect(res.status).toBe(404);
  });

  it('PUT 400s for a non-numeric row id (integer PK)', async () => {
    const res = await request(app)
      .put(`/api/data/${datasetId}/rows/not-a-number`)
      .send({ properties: { name: 'x' }, geometry: null });
    expect(res.status).toBe(400);
  });

  it('POST 400s for invalid geometry', async () => {
    const bad = { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]] }; // self-intersecting
    const res = await request(app)
      .post(`/api/data/${datasetId}/rows`)
      .send({ properties: { name: 'bad' }, geometry: bad });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid geometry/i);
  });

  it('DELETE removes the row and recomputes stats to empty', async () => {
    const res = await request(app).delete(`/api/data/${datasetId}/rows/${createdRowId}`);
    expect(res.status).toBe(200);
    expect(String(res.body.deleted)).toBe(String(createdRowId));

    const rows = await request(app).get(`/api/data/${datasetId}/rows`);
    expect(rows.body.total).toBe(0);

    const ds = await pool.query('SELECT feature_count, bbox FROM map_admin.uploaded_datasets WHERE id = $1', [datasetId]);
    expect(ds.rows[0].feature_count).toBe(0);
    expect(ds.rows[0].bbox).toBeNull();
  });

  it('DELETE 404s for a missing row id', async () => {
    const res = await request(app).delete(`/api/data/${datasetId}/rows/999999`);
    expect(res.status).toBe(404);
  });
});
