import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GeoJsonFeature } from '../ogcApi';

// ─── Mocks for optional export dependencies ────────────────────────────────
// We mock @mapbox/shp-write at the module level so the converter can be
// exercised in a node test environment without pulling JSZip into the graph.
// Each test resets the mock to capture the call arguments.

const zipMock = vi.fn();

vi.mock('@mapbox/shp-write', () => ({
  zip: (...args: unknown[]) => zipMock(...args),
}));

// Stub the other optional deps so importing exportConverters doesn't load them.
vi.mock('@tmcw/tokml', () => ({
  toKML: () => '<kml />',
}));

vi.mock('flatgeobuf/lib/mjs/geojson.js', () => ({
  serialize: () => new Uint8Array([1, 2, 3]),
}));

const gpkgCreateFeatureTable = vi.fn();
const gpkgAddFeatures = vi.fn();
const gpkgExport = vi.fn().mockResolvedValue(new Uint8Array([83, 81, 76, 105])); // "SQLi"
const gpkgClose = vi.fn();
const setSqljsWasmLocateFile = vi.fn();

vi.mock('@ngageoint/geopackage', () => ({
  GeoPackageAPI: {
    create: async () => ({
      createFeatureTableFromProperties: (...args: unknown[]) => gpkgCreateFeatureTable(...args),
      addGeoJSONFeaturesToGeoPackage: (...args: unknown[]) => gpkgAddFeatures(...args),
      export: () => gpkgExport(),
      close: () => gpkgClose(),
    }),
  },
  setSqljsWasmLocateFile: (fn: unknown) => setSqljsWasmLocateFile(fn),
}));

import {
  shapefileConverter,
  geojsonConverter,
  csvConverter,
  kmlConverter,
  flatgeobufConverter,
  geopackageConverter,
  exportConverters,
} from '../exportConverters';

function pointFeature(id: string, lon: number, lat: number): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: { id, name: `point-${id}` },
  };
}

function polygonFeature(id: string): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: { id },
  };
}

function featureWithoutGeometry(id: string): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: null as any,
    properties: { id },
  };
}

describe('shapefileConverter', () => {
  beforeEach(() => {
    zipMock.mockReset();
  });

  it('passes a well-formed FeatureCollection plus an options object to shp-write', async () => {
    const fakeBlob = new Blob(['zip-bytes'], { type: 'application/zip' });
    zipMock.mockResolvedValueOnce(fakeBlob);

    const result = await shapefileConverter(
      [pointFeature('a', 10, 20), pointFeature('b', 30, 40)],
      'my_layer',
    );

    expect(zipMock).toHaveBeenCalledTimes(1);
    const [fc, options] = zipMock.mock.calls[0] as [
      { type: string; features: unknown[] },
      { outputType: string; types: Record<string, string> },
    ];
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);

    // The bug we fixed: v0.3 of shp-write indexed into options.types
    // unconditionally and threw when no options were provided. Always pass one.
    expect(options).toBeDefined();
    expect(options.outputType).toBe('blob');
    expect(options.types.point).toBe('my_layer');
    expect(options.types.polygon).toBe('my_layer');
    expect(options.types.line).toBe('my_layer');
    expect(options.types.multipolygon).toBe('my_layer');
    expect(options.types.multiline).toBe('my_layer');
    // shp-write keys line filenames off `polyline` (lower-cased shapefile type),
    // not `line`; without this entry lines export as POLYLINE.shp.
    expect(options.types.polyline).toBe('my_layer');

    expect(result.filename).toBe('my_layer.zip');
    expect(result.blob).toBe(fakeBlob);
  });

  it('also works with polygon features', async () => {
    zipMock.mockResolvedValueOnce(new Blob(['zip']));

    const result = await shapefileConverter([polygonFeature('p1')], 'polys');

    expect(zipMock).toHaveBeenCalledTimes(1);
    expect(result.filename).toBe('polys.zip');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('wraps a non-Blob zip result (e.g. Uint8Array) in a Blob', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]); // PK\x03\x04 zip signature
    zipMock.mockResolvedValueOnce(bytes);

    const result = await shapefileConverter([pointFeature('a', 0, 0)], 'layer');

    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.filename).toBe('layer.zip');
  });

  it('rejects an empty feature collection with a clear error', async () => {
    await expect(shapefileConverter([], 'empty')).rejects.toThrow(
      /empty feature collection/i,
    );
    expect(zipMock).not.toHaveBeenCalled();
  });

  it('rejects features that all lack geometry with a clear error', async () => {
    await expect(
      shapefileConverter([featureWithoutGeometry('x')], 'nogeo'),
    ).rejects.toThrow(/without geometry/i);
    expect(zipMock).not.toHaveBeenCalled();
  });

  it('propagates errors from the underlying shp-write call', async () => {
    zipMock.mockRejectedValueOnce(new Error('boom'));
    await expect(
      shapefileConverter([pointFeature('a', 0, 0)], 'x'),
    ).rejects.toThrow('boom');
  });
});

