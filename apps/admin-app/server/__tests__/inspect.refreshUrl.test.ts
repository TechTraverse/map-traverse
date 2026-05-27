import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { inspectOgcSource } from '../inspect.js';

type FetchInit = Parameters<typeof fetch>[1];
type FetchHandler = (url: string, init?: FetchInit) => Response | Promise<Response>;

function installFetchHandler(handler: FetchHandler): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: FetchInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url, init);
  }));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('inspectOgcSource — refreshUrl discovery', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets refreshUrl when /refresh appears in the OpenAPI spec paths', async () => {
    installFetchHandler((url) => {
      if (url.includes('/api?f=json') || url.includes('/openapi.json')) {
        return jsonResponse({ paths: { '/collections': {}, '/refresh': {} } });
      }
      if (url.endsWith('/collections?f=json')) {
        return jsonResponse({ collections: [] });
      }
      if (url.endsWith('?f=json')) {
        return jsonResponse({ title: 'tipg', description: 'demo' });
      }
      if (url.includes('/conformance')) {
        return jsonResponse({ conformsTo: [] });
      }
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://tipg.local/ogc');
    expect(result.refreshUrl).toBe('http://tipg.local/ogc/refresh');
  });

  it('tolerates trailing-slash form (/refresh/)', async () => {
    installFetchHandler((url) => {
      if (url.includes('/api?f=json') || url.includes('/openapi.json')) {
        return jsonResponse({ paths: { '/refresh/': {} } });
      }
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://tipg.local/ogc');
    expect(result.refreshUrl).toBe('http://tipg.local/ogc/refresh');
  });

  it('leaves refreshUrl undefined when /refresh is absent from the spec', async () => {
    installFetchHandler((url) => {
      if (url.includes('/api?f=json') || url.includes('/openapi.json')) {
        return jsonResponse({ paths: { '/collections': {}, '/conformance': {} } });
      }
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://other.local/ogc');
    expect(result.refreshUrl).toBeUndefined();
  });

  it('leaves refreshUrl undefined when the OpenAPI spec is unreachable', async () => {
    installFetchHandler((url) => {
      if (url.includes('/api?f=json') || url.includes('/openapi.json')) {
        return new Response('not found', { status: 404 });
      }
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://nospec.local/ogc');
    expect(result.refreshUrl).toBeUndefined();
  });

  it('does not crash when the OpenAPI body is not the expected shape', async () => {
    installFetchHandler((url) => {
      if (url.includes('/api?f=json') || url.includes('/openapi.json')) {
        return jsonResponse({ not: 'an openapi doc' });
      }
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://malformed.local/ogc');
    expect(result.refreshUrl).toBeUndefined();
  });

  it('discovers refreshUrl from the tipg /api?f=json spec when /openapi.json is 404', async () => {
    // Mirrors real tipg behavior: FastAPI's default /openapi.json is disabled,
    // and the spec lives at /api with content negotiation via ?f=json.
    installFetchHandler((url) => {
      if (url.endsWith('/api?f=json')) {
        return jsonResponse({ paths: { '/collections': {}, '/refresh': {}, '/rawcatalog': {} } });
      }
      if (url.includes('/openapi.json')) return new Response('not found', { status: 404 });
      if (url.endsWith('/collections?f=json')) return jsonResponse({ collections: [] });
      if (url.endsWith('?f=json')) return jsonResponse({});
      if (url.includes('/conformance')) return jsonResponse({ conformsTo: [] });
      return new Response('not found', { status: 404 });
    });

    const result = await inspectOgcSource('http://tipg.local/ogc');
    expect(result.refreshUrl).toBe('http://tipg.local/ogc/refresh');
  });
});
