import { describe, it, expect } from 'vitest';
import type { CollectionSchema } from '../columnIntrospection.js';
import {
  buildInsert,
  buildUpdate,
  buildRowsQuery,
  geometryExpr,
  parsePaging,
  mapRowToApi,
  rowSelectClause,
  RowValidationError,
} from '../rowSql.js';

/** Multipolygon collection: ogc_fid PK + two data cols + multi geometry @ 4326. */
const MULTI_SCHEMA: CollectionSchema = {
  primaryKey: 'ogc_fid',
  geometry: { column: 'geom', type: 'MULTIPOLYGON', srid: 4326 },
  columns: [
    { name: 'ogc_fid', dataType: 'integer', udtName: 'int4', nullable: false, isPrimaryKey: true, isGeometry: false },
    { name: 'name', dataType: 'text', udtName: 'text', nullable: true, isPrimaryKey: false, isGeometry: false },
    { name: 'pop', dataType: 'integer', udtName: 'int4', nullable: true, isPrimaryKey: false, isGeometry: false },
    { name: 'geom', dataType: 'USER-DEFINED', udtName: 'geometry', nullable: true, isPrimaryKey: false, isGeometry: true },
  ],
};

/** Singlepart point collection in a projected CRS (tests SRID transform + no ST_Multi). */
const POINT_SCHEMA: CollectionSchema = {
  primaryKey: 'gid',
  geometry: { column: 'wkb_geometry', type: 'POINT', srid: 3857 },
  columns: [
    { name: 'gid', dataType: 'integer', udtName: 'int4', nullable: false, isPrimaryKey: true, isGeometry: false },
    { name: 'label', dataType: 'text', udtName: 'text', nullable: true, isPrimaryKey: false, isGeometry: false },
    { name: 'wkb_geometry', dataType: 'USER-DEFINED', udtName: 'geometry', nullable: true, isPrimaryKey: false, isGeometry: true },
  ],
};

const POINT = { type: 'Point', coordinates: [-106.9, 38.5] };
const POLY = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

describe('geometryExpr', () => {
  it('wraps in ST_Multi for MULTI* declared types', () => {
    expect(geometryExpr(1, 4326, 'MULTIPOLYGON')).toBe(
      'ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 4326))',
    );
  });

  it('does NOT wrap singlepart declared types', () => {
    expect(geometryExpr(2, 3857, 'POINT')).toBe(
      'ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3857)',
    );
  });

  it('always sets the source SRID to 4326 then transforms to the column SRID', () => {
    expect(geometryExpr(1, 26913, 'LINESTRING')).toContain('ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)');
    expect(geometryExpr(1, 26913, 'LINESTRING')).toContain(', 26913)');
  });
});

describe('rowSelectClause', () => {
  it('selects PK, non-geom columns, and geometry as GeoJSON aliased to its column', () => {
    const clause = rowSelectClause(MULTI_SCHEMA);
    expect(clause).toBe('"ogc_fid", "name", "pop", ST_AsGeoJSON("geom")::json AS "geom"');
  });
});

describe('buildInsert', () => {
  it('builds a parameterized INSERT with ST_Multi geometry expression', () => {
    const { text, values } = buildInsert(MULTI_SCHEMA, 'parcels', { name: 'a', pop: 5 }, POLY);
    expect(text).toBe(
      'INSERT INTO uploads."parcels" ("name", "pop", "geom") ' +
        'VALUES ($1, $2, ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 4326))) ' +
        'RETURNING "ogc_fid", "name", "pop", ST_AsGeoJSON("geom")::json AS "geom"',
    );
    expect(values).toEqual(['a', 5, JSON.stringify(POLY)]);
  });

  it('builds a singlepart INSERT (no ST_Multi) with SRID transform', () => {
    const { text, values } = buildInsert(POINT_SCHEMA, 'pts', { label: 'x' }, POINT);
    expect(text).toContain('ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3857)');
    expect(text).not.toContain('ST_Multi');
    expect(values).toEqual(['x', JSON.stringify(POINT)]);
  });

  it('omits geometry when null', () => {
    const { text, values } = buildInsert(MULTI_SCHEMA, 'parcels', { name: 'a' }, null);
    expect(text).toBe(
      'INSERT INTO uploads."parcels" ("name") VALUES ($1) ' +
        'RETURNING "ogc_fid", "name", "pop", ST_AsGeoJSON("geom")::json AS "geom"',
    );
    expect(values).toEqual(['a']);
  });

  it('uses DEFAULT VALUES when no properties and no geometry', () => {
    const { text, values } = buildInsert(MULTI_SCHEMA, 'parcels', {}, null);
    expect(text).toContain('DEFAULT VALUES');
    expect(values).toEqual([]);
  });

  it('rejects unknown columns', () => {
    expect(() => buildInsert(MULTI_SCHEMA, 'parcels', { bogus: 1 }, null)).toThrow(RowValidationError);
  });

  it('rejects writing the primary key', () => {
    expect(() => buildInsert(MULTI_SCHEMA, 'parcels', { ogc_fid: 99 }, null)).toThrow(RowValidationError);
  });

  it('rejects writing the geometry column as a property', () => {
    expect(() => buildInsert(MULTI_SCHEMA, 'parcels', { geom: 'x' }, null)).toThrow(RowValidationError);
  });

  it('rejects malformed column identifiers (injection attempt)', () => {
    expect(() => buildInsert(MULTI_SCHEMA, 'parcels', { 'name"; DROP': 1 }, null)).toThrow(RowValidationError);
  });
});

