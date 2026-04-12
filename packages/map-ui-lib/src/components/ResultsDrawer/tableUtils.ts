/** Format a property value for table display. */
export function formatCellValue(value: unknown): string {
  if (value == null) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Compare two property values for sorting. Handles null, numbers, and strings. */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

/**
 * Compute visible column order from base columns + user reorder + hidden set.
 * Unknown reordered columns are ignored; new base columns missing from order
 * are appended at the end.
 */
export function applyColumnOrder(
  baseColumns: string[],
  columnOrder: string[] | undefined,
): string[] {
  if (!columnOrder || columnOrder.length === 0) return baseColumns;
  const known = new Set(baseColumns);
  const kept = columnOrder.filter((c) => known.has(c));
  const leftover = baseColumns.filter((c) => !kept.includes(c));
  return [...kept, ...leftover];
}
