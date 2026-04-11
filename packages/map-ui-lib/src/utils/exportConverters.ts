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
  const fc = toFeatureCollection(features);
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

  const fc = toFeatureCollection(features);

  // shp-write silently drops features that have no geometry; bail early so the
  // caller sees a useful error instead of downloading an empty zip.
  const hasGeometry = fc.features.some((f) => f.geometry != null);
  if (!hasGeometry) {
    throw new Error('Cannot export features without geometry to shapefile');
  }

  // Always pass an options object: v0.3 of shp-write threw whenever options
  // were omitted because it indexed into `options.types` unconditionally.
  // v0.4 no longer has that bug, but being explicit also lets us request a
  // Blob directly via jszip 3's generateAsync instead of a base64 string.
  const zipResult = await zip(fc, {
    outputType: 'blob',
    compression: 'DEFLATE',
    types: {
      point: collectionId,
      polygon: collectionId,
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
  const fc = toFeatureCollection(features);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uint8 = serialize(fc as any);
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