describe('buildUpdate', () => {
  it('builds SET clauses + WHERE pk and geometry expr', () => {
    const { text, values } = buildUpdate(MULTI_SCHEMA, 'parcels', { name: 'b' }, POLY, 7);
    expect(text).toBe(
      'UPDATE uploads."parcels" SET "name" = $1, ' +
        '"geom" = ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 4326)) ' +
        'WHERE "ogc_fid" = $3 ' +
        'RETURNING "ogc_fid", "name", "pop", ST_AsGeoJSON("geom")::json AS "geom"',
    );
    expect(values).toEqual(['b', JSON.stringify(POLY), 7]);
  });

  it('leaves geometry untouched when geometry is undefined', () => {
    const { text, values } = buildUpdate(MULTI_SCHEMA, 'parcels', { name: 'b' }, undefined, 7);
    expect(text).not.toContain('geom" =');
    expect(text).toContain('WHERE "ogc_fid" = $2');
    expect(values).toEqual(['b', 7]);
  });

  it('sets geometry to NULL when geometry is null', () => {
    const { text, values } = buildUpdate(MULTI_SCHEMA, 'parcels', { name: 'b' }, null, 7);
    expect(text).toContain('"geom" = NULL');
    expect(values).toEqual(['b', 7]);
  });

  it('throws when there is nothing to update', () => {
    expect(() => buildUpdate(MULTI_SCHEMA, 'parcels', {}, undefined, 7)).toThrow(RowValidationError);
  });

  it('rejects unknown columns', () => {
    expect(() => buildUpdate(MULTI_SCHEMA, 'parcels', { nope: 1 }, undefined, 7)).toThrow(RowValidationError);
  });
});

describe('parsePaging', () => {
  it('defaults to limit 50, offset 0, ASC', () => {
    expect(parsePaging({})).toEqual({ limit: 50, offset: 0, order: 'ASC' });
  });

  it('clamps limit into 1..500', () => {
    expect(parsePaging({ limit: '0' }).limit).toBe(1);
    expect(parsePaging({ limit: '-5' }).limit).toBe(1);
    expect(parsePaging({ limit: '9999' }).limit).toBe(500);
    expect(parsePaging({ limit: '200' }).limit).toBe(200);
  });

  it('falls back to default limit for non-numeric input', () => {
    expect(parsePaging({ limit: 'abc' }).limit).toBe(50);
  });

  it('floors offset at 0', () => {
    expect(parsePaging({ offset: '-3' }).offset).toBe(0);
    expect(parsePaging({ offset: '25' }).offset).toBe(25);
    expect(parsePaging({ offset: 'nope' }).offset).toBe(0);
  });

  it('parses order case-insensitively, defaulting to ASC', () => {
    expect(parsePaging({ order: 'desc' }).order).toBe('DESC');
    expect(parsePaging({ order: 'DESC' }).order).toBe('DESC');
    expect(parsePaging({ order: 'asc' }).order).toBe('ASC');
    expect(parsePaging({ order: 'sideways' }).order).toBe('ASC');
  });
});

describe('buildRowsQuery', () => {
  it('builds an unfiltered paged query sorted by the given column', () => {
    const { rows, count } = buildRowsQuery(MULTI_SCHEMA, 'parcels', {
      paging: { limit: 50, offset: 0, order: 'ASC' },
      sort: 'name',
    });
    expect(rows.text).toBe(
      'SELECT "ogc_fid", "name", "pop", ST_AsGeoJSON("geom")::json AS "geom" FROM uploads."parcels" ' +
        'ORDER BY "name" ASC LIMIT $1 OFFSET $2',
    );
    expect(rows.values).toEqual([50, 0]);
    expect(count.text).toBe('SELECT COUNT(*)::int AS total FROM uploads."parcels"');
    expect(count.values).toEqual([]);
  });

  it('adds an ILIKE filter and shifts limit/offset placeholders', () => {
    const { rows, count } = buildRowsQuery(MULTI_SCHEMA, 'parcels', {
      paging: { limit: 10, offset: 20, order: 'DESC' },
      sort: 'ogc_fid',
      filterColumn: 'name',
      filter: 'foo',
    });
    expect(rows.text).toContain('WHERE "name"::text ILIKE \'%\' || $1 || \'%\'');
    expect(rows.text).toContain('ORDER BY "ogc_fid" DESC LIMIT $2 OFFSET $3');
    expect(rows.values).toEqual(['foo', 10, 20]);
    expect(count.text).toContain('WHERE "name"::text ILIKE \'%\' || $1 || \'%\'');
    expect(count.values).toEqual(['foo']);
  });

  it('ignores an empty filter string', () => {
    const { rows } = buildRowsQuery(MULTI_SCHEMA, 'parcels', {
      paging: { limit: 50, offset: 0, order: 'ASC' },
      sort: 'name',
      filterColumn: 'name',
      filter: '',
    });
    expect(rows.text).not.toContain('WHERE');
    expect(rows.values).toEqual([50, 0]);
  });
});

describe('mapRowToApi', () => {
  it('splits a raw row into id / properties / geometry', () => {
    const raw = { ogc_fid: 3, name: 'a', pop: 5, geom: POLY };
    expect(mapRowToApi(MULTI_SCHEMA, raw)).toEqual({
      id: 3,
      properties: { name: 'a', pop: 5 },
      geometry: POLY,
    });
  });

  it('returns null geometry when the column is null', () => {
    const raw = { ogc_fid: 3, name: 'a', pop: 5, geom: null };
    expect(mapRowToApi(MULTI_SCHEMA, raw).geometry).toBeNull();
  });
});
