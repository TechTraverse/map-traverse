import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  csvConverter,
  geojsonConverter,
  kmlConverter,
  shapefileConverter,
  flatgeobufConverter,
} from './exportConverters';
import type { GeoJsonFeature } from './ogcApi';

function point(id: number): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [-106 + id * 0.01, 38 + id * 0.01] },
    properties: { name: `town-${id}`, id },
  };
}

function line(id: number): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-106 + id * 0.1, 38],
        [-105 + id * 0.1, 39],
        [-104 + id * 0.1, 38.5],
      ],
    },
    properties: { name: `road-${id}`, id },
  };
}

function nullGeom(id: number): GeoJsonFeature {
  return {
    type: 'Feature',
    id,
    // Real-world tipg rows frequently carry null geometry (e.g. gunnison.towns
    // had 23/45 null geoms). Typed as the non-null shape, so cast through.
    geometry: null as unknown as GeoJsonFeature['geometry'],
    properties: { name: `ghost-${id}`, id },
  };
}

/** A mixed collection: 3 real points interleaved with 2 null-geometry rows. */
function mixedPoints(): GeoJsonFeature[] {
  return [point(0), nullGeom(1), point(2), nullGeom(3), point(4)];
}

async function unzip(blob: Blob): Promise<JSZip> {
  const buf = await blob.arrayBuffer();
  return JSZip.loadAsync(buf);
}

/** DBF record count lives at byte offset 4 (little-endian uint32). */
function dbfRecordCount(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
}

describe('exportConverters — null-geometry handling (BUG A)', () => {
  const mixed = mixedPoints(); // 5 total, 3 with geometry

  it('csvConverter keeps every row (null geometry tolerated)', () => {
    const { blob } = csvConverter(mixed, 'towns');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('geojsonConverter keeps every row including null geometry', async () => {
    const { blob } = geojsonConverter(mixed, 'towns');
    const text = await blob.text();
    const fc = JSON.parse(text);
    expect(fc.features).toHaveLength(5);
    expect(fc.features.filter((f: { geometry: unknown }) => f.geometry === null)).toHaveLength(2);
  });

  it('kmlConverter does not throw and emits only non-null placemarks', async () => {
    const { blob } = await kmlConverter(mixed, 'towns');
    const text = await blob.text();
    const placemarks = text.match(/<Placemark>/g) ?? [];
    expect(placemarks).toHaveLength(3);
  });

  it('shapefileConverter does not throw and writes only non-null features', async () => {
    const { blob } = await shapefileConverter(mixed, 'towns');
    const zip = await unzip(blob);
    const dbf = await zip.file('towns.dbf')!.async('uint8array');
    expect(dbfRecordCount(dbf)).toBe(3);
    const shx = await zip.file('towns.shx')!.async('uint8array');
    // 100-byte header + 8 bytes per index record.
    expect(shx.length).toBe(100 + 8 * 3);
  });

  it('flatgeobufConverter does not throw and writes only non-null features', async () => {
    const { blob } = await flatgeobufConverter(mixed, 'towns');
    const { deserialize } = await import('flatgeobuf/lib/mjs/geojson.js');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = deserialize(bytes) as any;
    expect(fc.features).toHaveLength(3);
  });

  it('shapefileConverter throws when every feature lacks geometry', async () => {
    const allNull = [nullGeom(0), nullGeom(1)];
    await expect(shapefileConverter(allNull, 'empty')).rejects.toThrow(/without geometry/i);
  });
});

describe('shapefileConverter — .shx record count (BUG B)', () => {
  it('writes one .shx index record per point feature', async () => {
    const n = 7;
    const features = Array.from({ length: n }, (_, i) => point(i));
    const zip = await unzip((await shapefileConverter(features, 'pts')).blob);
    const shx = await zip.file('pts.shx')!.async('uint8array');
    const dbf = await zip.file('pts.dbf')!.async('uint8array');
    expect(shx.length).toBe(100 + 8 * n);
    expect((shx.length - 100) / 8).toBe(n);
    expect(dbfRecordCount(dbf)).toBe(n);
  });

  it('writes one .shx index record per LINE feature (regression: was 1 for N)', async () => {
    // Pre-fix, @mapbox/shp-write collapsed all polylines into a single
    // multi-part record (.shx = 108 bytes / 1 record) while the .dbf held N
    // rows, triggering GDAL "Inconsistent record number in .shx (1) and .dbf (N)".
    const n = 6;
    const features = Array.from({ length: n }, (_, i) => line(i));
    const zip = await unzip((await shapefileConverter(features, 'roads')).blob);
    // Filename must be the collection id, not the fallback "POLYLINE".
    const shx = await zip.file('roads.shx')!.async('uint8array');
    const dbf = await zip.file('roads.dbf')!.async('uint8array');
    expect(shx.length).toBe(100 + 8 * n);
    expect((shx.length - 100) / 8).toBe(n);
    expect(dbfRecordCount(dbf)).toBe(n);
  });
});

describe('flatgeobufConverter — CRS metadata (BUG C)', () => {
  it('embeds EPSG:4326 in the FGB header', async () => {
    const features = [point(0), point(1)];
    const { blob } = await flatgeobufConverter(features, 'towns');
    const { deserialize } = await import('flatgeobuf/lib/mjs/geojson.js');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let crsCode: number | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deserialize(bytes, undefined, (header: any) => {
      crsCode = header?.crs?.code;
    });
    expect(crsCode).toBe(4326);
  });
});
