import type { GeoJsonFeature } from './ogcApi';
import { featuresToCsv } from './csvExport';

export type FormatConverter = (
  features: GeoJsonFeature[],
  collectionId: string,
) => Promise<{ blob: Blob; filename: string }> | { blob: Blob; filename: string };

function toFeatureCollection(features: GeoJsonFeature[]) {
  return {
    type: 'FeatureCollection' as const,
    features: features.map((f) => ({
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: f.properties ?? {},
    })),
  };
}

/**
 * Drop features whose geometry is null/undefined. The Shapefile, KML, and
 * FlatGeobuf formats cannot represent a feature without geometry — their
 * serializers dereference `geometry.type` and throw on null. (CSV, GeoJSON,
 * and GeoPackage tolerate null geometry, so they keep the full set.)
 */
function withGeometry(features: GeoJsonFeature[]): GeoJsonFeature[] {
  return features.filter((f) => f.geometry != null);
}

export const csvConverter: FormatConverter = (features, collectionId) => {
  const csv = featuresToCsv(features);
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    filename: `${collectionId}.csv`,
  };
};

export const geojsonConverter: FormatConverter = (features, collectionId) => {
  const fc = toFeatureCollection(features);
  return {
    blob: new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }),
    filename: `${collectionId}.geojson`,
  };
};

export const kmlConverter: FormatConverter = async (features, collectionId) => {
  const { toKML } = await import('@tmcw/tokml');
  // toKML dereferences geometry.type and throws on null geometry; skip them.
  const fc = toFeatureCollection(withGeometry(features));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kml = toKML(fc as any);
  return {
    blob: new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }),
    filename: `${collectionId}.kml`,
  };
};

export const shapefileConverter: FormatConverter = async (features, collectionId) => {
  if (features.length === 0) {
    throw new Error('Cannot export an empty feature collection to shapefile');
  }

  const shpwrite = await import('@mapbox/shp-write');
  // @mapbox/shp-write ships named ESM exports and a default CJS object; support both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = shpwrite as any;
  const zip: ((gj: unknown, options?: unknown) => Promise<unknown>) | undefined =
    mod.zip ?? mod.default?.zip;
  if (typeof zip !== 'function') {
    throw new Error(
      'Shapefile export is unavailable: @mapbox/shp-write did not load correctly',
    );
  }

  // A Shapefile cannot represent null geometry, and shp-write silently drops
  // such features (producing a .dbf/.shx record-count mismatch). Filter them
  // out up front; if nothing is left, bail with a useful error instead of
  // downloading an empty/corrupt zip.
  const geometried = withGeometry(features);
  if (geometried.length === 0) {
    throw new Error('Cannot export features without geometry to shapefile');
  }
  const fc = toFeatureCollection(geometried);

  // Always pass an options object: v0.3 of shp-write threw whenever options
  // were omitted because it indexed into `options.types` unconditionally.
  // v0.4 no longer has that bug, but being explicit also lets us request a
  // Blob directly via jszip 3's generateAsync instead of a base64 string.
  //
  // shp-write keys the output filename off the *shapefile* geometry name
  // (lower-cased), so line/multiline features look up `types.polyline`, not
  // `types.line`/`types.multiline`. Without a `polyline` entry the line layer
  // would be written as `POLYLINE.shp` instead of `<collectionId>.shp`.
  const zipResult = await zip(fc, {
    outputType: 'blob',
    compression: 'DEFLATE',
    types: {
      point: collectionId,
      polygon: collectionId,
      polyline: collectionId,
      line: collectionId,
      multipolygon: collectionId,
      multiline: collectionId,
    },
  });

  const blob =
    zipResult instanceof Blob
      ? zipResult
      : new Blob([zipResult as BlobPart], { type: 'application/zip' });

  return {
    blob,
    filename: `${collectionId}.zip`,
  };
};

export const flatgeobufConverter: FormatConverter = async (features, collectionId) => {
  const { serialize } = await import('flatgeobuf/lib/mjs/geojson.js');
  // FlatGeobuf dereferences geometry.type and throws on null geometry; skip them.
  const fc = toFeatureCollection(withGeometry(features));
  // Embed CRS metadata in the FGB header. Exported features are GeoJSON, which
  // is always lon/lat WGS 84 (OGC:CRS84 / EPSG:4326); without this the importer
  // logs "no CRS found — assumed EPSG:4326". The serializer's second arg is the
  // EPSG code written into the header (GDAL reads it back as WGS 84).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uint8 = serialize(fc as any, 4326);
  return {
    blob: new Blob([uint8 as BlobPart], { type: 'application/flatgeobuf' }),
    filename: `${collectionId}.fgb`,
  };
};

export const geopackageConverter: FormatConverter = async (features, collectionId) => {
  const { GeoPackageAPI, setSqljsWasmLocateFile } = await import('@ngageoint/geopackage');
  setSqljsWasmLocateFile((filename: string) => `/${filename}`);
  const geoPackage = await GeoPackageAPI.create();

  const allKeys = [...new Set(features.flatMap((f) => Object.keys(f.properties ?? {})))];
  const properties = allKeys.map((key) => ({ name: key, dataType: 'TEXT' }));

  geoPackage.createFeatureTableFromProperties(collectionId, properties);

  const gjFeatures = toFeatureCollection(features).features;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await geoPackage.addGeoJSONFeaturesToGeoPackage(gjFeatures as any, collectionId);

  const data = await geoPackage.export();
  geoPackage.close();

  return {
    blob: new Blob([data as BlobPart], { type: 'application/geopackage+sqlite3' }),
    filename: `${collectionId}.gpkg`,
  };
};

export const exportConverters: Record<string, FormatConverter> = {
  csv: csvConverter,
  geojson: geojsonConverter,
  kml: kmlConverter,
  shapefile: shapefileConverter,
  flatgeobuf: flatgeobufConverter,
  geopackage: geopackageConverter,
};
