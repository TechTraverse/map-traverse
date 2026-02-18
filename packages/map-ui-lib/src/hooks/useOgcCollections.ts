import { useState, useEffect } from 'react';
import { fetchCollections, type OgcCollection } from '../utils/ogcApi';

export interface UseOgcCollectionsResult {
  collections: OgcCollection[];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch the list of collections from an OGC API endpoint.
 *
 * @param baseUrl - The base URL of the OGC API server (e.g. "http://localhost:8000")
 */
export function useOgcCollections(baseUrl: string | null): UseOgcCollectionsResult {
  const [collections, setCollections] = useState<OgcCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!baseUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCollections(baseUrl)
      .then((data) => {
        if (!cancelled) {
          setCollections(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  return { collections, loading, error };
}