describe('sanity: other converters still work', () => {
  it('geojsonConverter produces a GeoJSON blob', async () => {
    const result = await geojsonConverter([pointFeature('a', 1, 2)], 'c');
    expect(result.filename).toBe('c.geojson');
    expect(result.blob.type).toBe('application/geo+json');
  });

  it('csvConverter produces a CSV blob', async () => {
    const result = await csvConverter([pointFeature('a', 1, 2)], 'c');
    expect(result.filename).toBe('c.csv');
    expect(result.blob.type).toContain('text/csv');
  });
});

describe('kmlConverter', () => {
  it('produces a KML blob with the expected mime/filename', async () => {
    const result = await kmlConverter([pointFeature('a', 1, 2)], 'cities');
    expect(result.filename).toBe('cities.kml');
    expect(result.blob.type).toBe('application/vnd.google-earth.kml+xml');
    expect(result.blob.size).toBeGreaterThan(0);
  });
});

describe('flatgeobufConverter', () => {
  it('produces a FGB blob with the expected mime/filename', async () => {
    const result = await flatgeobufConverter([pointFeature('a', 1, 2)], 'parcels');
    expect(result.filename).toBe('parcels.fgb');
    expect(result.blob.type).toBe('application/flatgeobuf');
    expect(result.blob.size).toBeGreaterThan(0);
  });
});

describe('geopackageConverter', () => {
  it('produces a GPKG blob and threads the collection id into the table', async () => {
    gpkgCreateFeatureTable.mockClear();
    gpkgAddFeatures.mockClear();
    gpkgExport.mockClear();
    gpkgClose.mockClear();
    setSqljsWasmLocateFile.mockClear();

    const features = [
      pointFeature('a', 1, 2),
      { ...pointFeature('b', 3, 4), properties: { id: 'b', extra: 'x' } },
    ];

    const result = await geopackageConverter(features, 'mylayer');

    expect(setSqljsWasmLocateFile).toHaveBeenCalledTimes(1);
    expect(gpkgCreateFeatureTable).toHaveBeenCalledTimes(1);
    const [tableName, props] = gpkgCreateFeatureTable.mock.calls[0];
    expect(tableName).toBe('mylayer');
    // Property union across features (id, name, extra) — order may vary; just check membership.
    const names = (props as Array<{ name: string; dataType: string }>).map((p) => p.name).sort();
    expect(names).toEqual(['extra', 'id', 'name']);
    expect(gpkgAddFeatures).toHaveBeenCalledTimes(1);
    expect(gpkgExport).toHaveBeenCalledTimes(1);
    expect(gpkgClose).toHaveBeenCalledTimes(1);
    expect(result.filename).toBe('mylayer.gpkg');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe('application/geopackage+sqlite3');
  });

  it('drops null-geometry features (matches kml/shp/fgb)', async () => {
    gpkgCreateFeatureTable.mockClear();
    gpkgAddFeatures.mockClear();
    gpkgExport.mockClear();
    gpkgClose.mockClear();

    // 5 features, 2 with null geometry. @ngageoint/geopackage would otherwise
    // write the nulls as empty point geometries, forcing the table to MULTIPOINT
    // and round-tripping as 5 features instead of 3.
    const features = [
      pointFeature('a', 1, 2),
      featureWithoutGeometry('b'),
      pointFeature('c', 3, 4),
      featureWithoutGeometry('d'),
      pointFeature('e', 5, 6),
    ];

    await geopackageConverter(features, 'towns');

    expect(gpkgAddFeatures).toHaveBeenCalledTimes(1);
    const [written] = gpkgAddFeatures.mock.calls[0] as [
      Array<{ geometry: unknown }>,
      string,
    ];
    expect(written).toHaveLength(3);
    expect(written.every((f) => f.geometry != null)).toBe(true);
  });
});

describe('exportConverters registry', () => {
  it('exposes every format under its key', () => {
    expect(exportConverters.csv).toBe(csvConverter);
    expect(exportConverters.geojson).toBe(geojsonConverter);
    expect(exportConverters.kml).toBe(kmlConverter);
    expect(exportConverters.shapefile).toBe(shapefileConverter);
    expect(exportConverters.flatgeobuf).toBe(flatgeobufConverter);
    expect(exportConverters.geopackage).toBe(geopackageConverter);
  });
});

