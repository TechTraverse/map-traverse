import { useEffect, useState } from 'react';
import type { LayerConfig, AvailableProperty } from '@ogc-maps/storybook-components/types';
import { fetchQueryables, toAvailableProperties } from '@ogc-maps/storybook-components/utils';
import { useMapStore } from '../stores/mapStore';

export function useLayerQueryables(layers: LayerConfig[]): Record<string, AvailableProperty[]> {
  const sources = useMapStore((s) => s.sources);
  const [cache, setCache] = useState<Record<string, AvailableProperty[]>>({});

  useEffect(() => {
    let cancelled = false;
    for (const layer of layers) {
      if (cache[layer.id]) continue;
      const source = sources.find((s) => s.id === layer.sourceId);
      if (!source?.url) continue;
      fetchQueryables(source.url, layer.collection, source.auth)
        .then((q) => {
          if (cancelled) return;
          setCache((prev) => ({ ...prev, [layer.id]: toAvailableProperties(q) }));
        })
        .catch(() => {
          if (cancelled) return;
          setCache((prev) => ({ ...prev, [layer.id]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [layers, sources, cache]);

  return cache;
}
