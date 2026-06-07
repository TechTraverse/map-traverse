/**
 * PostgreSQL identifier safety for uploaded-dataset table names.
 *
 * This is an intentional MIRROR of the ingest sidecar's
 * `apps/ingest-service/src/identifiers.ts`. The two share an identical vector
 * list in their tests (`sanitizeTableName.test.ts` here, `identifiers.test.ts`
 * there); if you change one, change both.
 */

export const MAX_IDENTIFIER_LENGTH = 63;

const RESERVED = new Set([
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'table',
  'schema', 'index', 'from', 'where', 'join', 'group', 'order', 'union',
  'user', 'grant', 'revoke', 'public', 'uploads', 'map_admin', 'session',
]);

const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/;

export function isValidIdentifier(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_IDENTIFIER_LENGTH &&
    IDENTIFIER_RE.test(name) &&
    !RESERVED.has(name)
  );
}

export function sanitizeTableName(input: string): string {
  let s = (input ?? '').toString().toLowerCase().trim();

  const EXT_RE = /\.(geojson|json|csv|kml|zip|fgb|gpkg|shp|shx|dbf|prj)$/i;
  while (EXT_RE.test(s)) s = s.replace(EXT_RE, '');

  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '_');
  s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  if (s.length === 0) s = 'dataset';
  if (/^[0-9]/.test(s)) s = `t_${s}`;

  if (s.length > MAX_IDENTIFIER_LENGTH) {
    s = s.slice(0, MAX_IDENTIFIER_LENGTH).replace(/_+$/, '');
  }
  if (RESERVED.has(s)) {
    s = `${s.slice(0, MAX_IDENTIFIER_LENGTH - 2)}_t`;
  }
  return s;
}
