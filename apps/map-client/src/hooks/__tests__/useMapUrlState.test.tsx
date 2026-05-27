import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { useMapUrlState } from '../useMapUrlState';

function makeWrapper(opts: {
  searchParams?: string;
  onUrlUpdate?: OnUrlUpdateFunction;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={opts.searchParams}
        onUrlUpdate={opts.onUrlUpdate}
      >
        {children}
      </NuqsTestingAdapter>
    );
  };
}

describe('useMapUrlState — viewport', () => {
  it('parses lng/lat/zoom from the URL', () => {
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ searchParams: '?lng=10&lat=20&zoom=5' }),
    });
    expect(result.current.viewportState.lng).toBe(10);
    expect(result.current.viewportState.lat).toBe(20);
    expect(result.current.viewportState.zoom).toBe(5);
  });

  it('returns null defaults when params absent', () => {
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({}),
    });
    expect(result.current.viewportState.lng).toBeNull();
    expect(result.current.viewportState.lat).toBeNull();
    expect(result.current.viewportState.zoom).toBeNull();
  });

  it('setViewportState emits a URL update', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ onUrlUpdate }),
    });
    await act(async () => {
      await result.current.setViewportState({ lng: 1, lat: 2, zoom: 3 });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1][0];
    expect(event.searchParams.get('lng')).toBe('1');
    expect(event.searchParams.get('lat')).toBe('2');
    expect(event.searchParams.get('zoom')).toBe('3');
  });

  it('uses replace history for viewport (no push)', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ onUrlUpdate }),
    });
    await act(async () => {
      await result.current.setViewportState({ lng: 9 });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1][0];
    expect(event.options.history).toBe('replace');
  });
});

describe('useMapUrlState — layers / basemap / filters', () => {
  it('parses layers + basemap from the URL', () => {
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({
        searchParams: '?layers=a,b&basemap=osm',
      }),
    });
    expect(result.current.layerState.layers).toEqual(['a', 'b']);
    expect(result.current.layerState.basemap).toBe('osm');
  });

  it('parses filters JSON from the URL', () => {
    const filtersJson = encodeURIComponent(
      JSON.stringify({ layerA: { name: 'foo' } }),
    );
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ searchParams: `?filters=${filtersJson}` }),
    });
    expect(result.current.layerState.filters).toEqual({ layerA: { name: 'foo' } });
  });

  it('returns null for filters when JSON is invalid', () => {
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ searchParams: '?filters=not-json' }),
    });
    expect(result.current.layerState.filters).toBeNull();
  });

  it('setLayerState writes layers/basemap to the URL with push history', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ onUrlUpdate }),
    });
    await act(async () => {
      await result.current.setLayerState({ layers: ['x', 'y'], basemap: 'sat' });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1][0];
    expect(event.searchParams.get('layers')).toBe('x,y');
    expect(event.searchParams.get('basemap')).toBe('sat');
    expect(event.options.history).toBe('push');
  });

  it('setLayerState serializes filters to JSON in the URL', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useMapUrlState(), {
      wrapper: makeWrapper({ onUrlUpdate }),
    });
    await act(async () => {
      await result.current.setLayerState({
        filters: { layerA: { name: 'foo' } },
      });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1][0];
    const raw = event.searchParams.get('filters');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ layerA: { name: 'foo' } });
  });
});
