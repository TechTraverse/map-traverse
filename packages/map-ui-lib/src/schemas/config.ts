import { z } from 'zod';

// --- View Configuration ---

export const ViewConfigSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zoom: z.number().min(0).max(24),
  pitch: z.number().min(0).max(85).default(0),
  bearing: z.number().min(-180).max(180).default(0),
});

// --- OGC API Source ---

export const OgcApiSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  label: z.string().optional(),
  tileMatrixSetId: z.string().optional().default('WebMercatorQuad'),
});

// --- Paint Schemas (MapLibre GL JS conventions) ---

export const FillPaintSchema = z.object({
  'fill-color': z.string().default('#000000'),
  'fill-opacity': z.number().min(0).max(1).default(1),
  'fill-outline-color': z.string().optional(),
});

export const LinePaintSchema = z.object({
  'line-color': z.string().default('#000000'),
  'line-width': z.number().min(0).default(1),
  'line-opacity': z.number().min(0).max(1).default(1),
  'line-dasharray': z.array(z.number()).optional(),
});

export const CirclePaintSchema = z.object({
  'circle-color': z.string().default('#000000'),
  'circle-radius': z.number().min(0).default(5),
  'circle-opacity': z.number().min(0).max(1).default(1),
  'circle-stroke-color': z.string().optional(),
  'circle-stroke-width': z.number().min(0).optional(),
});

// --- Style Config (Discriminated Union) ---

export const FillStyleSchema = z.object({
  type: z.literal('fill'),
  paint: FillPaintSchema,
});

export const LineStyleSchema = z.object({
  type: z.literal('line'),
  paint: LinePaintSchema,
});

export const CircleStyleSchema = z.object({
  type: z.literal('circle'),
  paint: CirclePaintSchema,
});

export const StyleConfigSchema = z.discriminatedUnion('type', [
  FillStyleSchema,
  LineStyleSchema,
  CircleStyleSchema,
]);

// --- Legend Config ---

export const LegendEntrySchema = z.object({
  label: z.string(),
  color: z.string(),
  shape: z.enum(['circle', 'line', 'square']).optional(),
});

export const LegendConfigSchema = z.object({
  entries: z.array(LegendEntrySchema).min(1),
});

// --- Search Config ---

const searchFieldBase = {
  property: z.string().min(1),
  label: z.string(),
  placeholder: z.string().optional(),
};

export const TextSearchFieldSchema = z.object({
  ...searchFieldBase,
  type: z.literal('text'),
  autocomplete: z.boolean().default(false),
  prefetch: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const NumberSearchFieldSchema = z.object({
  ...searchFieldBase,
  type: z.literal('number'),
  inputMode: z.enum(['input', 'slider']).default('input'),
  operator: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'between']).default('eq'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

export const DatetimeSearchFieldSchema = z.object({
  ...searchFieldBase,
  type: z.literal('datetime'),
  range: z.boolean().default(false),
});

export const SelectSearchFieldSchema = z.object({
  ...searchFieldBase,
  type: z.literal('select'),
  options: z.array(z.string()).optional(),
  prefetch: z.boolean().optional(),
});

export const SearchFieldSchema = z.discriminatedUnion('type', [
  TextSearchFieldSchema,
  NumberSearchFieldSchema,
  DatetimeSearchFieldSchema,
  SelectSearchFieldSchema,
]);

export const SearchConfigSchema = z.object({
  fields: z.array(SearchFieldSchema).min(1),
});

// --- Property Display Config ---

export const PropertyDisplaySchema = z.object({
  label: z.string().optional(),
  visible: z.boolean().optional().default(true),
});

export const PropertyDisplayConfigSchema = z.record(z.string(), PropertyDisplaySchema);

// --- Filter Config ---

export const FilterConfigSchema = z.object({
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  datetime: z.string().optional(),
});

// --- Layer Config ---

export const LayerConfigSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  collection: z.string().min(1),
  label: z.string(),
  visible: z.boolean().default(true),
  dataMode: z.enum(['vector-tiles', 'geojson']),
  style: StyleConfigSchema.optional(),
  legend: LegendConfigSchema.optional(),
  filters: FilterConfigSchema.optional(),
  search: SearchConfigSchema.optional(),
  propertyDisplay: PropertyDisplayConfigSchema.optional(),
});

// --- Basemap Config ---

export const BasemapConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
});

// --- UI Config ---

export const UIConfigSchema = z.object({
  showLayerPanel: z.boolean().default(true),
  showLegend: z.boolean().default(true),
  showBasemapSwitcher: z.boolean().default(true),
  showSearchPanel: z.boolean().default(false),
  showCoordinateDisplay: z.boolean().default(true),
  showFeatureDetail: z.boolean().default(true),
  showFeatureTooltip: z.boolean().default(true),
  showExportButton: z.boolean().default(true),
});

// --- Root Map Config ---

export const MapConfigSchema = z.object({
  sources: z.array(OgcApiSourceSchema).min(1),
  layers: z.array(LayerConfigSchema),
  basemaps: z.array(BasemapConfigSchema).min(1),
  ui: UIConfigSchema.default({}),
  initialView: ViewConfigSchema,
});

// --- Validation Utilities ---

/**
 * Validates a map config, throwing a ZodError if invalid.
 */
export function validateMapConfig(config: unknown) {
  return MapConfigSchema.parse(config);
}

/**
 * Validates a map config, returning a safe result object instead of throwing.
 */
export function safeValidateMapConfig(config: unknown) {
  return MapConfigSchema.safeParse(config);
}
