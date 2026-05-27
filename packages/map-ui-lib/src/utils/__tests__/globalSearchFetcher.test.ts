import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  prefetchKey,
  prefetchAllDistinctValues,
  runGlobalSearch,
  type GlobalSearchContext,
} from '../globalSearchFetcher';
import type {
  GlobalSearchConfig,
  LayerConfig,
  OgcApiSource,
} from '../../types';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const SOURCE: OgcApiSource = {
  id: 'src-1',
  type: 'ogc-api',
  url: 'https://api.example.com',
};

const LAYER_ROADS: LayerConfig = {
  id: 'roads',
  sourceId: 'src-1',
  collection: 'roads',
  name: 'Roads',
  styles: [],
} as unknown as LayerConfig;

const LAYER_CITIES: LayerConfig = {
  id: 'cities',
  sourceId: 'src-1',
  collection: 'cities',
  name: 'Cities',
  styles: [],
} as unknown as LayerConfig;

function buildConfig(overrides: Partial<GlobalSearchConfig> = {}): GlobalSearchConfig {
  return {
    enabled: true,
    maxResultsPerLayer: 10,
    debounceMs: 250,
    minQueryLength: 2,
    position: 'top-left',
    width: 'md',
    layers: [],
    ...overrides,
  } as GlobalSearchConfig;
}

function buildCtx(overrides: Partial<GlobalSearchContext> = {}): GlobalSearchContext {
  return {
    config: buildConfig(),
    layers: [LAYER_ROADS, LAYER_CITIES],
    sources: [SOURCE],
    prefetchedValues: {},
    ...overrides,
  };
}

function mockFetchSequence(...responses: Array<{ ok?: boolean; body: unknown; reject?: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r.reject !== undefined) {
      fn.mockRejectedValueOnce(r.reject);
      continue;
    }
    fn.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.ok === false ? 500 : 200,
      statusText: r.ok === false ? 'Server Error' : 'OK',
      json: () => Promise.resolve(r.body),
    } as Response);
  }
  return fn;
}

const PASS_SIGNAL = new AbortController().signal;

// ─── prefetchKey ────────────────────────────────────────────────────────────

describe('prefetchKey', () => {
  it('joins layer id and property with a colon', () => {
    expect(prefetchKey('roads', 'name')).toBe('roads:name');
  });
});

// ─── prefetchAllDistinctValues ──────────────────────────────────────────────

