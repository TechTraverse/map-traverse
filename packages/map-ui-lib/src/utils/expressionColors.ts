import type { StyleConfig } from '../types';

/** Returns true if a paint value is a MapLibre expression array (not a plain color string). */
export function isExpression(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Parses a single `case` branch test produced by the categorical editor.
 * Returns null for anything the editor didn't emit (so arbitrary `case`
 * expressions aren't mistaken for categorical styles).
 */
function parseCategoricalCaseTest(
  test: unknown,
): { property: string; value: string; matchType: 'equals' | 'contains' } | null {
  if (!Array.isArray(test)) return null;
  if (test[0] === '==' && Array.isArray(test[1]) && test[1][0] === 'get' && typeof test[1][1] === 'string') {
    return { property: test[1][1], value: String(test[2] ?? ''), matchType: 'equals' };
  }
  if (
    test[0] === 'in' &&
    Array.isArray(test[1]) && test[1][0] === 'downcase' && typeof test[1][1] === 'string' &&
    Array.isArray(test[2]) && test[2][0] === 'downcase' &&
    Array.isArray(test[2][1]) && test[2][1][0] === 'to-string' &&
    Array.isArray(test[2][1][1]) && test[2][1][1][0] === 'get' && typeof test[2][1][1][1] === 'string'
  ) {
    return { property: test[2][1][1][1], value: test[1][1], matchType: 'contains' };
  }
  return null;
}

/** True when a `case` expression has the shape our categorical editor produces. */
function isCategoricalCaseExpr(expr: unknown[]): boolean {
  if (expr[0] !== 'case') return false;
  // Shape: ['case', test1, color1, ..., fallback] → odd total length, at least one pair.
  if (expr.length < 4 || expr.length % 2 !== 0) return false;
  for (let i = 1; i < expr.length - 1; i += 2) {
    if (!parseCategoricalCaseTest(expr[i])) return false;
  }
  return true;
}

/** Returns the expression type ('match' or 'interpolate'), or null for unsupported expressions. */
export function expressionType(expr: unknown[]): 'match' | 'interpolate' | null {
  if (expr[0] === 'match') return 'match';
  if (expr[0] === 'interpolate') return 'interpolate';
  if (isCategoricalCaseExpr(expr)) return 'match';
  return null;
}

/** Extracts all color strings from a match or interpolate expression for preview. */
export function expressionColors(expr: unknown[]): string[] {
  if (expr[0] === 'match') {
    // ["match", ["get", prop], val1, color1, ..., fallback]
    const colors: string[] = [];
    for (let i = 3; i < expr.length; i += 2) {
      if (typeof expr[i] === 'string') colors.push(expr[i] as string);
    }
    const fallback = expr[expr.length - 1];
    if (typeof fallback === 'string') colors.push(fallback);
    return colors;
  }
  if (isCategoricalCaseExpr(expr)) {
    // ["case", test1, color1, test2, color2, ..., fallback]
    const colors: string[] = [];
    for (let i = 2; i < expr.length - 1; i += 2) {
      if (typeof expr[i] === 'string') colors.push(expr[i] as string);
    }
    const fallback = expr[expr.length - 1];
    if (typeof fallback === 'string') colors.push(fallback);
    return colors;
  }
  if (expr[0] === 'interpolate') {
    // ["interpolate", ["linear"], ["get", prop], stop1, color1, ...]
    const colors: string[] = [];
    for (let i = 4; i < expr.length; i += 2) {
      if (typeof expr[i] === 'string') colors.push(expr[i] as string);
    }
    return colors;
  }
  return [];
}

export interface ExpressionColorEntry {
  label: string;
  color: string;
}

/** Extracts label/color pairs from a match or interpolate expression. */
export function expressionEntries(expr: unknown[]): ExpressionColorEntry[] {
  if (expr[0] === 'match') {
    // ["match", ["get", prop], val1, color1, val2, color2, ..., fallback]
    const entries: ExpressionColorEntry[] = [];
    for (let i = 2; i < expr.length - 1; i += 2) {
      const label = String(expr[i]);
      const color = expr[i + 1];
      if (typeof color === 'string') {
        entries.push({ label, color });
      }
    }
    const fallback = expr[expr.length - 1];
    if (typeof fallback === 'string') {
      entries.push({ label: 'Other', color: fallback });
    }
    return entries;
  }
  if (isCategoricalCaseExpr(expr)) {
    const entries: ExpressionColorEntry[] = [];
    for (let i = 1; i < expr.length - 1; i += 2) {
      const parsed = parseCategoricalCaseTest(expr[i]);
      const color = expr[i + 1];
      if (!parsed || typeof color !== 'string') continue;
      const label = parsed.matchType === 'contains' ? `contains "${parsed.value}"` : parsed.value;
      entries.push({ label, color });
    }
    const fallback = expr[expr.length - 1];
    if (typeof fallback === 'string') {
      entries.push({ label: 'Other', color: fallback });
    }
    return entries;
  }
  if (expr[0] === 'interpolate') {
    // ["interpolate", ["linear"], ["get", prop], stop1, color1, stop2, color2, ...]
    const entries: ExpressionColorEntry[] = [];
    for (let i = 3; i < expr.length; i += 2) {
      const label = String(expr[i]);
      const color = expr[i + 1];
      if (typeof color === 'string') {
        entries.push({ label, color });
      }
    }
    return entries;
  }
  return [];
}

/** Extracts the property name from a match, categorical case, or interpolate expression. */
export function expressionPropertyName(expr: unknown[]): string | null {
  if (isCategoricalCaseExpr(expr)) {
    const firstTest = parseCategoricalCaseTest(expr[1]);
    return firstTest?.property ?? null;
  }
  // match: ["match", ["get", prop], ...]
  // interpolate: ["interpolate", [...], ["get", prop] | ["to-number", ["get", prop]], ...]
  const getExpr = expr[0] === 'match' ? expr[1] : expr[0] === 'interpolate' ? expr[2] : null;
  if (Array.isArray(getExpr)) {
    if (getExpr[0] === 'get' && typeof getExpr[1] === 'string') return getExpr[1];
    if (getExpr[0] === 'to-number' && Array.isArray(getExpr[1]) && getExpr[1][0] === 'get') {
      return (getExpr[1][1] as string) ?? null;
    }
  }
  return null;
}

/** Extracts the primary color paint value from a StyleConfig (may be a string or expression). */
export function getPrimaryColor(style: StyleConfig): string | unknown[] {
  switch (style.type) {
    case 'fill':
      return style.paint['fill-color'] ?? '#000000';
    case 'line':
      return style.paint['line-color'] ?? '#000000';
    case 'circle':
      return style.paint['circle-color'] ?? '#000000';
    case 'symbol':
      return style.paint['text-color'] ?? style.paint['icon-color'] ?? '#000000';
  }
}

/** Returns the legend swatch shape for a given style type. */
export function getShapeForStyleType(style: StyleConfig): 'square' | 'line' | 'circle' {
  switch (style.type) {
    case 'fill':
      return 'square';
    case 'line':
      return 'line';
    case 'circle':
    case 'symbol':
      return 'circle';
  }
}
