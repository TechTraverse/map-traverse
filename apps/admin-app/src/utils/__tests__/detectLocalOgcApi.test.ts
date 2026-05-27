import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectLocalOgcApi, normalizeUrl } from '../detectLocalOgcApi';

// inspectSourceClientSide makes a chain of fetch() calls itself; rather than
// stubbing all of them through the shared fetch mock, replace the module export.
vi.mock('../inspectSource', () => ({
  inspectSourceClientSide: vi.fn(async () => ({
    landing: { title: 'tipg' },
    conformance: [],
    collections: [],
    inspectedAt: '2026-01-01T00:00:00Z',
    errors: [],
    refreshUrl: 'http://example.com/ogc/refresh',
  })),
}));

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function makeFetch(handler: Handler) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url, init);
  });
}

describe('normalizeUrl', () => {
  it('strips trailing slashes', () => {
    expect(normalizeUrl('http://example.com/ogc/')).toBe('http://example.com/ogc');
    expect(normalizeUrl('http://example.com/ogc')).toBe('http://example.com/ogc');
    expect(normalizeUrl('http://example.com/ogc///')).toBe('http://example.com/ogc');
  });
  it('lowercases scheme and host but preserves path case', () => {
    expect(normalizeUrl('HTTP://Example.COM/Ogc/Collections')).toBe(
      'http://example.com/Ogc/Collections',
    );
  });
});

describe('detectLocalOgcApi', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('happy path: probe → no existing source → POST → added', async () => {
    const fetchImpl = makeFetch((url, init) => {
      if (url.endsWith('/ogc/?f=json')) return jsonRes({ title: 'tipg' });
      if (url === '/api/sources' && (!init || !init.method)) return jsonRes([]);
      if (url === '/api/sources' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        expect(body.source_id).toBe('tipg-local');
        expect(body.label).toBe('Local OGC API');
        expect(body.url).toBe('http://example.com/ogc/');
        expect(body.proxy).toBe(false);
        expect(body.source_type).toBe('features');
        expect(body.metadata).toBeDefined();
        return jsonRes({ ok: true }, 201);
      }
      return new Response('unexpected', { status: 500 });
    });

    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('added');
  });

  it('returns skipped-no-ogc when probe is 404', async () => {
    const fetchImpl = makeFetch(() => new Response('nope', { status: 404 }));
    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('skipped-no-ogc');
    // No POST attempted
    expect(fetchImpl.mock.calls.some((c: unknown[]) => String(c[0]) === '/api/sources' && (c[1] as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('returns skipped-no-ogc when probe body has no title field', async () => {
    const fetchImpl = makeFetch((url) => {
      if (url.endsWith('/ogc/?f=json')) return jsonRes({ unrelated: 'payload' });
      return new Response('unexpected', { status: 500 });
    });
    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('skipped-no-ogc');
  });

  it('returns skipped-existing-url when a source already points at the URL (normalized)', async () => {
    const fetchImpl = makeFetch((url, init) => {
      if (url.endsWith('/ogc/?f=json')) return jsonRes({ title: 'tipg' });
      if (url === '/api/sources' && (!init || !init.method)) {
        // existing url has no trailing slash; candidate has one — normalization must match
        return jsonRes([{ url: 'http://example.com/ogc' }]);
      }
      return new Response('unexpected POST', { status: 500 });
    });
    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('skipped-existing-url');
    expect(fetchImpl.mock.calls.some((c: unknown[]) => (c[1] as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('returns skipped-conflict when POST returns 409', async () => {
    const fetchImpl = makeFetch((url, init) => {
      if (url.endsWith('/ogc/?f=json')) return jsonRes({ title: 'tipg' });
      if (url === '/api/sources' && (!init || !init.method)) return jsonRes([]);
      if (url === '/api/sources' && init?.method === 'POST') {
        return new Response(JSON.stringify({ error: 'source_id in use' }), { status: 409 });
      }
      return new Response('unexpected', { status: 500 });
    });
    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('skipped-conflict');
  });

  it('returns skipped-error on probe network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const result = await detectLocalOgcApi({ fetch: fetchImpl, origin: 'http://example.com' });
    expect(result).toBe('skipped-error');
  });
});
