/**
 * PostgreSQL identifier safety. The sanitizer turns an arbitrary label/filename
 * into a safe lowercase snake_case table name; the validator is the defense-in-
 * depth gate applied again right before any DDL is composed.
 *
 * This logic is intentionally mirrored in the admin-app
 * (`apps/admin-app/server/sanitizeTableName.ts`). A shared vector list keeps the
 * two implementations in lockstep — see `identifiers.test.ts`.
 */

/** PG identifiers are capped at 63 bytes. */
export const MAX_IDENTIFIER_LENGTH = 63;

/**
 * Words we refuse as table names. Tables are always addressed schema-qualified
 * (`uploads.<table>`), so this is belt-and-suspenders rather than load-bearing,
 * but it avoids confusing names like a table literally called `select`.
 */
const RESERVED = new Set([
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'table',
  'schema', 'index', 'from', 'where', 'join', 'group', 'order', 'union',
  'user', 'grant', 'revoke', 'public', 'uploads', 'map_admin', 'session',
]);

/** Valid PG identifier we will allow: lowercase, starts with letter/underscore. */
const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * True if `name` is a safe, allowed identifier. Used at DELETE/DDL time on
 * values that originate from our own DB rows — never trust, always re-check.
 */
export function isValidIdentifier(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_IDENTIFIER_LENGTH &&
    IDENTIFIER_RE.test(name) &&
    !RESERVED.has(name)
  );
}

/**
 * Turn an arbitrary string (a user label or original filename) into a valid,
 * non-reserved, ≤63-byte snake_case identifier. Always returns something that
 * satisfies `isValidIdentifier`.
 */
export function sanitizeTableName(input: string): string {
  let s = (input ?? '').toString().toLowerCase().trim();

  // Strip trailing file extension(s), e.g. "parcels.shp.zip" -> "parcels".
  const EXT_RE = /\.(geojson|json|csv|kml|zip|fgb|gpkg|shp|shx|dbf|prj)$/i;
  while (EXT_RE.test(s)) s = s.replace(EXT_RE, '');

  // Drop diacritics, then collapse any run of non-alphanumerics to a single "_".
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '_');
  s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  if (s.length === 0) s = 'dataset';

  // Identifiers can't start with a digit.
  if (/^[0-9]/.test(s)) s = `t_${s}`;

  // Cap at 63 bytes, trimming any trailing underscore left by truncation.
  if (s.length > MAX_IDENTIFIER_LENGTH) {
    s = s.slice(0, MAX_IDENTIFIER_LENGTH).replace(/_+$/, '');
  }

  // Avoid reserved words by suffixing (keeping within the length cap).
  if (RESERVED.has(s)) {
    s = `${s.slice(0, MAX_IDENTIFIER_LENGTH - 2)}_t`;
  }

  return s;
}
