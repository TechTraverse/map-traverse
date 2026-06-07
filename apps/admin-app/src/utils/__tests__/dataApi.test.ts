import { describe, it, expect } from 'vitest';
import { buildUploadForm, buildRowsQuery, DataApiError } from '../dataApi';

function file(name = 'parcels.geojson'): File {
  return new File([JSON.stringify({ type: 'FeatureCollection', features: [] })], name, {
    type: 'application/geo+json',
  });
}

describe('buildUploadForm', () => {
  it('always includes the file', () => {
    const form = buildUploadForm(file(), {});
    expect(form.get('file')).toBeInstanceOf(File);
  });

  it('includes only the provided optional fields', () => {
    const form = buildUploadForm(file(), { format: 'geojson', label: 'My Parcels' });
    expect(form.get('format')).toBe('geojson');
    expect(form.get('label')).toBe('My Parcels');
    expect(form.get('srs')).toBeNull();
    expect(form.get('layer')).toBeNull();
    expect(form.get('replace')).toBeNull();
  });

  it('serializes replace as the string "true" only when set', () => {
    expect(buildUploadForm(file(), { replace: true }).get('replace')).toBe('true');
    expect(buildUploadForm(file(), { replace: false }).get('replace')).toBeNull();
  });

  it('passes srs / geomField / layer through', () => {
    const form = buildUploadForm(file('roads.csv'), { srs: 'EPSG:2232', geomField: 'the_geom', layer: 'roads' });
    expect(form.get('srs')).toBe('EPSG:2232');
    expect(form.get('geomField')).toBe('the_geom');
    expect(form.get('layer')).toBe('roads');
  });
});

describe('buildRowsQuery', () => {
  it('returns an empty string when no params are given', () => {
    expect(buildRowsQuery({})).toBe('');
  });

  it('includes only the provided params', () => {
    expect(buildRowsQuery({ limit: 50, offset: 100 })).toBe('?limit=50&offset=100');
  });

  it('includes 0 values (offset=0)', () => {
    expect(buildRowsQuery({ offset: 0 })).toBe('?offset=0');
  });

  it('serializes sort/order/filter', () => {
    const qs = buildRowsQuery({ sort: 'name', order: 'desc', filterColumn: 'name', filter: 'main st' });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.get('sort')).toBe('name');
    expect(params.get('order')).toBe('desc');
    expect(params.get('filterColumn')).toBe('name');
    expect(params.get('filter')).toBe('main st');
  });

  it('url-encodes filter values', () => {
    expect(buildRowsQuery({ filter: 'a&b=c' })).toContain('filter=a%26b%3Dc');
  });
});

describe('DataApiError', () => {
  it('derives a message from the body.error', () => {
    const err = new DataApiError(409, { error: 'already exists', conflict: true });
    expect(err.status).toBe(409);
    expect(err.message).toBe('already exists');
    expect(err.body.conflict).toBe(true);
  });

  it('falls back to a status message', () => {
    expect(new DataApiError(500, {}).message).toContain('500');
  });
});
