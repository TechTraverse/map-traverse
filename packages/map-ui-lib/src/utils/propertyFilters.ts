import { eq, and, type CQL2Expression } from './cql2';

/**
 * A flat, operator-free filter rule: pick a layer, pick a property, type a
 * value. The operator is implicitly `=`. Compiled to CQL2 at the call site
 * via {@link propertyFiltersToCql2} so the panel itself stays CQL2-free.
 */
export interface PropertyFilter {
  id: string;
  layerId: string;
  property: string;
  value: string;
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
  const usable = filters.filter(
    (f) => f.layerId === layerId && f.property && f.value,
  );
  if (usable.length === 0) return null;
  return and(...usable.map((f) => eq(f.property, f.value)));
}
