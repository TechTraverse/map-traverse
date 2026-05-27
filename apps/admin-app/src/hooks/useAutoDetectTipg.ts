import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { detectLocalOgcApi } from '../utils/detectLocalOgcApi';

/**
 * Fires once per browser session, after auth resolves, to look for a co-deployed
 * OGC API at `${origin}/ogc/` and add it as a source if no source already
 * points at that URL. Silently no-ops on any failure or skip condition.
 */
export function useAutoDetectTipg(): void {
  const { authenticated, loading } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (loading || !authenticated || ran.current) return;
    ran.current = true;
    void detectLocalOgcApi({ fetch: window.fetch.bind(window), origin: window.location.origin });
  }, [authenticated, loading]);
}
