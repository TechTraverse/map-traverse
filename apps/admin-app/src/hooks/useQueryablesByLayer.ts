import { useEffect, useState } from 'react';
import type { LayerConfig, OgcApiSource, AvailableProperty } from '@ogc-maps/storybook-components';
import { fetchQueryables, toAvailableProperties } from '@ogc-maps/storybook-components/utils';

export interface UseQueryablesByLayerResult {
  queryablesByLayer: Record<string, AvailableProperty[]>;
  queryablesLoading: Record<string, boolean>;
}

/**
 * Eagerly fetches OGC queryables for each configured feature layer and maps them to
 * AvailableProperty[] keyed by layer id. Results are cached by `${sourceId}:${collection}`
 * so layers sharing a collection only fetch once.
 */
export function useQueryablesByLayer(
  layers: LayerConfig[],
  sources: OgcApiSource[],
): UseQueryablesByLayerResult {
  const [queryablesByLayer, setQueryablesByLayer] = useState<Record<string, AvailableProperty[]>>({});
  const [queryablesLoading, setQueryablesLoading] = useState<Record<string, boolean>>({});

  // Stable dependency key: ids + source/collection pairs
  const depKey = layers.map((l) => `${l.id}|${l.sourceId}|${l.collection}`).join(',');

  useEffect(() => {
    let cancelled = false;
    // Cache per-effect: `${sourceId}:${collection}` -> Promise<AvailableProperty[]>
    const cache = new Map<string, Promise<AvailableProperty[]>>();

    const loadingInit: Record<string, boolean> = {};
    for (const layer of layers) {
      if (!layer.sourceId || !layer.collection) continue;
      loadingInit[layer.id] = true;
    }
    setQueryablesLoading(loadingInit);

    Promise.allSettled(
      layers.map(async (layer) => {
        if (!layer.sourceId || !layer.collection) return null;
        const source = sources.find((s) => s.id === layer.sourceId);
        if (!source) return null;
        const cacheKey = `${layer.sourceId}:${layer.collection}`;
        let pending = cache.get(cacheKey);
        if (!pending) {
          pending = fetchQueryables(source.url, layer.collection, source.auth ?? undefined)
            .then((q) => toAvailableProperties(q))
            .catch(() => [] as AvailableProperty[]);
          cache.set(cacheKey, pending);
        }
        return { layerId: layer.id, props: await pending };
      }),
    ).then((settled) => {
      if (cancelled) return;
      const next: Record<string, AvailableProperty[]> = {};
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          next[r.value.layerId] = r.value.props;
        }
      }
      setQueryablesByLayer(next);
      setQueryablesLoading({});
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, sources]);

  return { queryablesByLayer, queryablesLoading };
}
