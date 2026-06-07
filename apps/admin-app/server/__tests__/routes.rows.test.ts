/**
 * Route tests for row-level CRUD, backed by pg-mem.
 *
 * pg-mem can't run PostGIS functions (ST_*, geometry_columns), so these tests
 * only exercise the NON-geometry behavior that short-circuits BEFORE any
 * PostGIS SQL runs: auth gating, unknown-dataset 404s, and identifier-format
 * 400s (malformed sort/filter/property names). The geometry round-trips and
 * existence checks live in rows.integration.test.ts (real PostGIS); the SQL
 * builders themselves are unit-tested in rowSql.test.ts.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser, getCurrentPool } from './testDb.js';

let app: import('express').Express;

async function authedAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin' });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return agent;
}

async function seedDataset(tableName = 'parcels'): Promise<string> {
  const pool = getCurrentPool();
  const ins = await pool!.query(
    `INSERT INTO map_admin.uploaded_datasets (table_name, original_filename, format)
     VALUES ($1, 'x.geojson', 'geojson') RETURNING id`,
    [tableName],
  );
  return (ins.rows[0] as { id: string }).id;
}

const UNKNOWN_ID = '99999999-9999-9999-9999-999999999999';

beforeAll(async () => {
  await mockDbModule();
  await seedAdminUser('admin', 'admin');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ app } = await import('../index.js'));
});

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await seedAdminUser('admin', 'admin');
  const pool = getCurrentPool();
  await pool?.query('DELETE FROM map_admin.uploaded_datasets');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('row routes — auth', () => {
  it('requires authentication for every row route', async () => {
    const id = await seedDataset();
    const reqs = [
      request(app).get(`/api/data/${id}/schema`),
      request(app).get(`/api/data/${id}/rows`),
      request(app).post(`/api/data/${id}/rows`).send({ properties: {}, geometry: null }),
      request(app).put(`/api/data/${id}/rows/1`).send({ properties: {}, geometry: null }),
      request(app).delete(`/api/data/${id}/rows/1`),
    ];
    for (const r of reqs) {
      const res = await r;
      expect(res.status).toBe(401);
    }
  });
});

describe('row routes — unknown dataset', () => {
  it('404s for every row route when the dataset id is unknown', async () => {
    const agent = await authedAgent();
    expect((await agent.get(`/api/data/${UNKNOWN_ID}/schema`)).status).toBe(404);
    expect((await agent.get(`/api/data/${UNKNOWN_ID}/rows`)).status).toBe(404);
    expect((await agent.post(`/api/data/${UNKNOWN_ID}/rows`).send({ properties: {}, geometry: null })).status).toBe(404);
    expect((await agent.put(`/api/data/${UNKNOWN_ID}/rows/1`).send({ properties: {}, geometry: null })).status).toBe(404);
    expect((await agent.delete(`/api/data/${UNKNOWN_ID}/rows/1`)).status).toBe(404);
  });
});

describe('GET /api/data/:id/rows — column-format validation', () => {
  it('400s for a malformed sort column (before touching PostGIS)', async () => {
    const id = await seedDataset();
    const agent = await authedAgent();
    const res = await agent.get(`/api/data/${id}/rows`).query({ sort: 'Name' }); // uppercase → invalid
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort column/i);
  });

  it('400s for a malformed filter column', async () => {
    const id = await seedDataset();
    const agent = await authedAgent();
    const res = await agent.get(`/api/data/${id}/rows`).query({ filterColumn: 'a;b' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filter column/i);
  });
});

describe('POST/PUT /api/data/:id/rows — property-key validation', () => {
  it('400s for a malformed property key on insert (before touching PostGIS)', async () => {
    const id = await seedDataset();
    const agent = await authedAgent();
    const res = await agent.post(`/api/data/${id}/rows`).send({ properties: { 'DROP TABLE': 1 }, geometry: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid column name/i);
  });

  it('400s for a malformed property key on update', async () => {
    const id = await seedDataset();
    const agent = await authedAgent();
    const res = await agent.put(`/api/data/${id}/rows/1`).send({ properties: { 'bad-col': 1 }, geometry: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid column name/i);
  });
});
