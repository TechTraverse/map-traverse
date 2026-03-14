import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDistinctValues } from '@ogc-maps/storybook-components/hooks';
import { useMapStore } from '../stores/mapStore';

const CACHE_MAX = 200;

export function useAutocompleteSuggestions(): {
  autocompleteSuggestions: Record<string, string[]>;
  fetchSuggestions: (layerId: string, property: string, query: string, options?: { prefetch?: boolean }) => void;
} {
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    Record<string, string[]>
  >({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const latestQueryRef = useRef<Map<string, string>>(new Map());
  const cacheRef = useRef<Map<string, string[]>>(new Map());
  const cacheKeysRef = useRef<string[]>([]);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const fetchSuggestions = useCallback(
    (layerId: string, property: string, query: string, options?: { prefetch?: boolean }) => {
      const fieldKey = `${layerId}:${property}`;

      // Prefetch mode: fetch all distinct values once and let client-side filtering handle the rest
      if (options?.prefetch) {
        if (prefetchedRef.current.has(fieldKey)) return;
        prefetchedRef.current.add(fieldKey);

        const { layers, sources } = useMapStore.getState();
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;
        const source = sources.find((s) => s.id === layer.sourceId);
        if (!source) return;

        fetchDistinctValues(source.url, layer.collection, property, { fetchAll: true })
          .then((results) => {
            setAutocompleteSuggestions((prev) => ({ ...prev, [fieldKey]: results }));
          })
          .catch((err) => {
            console.warn(
              `[useAutocompleteSuggestions] Failed to prefetch suggestions for ${fieldKey}:`,
              err,
            );
            prefetchedRef.current.delete(fieldKey);
          });
        return;
      }

      // Clear previous debounce timer for this field
      const existingTimer = timersRef.current.get(fieldKey);
      if (existingTimer != null) clearTimeout(existingTimer);

      // Short queries clear suggestions immediately
      if (query.length < 2) {
        latestQueryRef.current.set(fieldKey, '');
        setAutocompleteSuggestions((prev) => {
          const { [fieldKey]: _removed, ...rest } = prev;
          return rest;
        });
        return;
      }

      latestQueryRef.current.set(fieldKey, query);

      const timer = setTimeout(async () => {
        const { layers, sources } = useMapStore.getState();
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;

        const source = sources.find((s) => s.id === layer.sourceId);
        if (!source) return;

        const cacheKey = `${layer.collection}:${property}:${query}`;

        // Serve from cache if available
        if (cacheRef.current.has(cacheKey)) {
          const cached = cacheRef.current.get(cacheKey)!;
          if (latestQueryRef.current.get(fieldKey) === query) {
            setAutocompleteSuggestions((prev) => ({ ...prev, [fieldKey]: cached }));
          }
          return;
        }

        try {
          const results = await fetchDistinctValues(source.url, layer.collection, property, {
            query,
          });

          // Discard stale results
          if (latestQueryRef.current.get(fieldKey) !== query) return;

          // FIFO cache eviction
          if (cacheRef.current.size >= CACHE_MAX) {
            const oldest = cacheKeysRef.current.shift();
            if (oldest) cacheRef.current.delete(oldest);
          }
          cacheRef.current.set(cacheKey, results);
          cacheKeysRef.current.push(cacheKey);

          setAutocompleteSuggestions((prev) => ({ ...prev, [fieldKey]: results }));
        } catch (err) {
          console.warn(
            `[useAutocompleteSuggestions] Failed to fetch suggestions for ${fieldKey}:`,
            err,
          );
        }
      }, 300);

      timersRef.current.set(fieldKey, timer);
    },
    [],
  );

  return { autocompleteSuggestions, fetchSuggestions };
}
