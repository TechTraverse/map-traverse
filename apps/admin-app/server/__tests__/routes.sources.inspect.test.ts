import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser, getCurrentPool } from './testDb.js';

let app: import('express').Express;

async function authenticatedAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin' });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status}`);
  }
  return agent;
}

type FetchMock = ReturnType<typeof vi.fn>;

function installFetchSpy(handler: (url: string) => Response | Promise<Response>): FetchMock {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url);
  });
  vi.stubGlobal('fetch', spy);
  return spy as unknown as FetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function insertSource(metadata: Record<string, unknown> | null): Promise<string> {
  const pool = getCurrentPool();
  if (!pool) throw new Error('no pool');
  const id = '11111111-1111-1111-1111-111111111111';
  await pool.query('DELETE FROM map_admin.ogc_sources WHERE id = $1', [id]);
  await pool.query(
    `INSERT INTO map_admin.ogc_sources (id, source_id, url, source_type, metadata)
     VALUES ($1, $2, $3, 'features', $4)`,
    [id, `test-${Date.now()}`, 'http://tipg.local/ogc', metadata ? JSON.stringify(metadata) : null],
  );
  return id;
}

beforeAll(async () => {
  await mockDbModule();
  await seedAdminUser('admin', 'admin');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ app } = await import('../index.js'));
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/sources/:id/inspect — refresh pre-step', () => {
  it('hits the stored refreshUrl before re-inspecting', async () => {
    const id = await insertSource({ refreshUrl: 'http://tipg.local/ogc/refresh' });

    const spy = installFetchSpy((url) => {
      if (url.endsWith('/refresh')) return jsonResponse({ refreshed: true });
      if (url.includes('/openapi.json')) return jsonResponse({ paths: { '/refresh': {} } });
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const agent = await authenticatedAgent();
    const res = await agent.post(`/api/sources/${id}/inspect`);
    expect(res.status).toBe(200);

    const calls = spy.mock.calls.map((c) => String(c[0]));
    const refreshIdx = calls.findIndex((u) => u.endsWith('/refresh'));
    const inspectIdx = calls.findIndex((u) => u.endsWith('/collections?f=json'));
    expect(refreshIdx).toBeGreaterThanOrEqual(0);
    expect(inspectIdx).toBeGreaterThan(refreshIdx);
  });

  it('still completes inspection when refresh returns a non-2xx', async () => {
    const id = await insertSource({ refreshUrl: 'http://tipg.local/ogc/refresh' });

    installFetchSpy((url) => {
      if (url.endsWith('/refresh')) return new Response('boom', { status: 500 });
      if (url.includes('/openapi.json')) return jsonResponse({ paths: {} });
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const agent = await authenticatedAgent();
    const res = await agent.post(`/api/sources/${id}/inspect`);
    expect(res.status).toBe(200);
    expect(res.body.metadata).toBeDefined();
  });

  it('skips the refresh call when no refreshUrl is stored', async () => {
    const id = await insertSource(null);

    const spy = installFetchSpy((url) => {
      if (url.includes('/openapi.json')) return jsonResponse({ paths: {} });
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const agent = await authenticatedAgent();
    const res = await agent.post(`/api/sources/${id}/inspect`);
    expect(res.status).toBe(200);

    const calls = spy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.endsWith('/refresh') && !u.includes('openapi'))).toBe(false);
  });
});
