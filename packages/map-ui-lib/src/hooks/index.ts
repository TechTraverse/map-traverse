import type { SearchField } from '../types';
export { useOgcCollections, type UseOgcCollectionsResult } from './useOgcCollections';
export { useOgcFeatures, type UseOgcFeaturesResult } from './useOgcFeatures';

export type {
  OgcApiSource,
  LayerConfig,
  MapConfig,
  UIConfig,
  ViewConfig,
  StyleConfig,
  FilterConfig,
  LegendConfig,
  SearchConfig,
  SearchField,
} from '../types';
export type SearchFieldType = SearchField['type'];
export {
  fetchCollections,
  fetchFeatures,
  fetchQueryables,
  getFilteredVectorTileUrl,
  getTileJsonUrl,
  getVectorTileUrl,
  type OgcCollection,
  type OgcCollectionsResponse,
  type GeoJsonFeature,
  type OgcFeatureCollection,
  type OgcQueryables,
  type QueryableProperty,
  type FetchFeaturesOptions,
} from '../utils/ogcApi';
