import type { SearchField } from '../types';
export { useOgcCollections, type UseOgcCollectionsResult } from './useOgcCollections';
export { useOgcFeatures, type UseOgcFeaturesResult } from './useOgcFeatures';
export { useCsvExport, type UseCsvExportOptions, type UseCsvExportResult } from './useCsvExport';
export { useOgcQueryables, type UseOgcQueryablesResult } from './useOgcQueryables';
export { useOgcCollectionDetail, type UseOgcCollectionDetailResult } from './useOgcCollectionDetail';

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
  TextSearchField,
  NumberSearchField,
  DatetimeSearchField,
  SelectSearchField,
  PropertyDisplay,
  PropertyDisplayConfig,
} from '../types';
export { resolvePropertyDisplay } from '../utils/propertyDisplay';
export type SearchFieldType = SearchField['type'];
export {
  fetchCollections,
  fetchFeatures,
  fetchQueryables,
  fetchCollectionDetail,
  fetchConformance,
  fetchTileJson,
  fetchFeatureCount,
  fetchDistinctValues,
  getFilteredVectorTileUrl,
  getCql2FilteredVectorTileUrl,
  getTileJsonUrl,
  getVectorTileUrl,
  type OgcCollection,
  type OgcCollectionsResponse,
  type GeoJsonFeature,
  type OgcFeatureCollection,
  type OgcQueryables,
  type OgcConformance,
  type TileJson,
  type QueryableProperty,
  type FetchFeaturesOptions,
} from '../utils/ogcApi';
export {
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  between,
  like,
  inList,
  isNull,
  and,
  or,
  not,
  tAfter,
  tBefore,
  tDuring,
  fromSimpleFilters,
  fromStructuredFilters,
  serializeCql2,
  type CQL2Expression,
  type CQL2PropertyRef,
  type CQL2Date,
  type CQL2Timestamp,
  type CQL2Interval,
} from '../utils/cql2';
