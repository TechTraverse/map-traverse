---
'@ogc-maps/storybook-components': minor
---

Add map-agnostic data-editing primitives for the "my data" row CRUD feature:

- **`GeometryEditor`** — a fully controlled, framework-agnostic geometry editor with Draw / WKT / Coordinates tabs. The Draw tab renders an app-injected `mapSlot` (the library never imports a map); the WKT tab is a textarea backed by the new parser; the Coordinates tab is a structured `[lng, lat]` list editor for simple Point/LineString/Polygon geometries and steers users to WKT/Draw for complex types.
- **`AttributeForm`** — a controlled attribute editor that renders one input per column, choosing the input type (number / boolean / date / datetime / text) from the column's Postgres data type. Also exports `attributeInputKind`.
- **`wktToGeojsonGeometry`** — reverse of `geojsonGeometryToWkt`. Parses Point, MultiPoint (both member forms), LineString, MultiLineString, Polygon, MultiPolygon and nested GeometryCollection; case-insensitive, whitespace-tolerant, `EMPTY`-aware; returns `null` on any failure (never throws). `wkt.ts` is now exported from the utils barrel.
- **geometry utils** (`isValidGeometry`, `geometryToCoordinateList`, `coordinateListToGeometry`) — pure helpers for structural validation (with lng/lat bounds and closed-ring checks) and converting between simple geometries and flat coordinate lists.
