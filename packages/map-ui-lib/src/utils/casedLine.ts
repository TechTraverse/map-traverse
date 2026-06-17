import type { LineStyle } from '../types';

/**
 * A "cased line" (highway-style) is stored as a pair of MapLibre line layers:
 *   pair[0] = the wider OUTER casing, drawn first (underneath)
 *   pair[1] = the narrower INNER road line, drawn on top
 * This matches `presetLineCased` in `stylePresets.ts` and the `'line,line'`
 * detection in `inferActivePresetId`. We keep this two-layer representation as
 * the on-disk format (no schema change); the editor only changes how the pair
 * is *presented*.
 */
export type CasedLinePair = [LineStyle, LineStyle];

export interface CasedLineParams {
  /** Colour of the inner (road) line. */
  innerColor: string;
  /** Width of the inner (road) line, in px. */
  innerWidth: number;
  /** Colour of the outer (casing) line. */
  outerColor: string;
  /**
   * How far the casing extends beyond the inner line on EACH side, in px.
   * The outer line's total width is `innerWidth + 2 * edge`, so the casing can
   * never be narrower than the road it surrounds.
   */
  edge: number;
}

// Defaults mirror `presetLineCased` / `defaultLine`.
const DEFAULT_INNER_WIDTH = 2;
const DEFAULT_OUTER_WIDTH = 4;
const DEFAULT_INNER_COLOR = '#2980b9';
const DEFAULT_OUTER_COLOR = '#1a5276';

function resolveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function resolveColor(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Derive the friendly inner/outer params from a stored cased-line pair. */
export function getCasedLineParams(pair: CasedLinePair): CasedLineParams {
  const [outer, inner] = pair;
  const innerWidth = resolveNumber(inner?.paint?.['line-width'], DEFAULT_INNER_WIDTH);
  const outerWidth = resolveNumber(outer?.paint?.['line-width'], DEFAULT_OUTER_WIDTH);
  return {
    innerColor: resolveColor(inner?.paint?.['line-color'], DEFAULT_INNER_COLOR),
    innerWidth,
    outerColor: resolveColor(outer?.paint?.['line-color'], DEFAULT_OUTER_COLOR),
    edge: Math.max(0, (outerWidth - innerWidth) / 2),
  };
}

/**
 * Apply edited params back onto a cased-line pair. All other paint keys on each
 * line (e.g. `line-opacity`, `line-cap`) are preserved — only `line-color` and
 * `line-width` are rewritten.
 */
export function applyCasedLineParams(prev: CasedLinePair, params: CasedLineParams): CasedLinePair {
  const [outer, inner] = prev;
  const edge = Math.max(0, params.edge);
  const innerWidth = Math.max(0, params.innerWidth);
  const outerWidth = innerWidth + edge * 2;
  return [
    { ...outer, type: 'line', paint: { ...outer.paint, 'line-color': params.outerColor, 'line-width': outerWidth } },
    { ...inner, type: 'line', paint: { ...inner.paint, 'line-color': params.innerColor, 'line-width': innerWidth } },
  ];
}

/**
 * Whether a cased-line pair is "plain" enough for the friendly editor to fully
 * represent. Pairs with data-driven (expression) colours/widths, dash patterns,
 * line patterns, or per-category dashing fall back to the raw style cards so
 * those settings aren't silently dropped.
 */
export function isPlainCasedLine(pair: CasedLinePair): boolean {
  return pair.every((s) => {
    if (!s || s.type !== 'line') return false;
    const paint = s.paint ?? {};
    if (typeof paint['line-color'] !== 'string') return false; // expression colour
    if (typeof paint['line-width'] !== 'number') return false; // expression width
    if (paint['line-dasharray'] || paint['line-pattern'] || paint['line-gradient']) return false;
    if (s.dashByCategory) return false;
    return true;
  });
}
