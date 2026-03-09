/**
 * CQL2 JSON (OGC Common Query Language 2) types and builder utilities.
 *
 * CQL2 JSON spec: https://docs.ogc.org/is/21-065r2/21-065r2.html
 *
 * All builder functions return plain CQL2Expression objects suitable for
 * JSON serialization and direct use with OGC API endpoints via the
 * `filter` query parameter with `filter-lang=cql2-json`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A reference to a feature property (column) in a CQL2 expression. */
export type CQL2PropertyRef = { property: string };

/** A date literal: ISO 8601 date string "YYYY-MM-DD". */
export type CQL2Date = { date: string };

/** A timestamp literal: ISO 8601 datetime string "YYYY-MM-DDTHH:MM:SSZ". */
export type CQL2Timestamp = { timestamp: string };

/** A temporal interval with start and end as date/timestamp strings or "..". */
export type CQL2Interval = { interval: [string, string] };

/**
 * A CQL2 expression node. Intentionally kept as a simple op+args structure
 * rather than a complex discriminated union — builders enforce correctness
 * and the type must remain JSON-serializable.
 */
export type CQL2Expression = {
  op: string;
  args: unknown[];
};

// ---------------------------------------------------------------------------
// Comparison builders
// ---------------------------------------------------------------------------

export function eq(property: string, value: string | number | boolean | CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: '=', args: [{ property }, value] };
}

export function neq(property: string, value: string | number | boolean): CQL2Expression {
  return { op: '<>', args: [{ property }, value] };
}

export function gt(property: string, value: number | CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: '>', args: [{ property }, value] };
}

export function gte(property: string, value: number | CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: '>=', args: [{ property }, value] };
}

export function lt(property: string, value: number | CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: '<', args: [{ property }, value] };
}

export function lte(property: string, value: number | CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: '<=', args: [{ property }, value] };
}

export function between(property: string, lower: number, upper: number): CQL2Expression {
  // Use gte+lte instead of the 'between' op — tipg/pygeofilter doesn't handle 'between' correctly
  return { op: 'and', args: [gte(property, lower), lte(property, upper)] };
}

// ---------------------------------------------------------------------------
// Pattern / array builders
// ---------------------------------------------------------------------------

/** LIKE pattern match. Use `%` as wildcard, e.g. `like('name', '%France%')`. */
export function like(property: string, pattern: string): CQL2Expression {
  return { op: 'like', args: [{ property }, pattern] };
}

/** Checks if a property value is in a list. Named inList to avoid reserved word. */
export function inList(property: string, values: (string | number)[]): CQL2Expression {
  return { op: 'in', args: [{ property }, values] };
}

export function isNull(property: string): CQL2Expression {
  return { op: 'isNull', args: [{ property }] };
}

// ---------------------------------------------------------------------------
// Logical builders
// ---------------------------------------------------------------------------

/**
 * Combines expressions with AND. Filters out null/undefined entries.
 * Returns null if no valid expressions remain.
 */
export function and(...expressions: (CQL2Expression | null | undefined)[]): CQL2Expression | null {
  const valid = expressions.filter((e): e is CQL2Expression => e != null);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  return { op: 'and', args: valid };
}

/**
 * Combines expressions with OR. Filters out null/undefined entries.
 * Returns null if no valid expressions remain.
 */
export function or(...expressions: (CQL2Expression | null | undefined)[]): CQL2Expression | null {
  const valid = expressions.filter((e): e is CQL2Expression => e != null);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  return { op: 'or', args: valid };
}

export function not(expression: CQL2Expression): CQL2Expression {
  return { op: 'not', args: [expression] };
}

// ---------------------------------------------------------------------------
// Temporal builders
// ---------------------------------------------------------------------------

export function tAfter(property: string, dateOrTimestamp: CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: 't_after', args: [{ property }, dateOrTimestamp] };
}

export function tBefore(property: string, dateOrTimestamp: CQL2Date | CQL2Timestamp): CQL2Expression {
  return { op: 't_before', args: [{ property }, dateOrTimestamp] };
}

export function tDuring(
  property: string,
  start: CQL2Date | CQL2Timestamp,
  end: CQL2Date | CQL2Timestamp,
): CQL2Expression {
  const startStr = 'date' in start ? start.date : start.timestamp;
  const endStr = 'date' in end ? end.date : end.timestamp;
  return { op: 't_during', args: [{ property }, { interval: [startStr, endStr] }] };
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Converts a simple key-value filter record to a CQL2 expression.
 * Each entry becomes an equality check; multiple entries are combined with AND.
 * Returns null if the record is empty.
 */
export function fromSimpleFilters(
  filters: Record<string, string | number>,
): CQL2Expression | null {
  const expressions = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([property, value]) => eq(property, value));

  return and(...expressions);
}

/**
 * Converts structured `SearchFilterValues` (with typed shapes) to a CQL2 expression.
 * Uses field configs to determine the right operator per field type.
 * Returns null if no active filters remain.
 */
export function fromStructuredFilters(
  filters: Record<string, import('../types').SearchFilterValue>,
  fields: import('../types').SearchField[],
): CQL2Expression | null {
  const fieldMap = new Map(fields.map((f) => [f.property, f]));

  const expressions = Object.entries(filters).map(([property, value]) => {
    if (value === undefined) return null;

    const field = fieldMap.get(property);

    // Plain string
    if (typeof value === 'string') {
      if (value === '') return null;
      if (field?.type === 'datetime') return eq(property, { timestamp: value });
      return eq(property, value);
    }

    // Plain number
    if (typeof value === 'number') {
      return eq(property, value);
    }

    // Object shapes
    if (typeof value === 'object') {
      // { start, end } — datetime range
      if ('start' in value || 'end' in value) {
        const { start, end } = value as { start: string; end: string };
        if (start && end) return tDuring(property, { timestamp: start }, { timestamp: end });
        if (start) return tAfter(property, { timestamp: start });
        if (end) return tBefore(property, { timestamp: end });
        return null;
      }

      // { value, operator }
      if ('value' in value && 'operator' in value) {
        const { value: v, operator } = value as { value: number; operator: string };
        if (v === undefined || v === null || String(v) === '') return null;
        switch (operator) {
          case 'gt':  return gt(property, v);
          case 'lt':  return lt(property, v);
          case 'gte': return gte(property, v);
          case 'lte': return lte(property, v);
          default:    return eq(property, v);
        }
      }

      // { min, max }
      if ('min' in value && 'max' in value) {
        const { min, max } = value as { min: number; max: number };
        if (min === undefined || max === undefined) return null;
        return between(property, min, max);
      }
    }

    return null;
  });

  return and(...expressions);
}

/** Serializes a CQL2 expression to a JSON string for use as a query parameter. */
export function serializeCql2(expr: CQL2Expression): string {
  return JSON.stringify(expr);
}
