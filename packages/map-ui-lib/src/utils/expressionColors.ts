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
