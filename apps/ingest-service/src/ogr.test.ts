import { describe, it, expect } from 'vitest';
import { buildOgr2OgrArgs, buildPgConn, buildOgrInfoArgs, isValidSrs, isValidGeomField, type OgrBuildOptions } from './ogr.js';

const base: OgrBuildOptions = {
  schema: 'uploads',
  table: 'parcels',
  pgConn: 'PG:host=db port=5432 dbname=gis user=postgres password=secret',
  srcPath: '/tmp/ingest-x/parcels.shp',
  format: 'shp-zip',
  hasSourceCrs: true,
};

/** Find the value argv element following a flag. */
function valueAfter(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

describe('buildOgr2OgrArgs — common invariants', () => {
  it('always reprojects to EPSG:4326', () => {
    expect(valueAfter(buildOgr2OgrArgs(base), '-t_srs')).toBe('EPSG:4326');
  });

  it('targets schema.table with the project geom/fid conventions', () => {
    const args = buildOgr2OgrArgs(base);
    expect(valueAfter(args, '-nln')).toBe('uploads.parcels');
    expect(args).toContain('GEOMETRY_NAME=geom');
    // FID column must not collide with a user-supplied `gid` attribute.
    expect(args).toContain('FID=ogc_fid');
    expect(args).not.toContain('FID=gid');
    expect(args).toContain('SCHEMA=uploads');
    expect(args).toContain('SPATIAL_INDEX=GIST');
    expect(args).toContain('PROMOTE_TO_MULTI');
    expect(args).toContain('-overwrite');
  });

  it('places -f PostgreSQL and the dest before the source path', () => {
    const args = buildOgr2OgrArgs(base);
    expect(args.slice(0, 3)).toEqual(['-f', 'PostgreSQL', base.pgConn]);
    expect(args.indexOf(base.pgConn)).toBeLessThan(args.indexOf(base.srcPath));
  });

  it('contains no shell metacharacters as standalone args', () => {
    // Every element is passed to execFile separately; assert none is a shell op.
    const args = buildOgr2OgrArgs({ ...base, table: 'parcels', geomField: 'geom' });
    for (const a of args) {
      expect(a).not.toMatch(/^[;&|`$()]/);
    }
  });
});

describe('buildOgr2OgrArgs — shapefile .shx self-repair', () => {
  it('adds SHAPE_RESTORE_SHX for shapefile zips', () => {
    const args = buildOgr2OgrArgs({ ...base, format: 'shp-zip' });
    const i = args.indexOf('SHAPE_RESTORE_SHX');
    expect(i).toBeGreaterThan(-1);
    expect(args[i - 1]).toBe('--config');
    expect(args[i + 1]).toBe('YES');
  });

  it('does not add SHAPE_RESTORE_SHX for non-shapefile formats', () => {
    expect(buildOgr2OgrArgs({ ...base, format: 'gpkg' })).not.toContain('SHAPE_RESTORE_SHX');
  });
});

describe('buildOgr2OgrArgs — CRS handling', () => {
  it('omits -s_srs when the source declares its own CRS', () => {
    expect(buildOgr2OgrArgs({ ...base, hasSourceCrs: true })).not.toContain('-s_srs');
  });

  it('adds -s_srs with the provided override when no source CRS', () => {
    const args = buildOgr2OgrArgs({ ...base, hasSourceCrs: false, srs: 'EPSG:2232' });
    expect(valueAfter(args, '-s_srs')).toBe('EPSG:2232');
  });

  it('defaults -s_srs to EPSG:4326 when no source CRS and no override', () => {
    const args = buildOgr2OgrArgs({ ...base, hasSourceCrs: false });
    expect(valueAfter(args, '-s_srs')).toBe('EPSG:4326');
  });
});

describe('buildOgr2OgrArgs — CSV', () => {
  it('adds WKT open options before the source path', () => {
    const args = buildOgr2OgrArgs({ ...base, format: 'csv', srcPath: '/tmp/x.csv', geomField: 'the_geom' });
    expect(args).toContain('GEOM_POSSIBLE_NAMES=the_geom');
    expect(args).toContain('KEEP_GEOM_COLUMNS=NO');
    // -oo must precede the source path.
    expect(args.lastIndexOf('-oo')).toBeLessThan(args.indexOf('/tmp/x.csv'));
  });

  it('falls back to default geom column candidates', () => {
    const args = buildOgr2OgrArgs({ ...base, format: 'csv', srcPath: '/tmp/x.csv' });
    expect(args).toContain('GEOM_POSSIBLE_NAMES=geom,wkt,the_geom,geometry');
  });

  it('does not add CSV open options for non-CSV formats', () => {
    expect(buildOgr2OgrArgs({ ...base, format: 'gpkg' })).not.toContain('-oo');
  });
});

describe('buildOgr2OgrArgs — layer selection', () => {
  it('puts the sublayer positionally right after the source path', () => {
    const args = buildOgr2OgrArgs({ ...base, format: 'gpkg', srcPath: '/tmp/x.gpkg', layer: 'roads' });
    expect(args[args.indexOf('/tmp/x.gpkg') + 1]).toBe('roads');
  });

  it('omits the positional layer when none given', () => {
    const args = buildOgr2OgrArgs({ ...base, format: 'gpkg', srcPath: '/tmp/x.gpkg' });
    expect(args[args.indexOf('/tmp/x.gpkg') + 1]).toBe('-nln');
  });
});

describe('isValidSrs (SSRF guard for -s_srs)', () => {
  it('accepts authority-coded CRS', () => {
    for (const s of ['EPSG:4326', 'EPSG:2232', 'ESRI:102008', 'OGC:CRS84', 'CRS84']) {
      expect(isValidSrs(s)).toBe(true);
    }
  });

  it('rejects virtual-filesystem paths and junk', () => {
    for (const s of [
      '/vsicurl/http://attacker/evil.prj',
      '/vsizip/x.zip',
      'http://attacker/evil.prj',
      '+proj=longlat',
      'EPSG:4326 /vsicurl/x',
      '../../etc/passwd',
    ]) {
      expect(isValidSrs(s)).toBe(false);
    }
  });
});

describe('isValidGeomField', () => {
  it('accepts column names and comma lists', () => {
    expect(isValidGeomField('geom')).toBe(true);
    expect(isValidGeomField('the_geom')).toBe(true);
    expect(isValidGeomField('geom,wkt,the_geom,geometry')).toBe(true);
  });

  it('rejects injection-ish values', () => {
    expect(isValidGeomField('geom; DROP')).toBe(false);
    expect(isValidGeomField('1geom')).toBe(false);
    expect(isValidGeomField('geom=x')).toBe(false);
    expect(isValidGeomField('')).toBe(false);
  });
});

describe('buildPgConn / buildOgrInfoArgs', () => {
  it('builds a PG connection string', () => {
    expect(buildPgConn({ host: 'db', port: 5432, database: 'gis', user: 'u', password: 'p' }))
      .toBe('PG:host=db port=5432 dbname=gis user=u password=p');
  });

  it('builds ogrinfo preflight args', () => {
    expect(buildOgrInfoArgs('/tmp/x.gpkg')).toEqual(['-json', '-ro', '-so', '/tmp/x.gpkg']);
  });
});
