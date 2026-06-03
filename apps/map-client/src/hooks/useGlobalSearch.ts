/**
 * useGlobalSearch — wiring hook for the GlobalSearchBar.
 *
 * Reads global-search config + data from `mapStore`, debounces the query,
 * fans fetches out via `globalSearchFetcher`, and exposes an `onResultClick`
 * handler that zooms the map to the clicked feature (via the shared
 * `zoomToFeature` utility) and highlights every current match by pushing a
 * `searchHighlight` FeatureCollection into the store (which `MapContainer`
 * observes).
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore } from '../stores/mapStore';
import { isOgcApiSource } from '@ogc-maps/storybook-components/utils';
import {
  applyZoomInstruction,
  featureCollectionFromGeometries,
  prefetchAllDistinctValues,
  prefetchKey,
  runGlobalSearch,
  zoomToFeature,
  type GlobalSearchContext,
} from '@ogc-maps/storybook-components/utils';
import type {
  GlobalSearchFeatureMatch,
  GlobalSearchGroupedResults,
} from '@ogc-maps/storybook-components';

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: GlobalSearchGroupedResults;
  isLoading: boolean;
  onResultClick: (layerId: string, match: GlobalSearchFeatureMatch) => void;
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
    fitBounds,
    flyTo,
    setSearchHighlight,
    clearSearchHighlight,
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
      fitBounds: s.fitBounds,
      flyTo: s.flyTo,
      setSearchHighlight: s.setSearchHighlight,
      clearSearchHighlight: s.clearSearchHighlight,
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
      sources: sources.filter(isOgcApiSource),
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
      // Emptying / clearing the search box is a manual clear — drop the highlight.
      clearSearchHighlight();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      inFlightRef.current = controller;
      setGlobalSearchIsLoading(true);

      const ctx: GlobalSearchContext = {
        config: globalSearchConfig,
        layers,
        sources: sources.filter(isOgcApiSource),
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
    (layerId: string, match: GlobalSearchFeatureMatch) => {
      const layer = layers.find((l) => l.id === layerId);

      // Zoom to the clicked feature at an appropriate level: points fly to a
      // sensible zoom (layer `zoomToLevel` or the util default), polygons/lines
      // fit their extent capped at the layer's maxZoom. Shared with the
      // SearchPanel path so both behave identically.
      const instruction = zoomToFeature(
        match.geometry as unknown as Record<string, unknown> | undefined,
        {
          layerMinZoom: layer?.minZoom,
          layerMaxZoom: layer?.maxZoom,
          pointZoom: layer?.zoomToLevel,
        },
      );
      applyZoomInstruction(instruction, { flyTo, fitBounds });
      if (!instruction && match.bbox) {
        // No usable geometry but a precomputed bbox — fall back to fitting it.
        fitBounds(match.bbox);
      }

      // Highlight every match across all groups so the user sees the full set of
      // matches, not just the one we zoomed to. Persists until the next search.
      const geometries = Object.values(results).flatMap((group) =>
        group.matches.map(
          (m) => m.geometry as unknown as Record<string, unknown> | undefined,
        ),
      );
      setSearchHighlight(featureCollectionFromGeometries(geometries));
    },
    [layers, results, flyTo, fitBounds, setSearchHighlight],
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
