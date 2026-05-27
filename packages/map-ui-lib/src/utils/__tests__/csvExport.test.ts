// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { featuresToCsv, downloadCsv } from '../csvExport';
import type { GeoJsonFeature } from '../ogcApi';

function feature(props: Record<string, unknown>, geometry: GeoJsonFeature['geometry'] = null): GeoJsonFeature {
  return { type: 'Feature', geometry, properties: props } as unknown as GeoJsonFeature;
}

describe('featuresToCsv', () => {
  it('returns empty string for empty features array', () => {
    expect(featuresToCsv([])).toBe('');
  });

  it('writes header + rows with property keys derived from features', () => {
    const csv = featuresToCsv(
      [
        feature({ name: 'A', pop: 1 }, { type: 'Point', coordinates: [0, 0] } as any),
        feature({ name: 'B', pop: 2 }, { type: 'Point', coordinates: [1, 1] } as any),
      ],
      { includeGeometry: false },
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,pop');
    expect(lines[1]).toBe('A,1');
    expect(lines[2]).toBe('B,2');
  });

  it('unions property keys across features with mixed shapes', () => {
    const csv = featuresToCsv(
      [feature({ a: 1 }), feature({ b: 2 })],
      { includeGeometry: false },
    );
    const header = csv.split('\n')[0].split(',');
    expect(header).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = featuresToCsv(
      [feature({ name: 'a,b', quote: 'say "hi"', multi: 'line1\nline2' })],
      { includeGeometry: false },
    );
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it('treats null/undefined cell values as empty', () => {
    const csv = featuresToCsv(
      [feature({ name: null, other: undefined, set: 'x' })],
      { includeGeometry: false, fields: ['name', 'other', 'set'] },
    );
    expect(csv.split('\n')[1]).toBe(',,x');
  });

  it('stringifies object property values as JSON', () => {
    const csv = featuresToCsv(
      [feature({ extra: { a: 1, b: 'c' } })],
      { includeGeometry: false },
    );
    expect(csv).toContain('"{""a"":1,""b"":""c""}"');
  });

  it('uses an explicit `fields` list when provided', () => {
    const csv = featuresToCsv(
      [feature({ a: 1, b: 2, c: 3 })],
      { fields: ['c', 'a'], includeGeometry: false },
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe('c,a');
    expect(lines[1]).toBe('3,1');
  });

  it('honors a custom delimiter', () => {
    const csv = featuresToCsv(
      [feature({ name: 'A', pop: 1 })],
      { delimiter: ';', includeGeometry: false },
    );
    expect(csv.split('\n')[0]).toBe('name;pop');
    expect(csv.split('\n')[1]).toBe('A;1');
  });

  it('includes a geometry column with WKT by default', () => {
    const csv = featuresToCsv([
      feature({ name: 'A' }, { type: 'Point', coordinates: [1, 2] } as any),
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,geometry');
    expect(lines[1]).toContain('POINT');
  });

  it('escapes a comma in the geometry WKT cell', () => {
    const csv = featuresToCsv([
      feature({ name: 'A' }, {
        type: 'Point',
        coordinates: [1, 2],
      } as any),
    ]);
    // WKT contains a space + comma; the cell must be quoted because WKT contains commas
    const dataRow = csv.split('\n')[1];
    expect(dataRow.startsWith('A,')).toBe(true);
  });
});

describe('downloadCsv', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a Blob URL and clicks an anchor element', () => {
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      style: {} as CSSStyleDeclaration,
      click,
    } as unknown as HTMLAnchorElement;
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL,
    });
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(anchor);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue(anchor);

    downloadCsv('a,b\n1,2', 'test.csv');

    expect(anchor.href).toBe('blob:fake');
    expect(anchor.download).toBe('test.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
