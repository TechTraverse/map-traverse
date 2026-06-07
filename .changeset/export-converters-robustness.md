---
'@ogc-maps/storybook-components': patch
---

Harden export converters against real-world data (found via export→import round-trip QA):

- **Null geometry no longer crashes KML / Shapefile / FlatGeobuf exports.** These formats cannot represent a feature without geometry, and their serializers dereferenced `geometry.type` and threw on null. They now skip null-geometry features before serializing (CSV/GeoJSON/GeoPackage keep tolerating nulls). Shapefile still errors when *every* feature lacks geometry.
- **Shapefile `.shx` is no longer corrupt for line layers.** `@mapbox/shp-write` collapsed all polyline features into a single multi-part record (`.shx` had 1 index entry for N features) while the `.dbf` kept N rows, so GDAL rejected the file with "Inconsistent record number in .shx (1) and .dbf (N)". Fixed via a `pnpm` patch to shp-write so each line feature gets its own record, and the line layer now uses the collection id as its filename instead of the `POLYLINE` fallback.
- **FlatGeobuf exports now embed CRS metadata (EPSG:4326).** Previously importers logged "no CRS found — assumed EPSG:4326"; the CRS84/EPSG:4326 code is now written into the FGB header.
