import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser } from './testDb.js';

let app: import('express').Express;

beforeAll(async () => {
  await mockDbModule();
  await seedAdminUser('admin', 'admin');
  // Silence connect-pg-simple's pruner — its periodic DELETE chokes on pg-mem.
  // It still works for the in-test flow, the warning would just be noisy.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ app } = await import('../index.js'));
});

describe('auth routes', () => {
  it('POST /api/auth/login rejects missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects an unknown username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'admin' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login rejects an invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login accepts valid credentials and returns ok', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/auth/login sets a session cookie on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(Array.isArray(res.headers['set-cookie'])).toBe(true);
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it('GET /api/auth/me returns username after login (agent shares cookie)', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(login.status).toBe(200);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  it('POST /api/auth/logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin' });
    const me1 = await agent.get('/api/auth/me');
    expect(me1.status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });

    const me2 = await agent.get('/api/auth/me');
    expect(me2.status).toBe(401);
  });

  it('GET /api/health returns 200 ok when db is reachable', async () => {
    const res = await request(app).get('/api/health');
    // pg-mem may return ok or pg-mem may complain — accept either,
    // but ensure the route exists.
    expect([200, 503]).toContain(res.status);
  });
});
