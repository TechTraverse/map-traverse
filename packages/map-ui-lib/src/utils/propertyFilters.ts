import { eq, gt, lt, gte, lte, between, tAfter, tBefore, tDuring, and, type CQL2Expression } from './cql2';

/**
 * The structured value for a property filter row. Matches the shapes already
 * used by SearchFilterValue so CQL2 conversion logic stays consistent.
 */
export type PropertyFilterValue =
  | string
  | { value: number; operator: string }
  | { min: number; max: number }
  | { start: string; end: string };

/**
 * A flat filter rule: pick a layer, pick a property, enter a value.
 * The propertyType drives which input the UI renders and how the value
 * is compiled to CQL2.
 */
export interface PropertyFilter {
  id: string;
  layerId: string;
  property: string;
  propertyType: 'string' | 'number' | 'datetime';
  value: PropertyFilterValue;
}

/** Returns true when a filter row has enough data to produce a CQL2 clause. */
function isUsable(f: PropertyFilter): boolean {
  if (!f.property) return false;
  const v = f.value;
  if (typeof v === 'string') return v !== '';
  if (typeof v === 'object' && 'operator' in v) return v.value !== undefined;
  if (typeof v === 'object' && 'min' in v) return true;
  if (typeof v === 'object' && 'start' in v) return !!v.start || !!v.end;
  return false;
}

/** Compiles a single PropertyFilter to a CQL2 expression. */
function filterToCql2(f: PropertyFilter): CQL2Expression | null {
  const v = f.value;

  // Plain string → equality
  if (typeof v === 'string') {
    if (v === '') return null;
    if (f.propertyType === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      return eq(f.property, n);
    }
    return eq(f.property, v);
  }

  // { value, operator } — numeric with comparison operator
  if (typeof v === 'object' && 'operator' in v) {
    const { value: num, operator } = v;
    if (num === undefined || num === null) return null;
    switch (operator) {
      case 'gt':  return gt(f.property, num);
      case 'lt':  return lt(f.property, num);
      case 'gte': return gte(f.property, num);
      case 'lte': return lte(f.property, num);
      default:    return eq(f.property, num);
    }
  }

  // { min, max } — numeric between
  if (typeof v === 'object' && 'min' in v) {
    const { min, max } = v;
    return between(f.property, min, max);
  }

  // { start, end } — datetime range
  if (typeof v === 'object' && 'start' in v) {
    const { start, end } = v;
    if (start && end) return tDuring(f.property, { timestamp: start }, { timestamp: end });
    if (start) return tAfter(f.property, { timestamp: start });
    if (end) return tBefore(f.property, { timestamp: end });
    return null;
  }

  return null;
}

/**
 * Compiles the flat filter list for a single layer down to a CQL2 expression.
 * Returns `null` when the layer has no usable rows (empty property or empty
 * value rows are skipped so drafting a rule doesn't accidentally hide every
 * feature).
 */
export function propertyFiltersToCql2(
  filters: PropertyFilter[],
  layerId: string,
): CQL2Expression | null {
  const usable = filters.filter((f) => f.layerId === layerId && isUsable(f));
  if (usable.length === 0) return null;
  return and(...usable.map(filterToCql2));
}
