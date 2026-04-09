/**
 * useGlobalSearch — wiring hook for the GlobalSearchBar.
 *
 * Reads global-search config + data from `mapStore`, debounces the query,
 * fans fetches out via `globalSearchFetcher`, and exposes an `onResultClick`
 * handler that zooms the map by pushing a pending bounding box through the
 * existing `fitBounds` store action (which `MapContainer` observes).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import bbox from '@turf/bbox';
import type { AllGeoJSON } from '@turf/helpers';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../stores/mapStore';
import {
  prefetchAllDistinctValues,
  prefetchKey,
  runGlobalSearch,
  type GlobalSearchContext,
} from '../utils/globalSearchFetcher';
import type {
  GlobalSearchFeatureMatch,
  GlobalSearchGroupedResults,
} from '@ogc-maps/storybook-components';
import type { BBox } from '@ogc-maps/storybook-components/utils';

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: GlobalSearchGroupedResults;
  isLoading: boolean;
  onResultClick: (layerId: string, match: GlobalSearchFeatureMatch) => void;
}

/** Minimal inline bbox fallback for Point/LineString/Polygon in case @turf/bbox ever fails. */
function fallbackBbox(geometry: GeoJSON.Geometry | undefined): BBox | null {
  if (!geometry) return null;
  try {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates as [number, number];
      return [lng, lat, lng, lat];
    }
    // Everything else: flatten coordinates.
    const coords: number[][] = [];
    const walk = (c: unknown): void => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number') {
        coords.push(c as number[]);
        return;
      }
      for (const inner of c) walk(inner);
    };
    walk((geometry as { coordinates: unknown }).coordinates);
    if (coords.length === 0) return null;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  } catch {
    return null;
  }
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const {
    globalSearchConfig,
    uiConfig,
    layers,
    sources,
    query,
    results,
    isLoading,
    prefetchedDistinctValues,
    setGlobalSearchQuery,
    setGlobalSearchResults,
    setGlobalSearchIsLoading,
    cacheDistinctValues,
    clearGlobalSearch,
    fitBounds,
  } = useMapStore(
    useShallow((s) => ({
      globalSearchConfig: s.globalSearchConfig,
      uiConfig: s.uiConfig,
      layers: s.layers,
      sources: s.sources,
      query: s.globalSearchQuery,
      results: s.globalSearchResults,
      isLoading: s.globalSearchIsLoading,
      prefetchedDistinctValues: s.prefetchedDistinctValues,
      setGlobalSearchQuery: s.setGlobalSearchQuery,
      setGlobalSearchResults: s.setGlobalSearchResults,
      setGlobalSearchIsLoading: s.setGlobalSearchIsLoading,
      cacheDistinctValues: s.cacheDistinctValues,
      clearGlobalSearch: s.clearGlobalSearch,
      fitBounds: s.fitBounds,
    })),
  );

  const enabled =
    globalSearchConfig?.enabled === true && uiConfig?.showGlobalSearch === true;

  // ─── Mount-time prefetch ───────────────────────────────────────────────────
  // Stable dependency key: only re-runs when the set of prefetch-marked props changes.
  const prefetchDepKey = useMemo(() => {
    if (!enabled || !globalSearchConfig) return '';
    const pairs: string[] = [];
    for (const l of globalSearchConfig.layers) {
      for (const p of l.properties) {
        if (p.prefetch) pairs.push(prefetchKey(l.layerId, p.property));
      }
    }
    return pairs.sort().join('|');
  }, [enabled, globalSearchConfig]);

  useEffect(() => {
    if (!enabled || !globalSearchConfig || prefetchDepKey === '') return;

    const controller = new AbortController();
    const ctx: GlobalSearchContext = {
      config: globalSearchConfig,
      layers,
      sources,
      prefetchedValues: prefetchedDistinctValues,
    };

    prefetchAllDistinctValues(ctx, controller.signal)
      .then((values) => {
        if (controller.signal.aborted) return;
        for (const [key, arr] of Object.entries(values)) {
          cacheDistinctValues(key, arr);
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        console.warn('[useGlobalSearch] Prefetch sweep failed:', err);
      });

    return () => controller.abort();
    // `layers` / `sources` are stable across the app lifetime after hydration;
    // we only want to re-run when the set of prefetch properties itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, prefetchDepKey]);

  // ─── Debounced query → search ──────────────────────────────────────────────
  const inFlightRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !globalSearchConfig) return;

    const minLen = globalSearchConfig.minQueryLength;
    const debounceMs = globalSearchConfig.debounceMs;

    // Cancel any in-flight fetch and debounce timer on every keystroke.
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (query.length < minLen) {
      setGlobalSearchResults({});
      setGlobalSearchIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      inFlightRef.current = controller;
      setGlobalSearchIsLoading(true);

      const ctx: GlobalSearchContext = {
        config: globalSearchConfig,
        layers,
        sources,
        prefetchedValues: prefetchedDistinctValues,
      };

      runGlobalSearch(ctx, query, controller.signal)
        .then((grouped) => {
          if (controller.signal.aborted) return;
          setGlobalSearchResults(grouped);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'AbortError') return;
          console.warn('[useGlobalSearch] Query failed:', err);
          setGlobalSearchResults({});
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setGlobalSearchIsLoading(false);
          }
          if (inFlightRef.current === controller) {
            inFlightRef.current = null;
          }
        });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current != null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // Deliberately omit store setters (stable) and layers/sources (stable post-hydration)
    // from deps to avoid unnecessary restarts on unrelated store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query, globalSearchConfig, prefetchedDistinctValues]);

  // Cleanup any final in-flight request on unmount.
  useEffect(() => {
    return () => {
      if (inFlightRef.current) {
        inFlightRef.current.abort();
        inFlightRef.current = null;
      }
    };
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setGlobalSearchQuery(q);
    },
    [setGlobalSearchQuery],
  );

  const onResultClick = useCallback(
    (_layerId: string, match: GlobalSearchFeatureMatch) => {
      let box: BBox | null = match.bbox ?? null;
      if (!box && match.geometry) {
        try {
          const computed = bbox(match.geometry as unknown as AllGeoJSON);
          // @turf/bbox returns [minX, minY, maxX, maxY] (may include z — take first 4).
          if (computed && computed.length >= 4) {
            box = [computed[0], computed[1], computed[2], computed[3]] as BBox;
          }
        } catch {
          box = fallbackBbox(match.geometry);
        }
      }
      if (!box) return;

      // For zero-area bboxes (points), expand a tiny window so fitBounds zooms in
      // rather than snapping to the maxZoom-1 floor when min == max.
      if (box[0] === box[2] && box[1] === box[3]) {
        const pad = 0.01;
        box = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
      }

      fitBounds(box);
      // Clear the dropdown after a successful click.
      clearGlobalSearch();
    },
    [fitBounds, clearGlobalSearch],
  );

  if (!enabled) {
    return {
      query: '',
      setQuery: () => {},
      results: {},
      isLoading: false,
      onResultClick: () => {},
    };
  }

  return { query, setQuery, results, isLoading, onResultClick };
}
