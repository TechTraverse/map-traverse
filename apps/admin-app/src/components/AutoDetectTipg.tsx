import { useAutoDetectTipg } from '../hooks/useAutoDetectTipg';

/**
 * Invisible component that triggers one-shot auto-detection of a co-deployed
 * OGC API. Mounted inside the AuthProvider so it can read auth state, but
 * outside the router so route changes don't re-run it.
 */
export function AutoDetectTipg(): null {
  useAutoDetectTipg();
  return null;
}
