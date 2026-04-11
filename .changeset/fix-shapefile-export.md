---
'@ogc-maps/storybook-components': patch
---

Fix shapefile export: migrate from the unmaintained `shp-write@0.3` to `@mapbox/shp-write@0.4` so browser exports actually work. The old version called `options.types` unconditionally (throwing when no options were passed) and only generated base64 strings via JSZip 2. The converter now requests a Blob directly, picks friendlier file names inside the zip, and surfaces clear errors for empty feature collections or features without geometry.
