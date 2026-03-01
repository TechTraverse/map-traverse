import type { StyleConfig } from '../types';

/** Returns true if a paint value is a MapLibre expression array (not a plain color string). */
export function isExpression(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Returns the expression type ('match' or 'interpolate'), or null for unsupported expressions. */
export function expressionType(expr: unknown[]): 'match' | 'interpolate' | null {
  if (expr[0] === 'match') return 'match';
  if (expr[0] === 'interpolate') return 'interpolate';
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

/** Extracts the property name from a match or interpolate expression. */
export function expressionPropertyName(expr: unknown[]): string | null {
  // match: ["match", ["get", prop], ...]
  // interpolate: ["interpolate", [...], ["get", prop], ...]
  const getExpr = expr[0] === 'match' ? expr[1] : expr[0] === 'interpolate' ? expr[2] : null;
  if (Array.isArray(getExpr) && getExpr[0] === 'get' && typeof getExpr[1] === 'string') {
    return getExpr[1];
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
