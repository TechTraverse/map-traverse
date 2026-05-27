import { useState, useEffect } from 'react';
import { fetchWmtsCapabilities, type WmtsCapabilities } from '../utils/wmts';
import type { SourceAuth } from '../types';

export interface UseWmtsCapabilitiesResult {
  capabilities: WmtsCapabilities | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches and caches a WMTS GetCapabilities document.
 * Returns parsed layer metadata including available styles, tile matrix sets, and formats.
 */
export function useWmtsCapabilities(
  capabilitiesUrl: string | null,
  auth?: SourceAuth,
): UseWmtsCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<WmtsCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authKey = auth ? `${auth.type}:${auth.name}:${auth.value}` : '';

  useEffect(() => {
    if (!capabilitiesUrl) {
      setCapabilities(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchWmtsCapabilities(capabilitiesUrl, auth, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCapabilities(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
    // authKey collapses the SourceAuth object identity so we don't refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilitiesUrl, authKey]);

  return { capabilities, loading, error };
}
