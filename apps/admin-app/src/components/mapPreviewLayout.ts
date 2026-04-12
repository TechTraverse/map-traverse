/**
 * Resolve the effective layout mode from config + viewport state.
 * Extracted from MapPreview for testability — avoids needing to import
 * the full component (and its MapLibre/DOM dependencies) in tests.
 */
export function resolveEffectiveLayout(
  controlLayout: string | undefined,
  isNarrowViewport: boolean,
): 'individual' | 'side-menu' {
  if (controlLayout === 'auto') {
    return isNarrowViewport ? 'side-menu' : 'individual';
  }
  return (controlLayout as 'individual' | 'side-menu') ?? 'individual';
}