describe('prefetchAllDistinctValues', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns empty object when no properties have prefetch enabled', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true }],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', vi.fn());
    const result = await prefetchAllDistinctValues(ctx, PASS_SIGNAL);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches distinct values for each prefetch:true property', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [
              { property: 'name', autocomplete: true, prefetch: true },
              { property: 'class', autocomplete: true, prefetch: true },
            ],
          },
        ],
      }),
    });

    const page = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: {}, properties: { name: 'Main' } },
        { type: 'Feature', geometry: {}, properties: { name: 'Oak' } },
      ],
    };
    const fetchMock = mockFetchSequence({ body: page }, { body: page });
    vi.stubGlobal('fetch', fetchMock);

    const result = await prefetchAllDistinctValues(ctx, PASS_SIGNAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result['roads:name']).toBeDefined();
    expect(result['roads:class']).toBeDefined();
  });

  it('skips layers whose source or layer cannot be resolved', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'unknown',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', vi.fn());
    const result = await prefetchAllDistinctValues(ctx, PASS_SIGNAL);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('logs and continues when a prefetch task fails', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', mockFetchSequence({ reject: new Error('boom') }));
    const result = await prefetchAllDistinctValues(ctx, PASS_SIGNAL);
    expect(result).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('silently swallows AbortError (no warning)', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', mockFetchSequence({ reject: abortErr }));
    await prefetchAllDistinctValues(ctx, PASS_SIGNAL);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ─── runGlobalSearch ────────────────────────────────────────────────────────

describe('runGlobalSearch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns empty grouped result when no layers match', async () => {
    const ctx = buildCtx({ config: buildConfig({ layers: [] }) });
    vi.stubGlobal('fetch', vi.fn());
    const result = await runGlobalSearch(ctx, 'foo', PASS_SIGNAL);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('issues one fetch per layer with cql2-json filter', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'name', autocomplete: true }] },
          { layerId: 'cities', properties: [{ property: 'name', autocomplete: true }] },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'r1', geometry: { type: 'Point' }, properties: { name: 'Main St' } },
      ],
    };
    const fetchMock = mockFetchSequence({ body: fc }, { body: fc });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runGlobalSearch(ctx, 'Main', PASS_SIGNAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url0 = fetchMock.mock.calls[0][0] as string;
    expect(url0).toContain('filter-lang=cql2-json');
    expect(result.roads).toBeDefined();
    expect(result.roads.matches[0].label).toBe('Main St');
    expect(result.roads.matches[0].matchedProperty).toBe('name');
  });

  it('skips layers whose source cannot be resolved', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'missing', properties: [{ property: 'name', autocomplete: true }] },
          { layerId: 'roads', properties: [{ property: 'name', autocomplete: true }] },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 1, geometry: {}, properties: { name: 'Main' } },
      ],
    };
    const fetchMock = mockFetchSequence({ body: fc });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runGlobalSearch(ctx, 'Main', PASS_SIGNAL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.roads).toBeDefined();
    expect(result.missing).toBeUndefined();
  });

  it('skips layers with no autocomplete-enabled properties', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'name' /* no autocomplete */ }] },
        ],
      }),
    });
    vi.stubGlobal('fetch', vi.fn());
    const result = await runGlobalSearch(ctx, 'Main', PASS_SIGNAL);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses IN-list filter when prefetched values are present (and matches case-insensitively)', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
      prefetchedValues: { 'roads:name': ['Main St', 'Broadway', 'Oak Ave'] },
    });
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 'r1', geometry: {}, properties: { name: 'Main St' } }],
    };
    const fetchMock = mockFetchSequence({ body: fc });
    vi.stubGlobal('fetch', fetchMock);

    await runGlobalSearch(ctx, 'main', PASS_SIGNAL);
    const url = fetchMock.mock.calls[0][0] as string;
    // url-encoded; URLSearchParams collapses spaces to '+'
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain('"in"');
    expect(decoded).toContain('Main St');
  });

  it('skips the layer entirely when prefetched cache yields no substring matches', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
      prefetchedValues: { 'roads:name': ['Broadway'] },
    });
    vi.stubGlobal('fetch', vi.fn());
    const result = await runGlobalSearch(ctx, 'main', PASS_SIGNAL);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to like() when prefetch:true but cache not yet loaded', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [{ property: 'name', autocomplete: true, prefetch: true }],
          },
        ],
      }),
      prefetchedValues: {},
    });
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 'r1', geometry: {}, properties: { name: 'Main' } }],
    };
    const fetchMock = mockFetchSequence({ body: fc });
    vi.stubGlobal('fetch', fetchMock);
    await runGlobalSearch(ctx, 'main', PASS_SIGNAL);
    const decoded = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(decoded).toContain('like');
  });

  it('ORs multiple property expressions for a single layer', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          {
            layerId: 'roads',
            properties: [
              { property: 'name', autocomplete: true },
              { property: 'ref', autocomplete: true },
            ],
          },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 'r1', geometry: {}, properties: { name: 'Main' } }],
    };
    const fetchMock = mockFetchSequence({ body: fc });
    vi.stubGlobal('fetch', fetchMock);
    await runGlobalSearch(ctx, 'm', PASS_SIGNAL);
    const decoded = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(decoded).toContain('"or"');
  });

  it('dedupes features within a layer by feature id', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'name', autocomplete: true }] },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'r1', geometry: {}, properties: { name: 'Main' } },
        { type: 'Feature', id: 'r1', geometry: {}, properties: { name: 'Main' } },
        { type: 'Feature', id: 'r2', geometry: {}, properties: { name: 'Maple' } },
      ],
    };
    vi.stubGlobal('fetch', mockFetchSequence({ body: fc }));
    const result = await runGlobalSearch(ctx, 'M', PASS_SIGNAL);
    expect(result.roads.matches).toHaveLength(2);
  });

  it('logs but does not throw on a per-layer fetch failure', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'name', autocomplete: true }] },
          { layerId: 'cities', properties: [{ property: 'name', autocomplete: true }] },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 'c1', geometry: {}, properties: { name: 'NYC' } }],
    };
    const fetchMock = mockFetchSequence({ reject: new Error('boom') }, { body: fc });
    vi.stubGlobal('fetch', fetchMock);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runGlobalSearch(ctx, 'a', PASS_SIGNAL);
    expect(warn).toHaveBeenCalled();
    expect(result.cities).toBeDefined();
    expect(result.roads).toBeUndefined();
    warn.mockRestore();
  });

  it('rethrows AbortError instead of swallowing it', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'name', autocomplete: true }] },
        ],
      }),
    });
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', mockFetchSequence({ reject: abortErr }));
    await expect(runGlobalSearch(ctx, 'main', PASS_SIGNAL)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('falls back to feature.properties.name or featureId for the label when no property matches', async () => {
    const ctx = buildCtx({
      config: buildConfig({
        layers: [
          { layerId: 'roads', properties: [{ property: 'ref', autocomplete: true }] },
        ],
      }),
    });
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'r1',
          geometry: {},
          properties: { name: 'Fallback Name', ref: 'X' },
        },
      ],
    };
    vi.stubGlobal('fetch', mockFetchSequence({ body: fc }));
    const result = await runGlobalSearch(ctx, 'NOMATCH', PASS_SIGNAL);
    expect(result.roads.matches[0].label).toBe('Fallback Name');
  });
});
