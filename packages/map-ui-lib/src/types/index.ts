import type { z } from 'zod';
import {
  ViewConfigSchema,
  OgcApiSourceSchema,
  FillPaintSchema,
  LinePaintSchema,
  CirclePaintSchema,
  FillStyleSchema,
  LineStyleSchema,
  CircleStyleSchema,
  StyleConfigSchema,
  LegendEntrySchema,
  LegendConfigSchema,
  TextSearchFieldSchema,
  NumberSearchFieldSchema,
  DatetimeSearchFieldSchema,
  SelectSearchFieldSchema,
  SearchFieldSchema,
  SearchConfigSchema,
  FilterConfigSchema,
  PropertyDisplaySchema,
  PropertyDisplayConfigSchema,
  LayerConfigSchema,
  BasemapConfigSchema,
  UIConfigSchema,
  MapConfigSchema,
} from '../schemas/config';

// Inferred types from Zod schemas
// Inferred types from Zod schemas
export type ViewConfig = z.infer<typeof ViewConfigSchema>;
export type OgcApiSource = z.infer<typeof OgcApiSourceSchema>;

export type FillPaint = z.infer<typeof FillPaintSchema>;
export type LinePaint = z.infer<typeof LinePaintSchema>;
export type CirclePaint = z.infer<typeof CirclePaintSchema>;

export type FillStyle = z.infer<typeof FillStyleSchema>;
export type LineStyle = z.infer<typeof LineStyleSchema>;
export type CircleStyle = z.infer<typeof CircleStyleSchema>;
export type StyleConfig = z.infer<typeof StyleConfigSchema>;

export type LegendEntry = z.infer<typeof LegendEntrySchema>;
export type LegendConfig = z.infer<typeof LegendConfigSchema>;

export type TextSearchField = z.infer<typeof TextSearchFieldSchema>;
export type NumberSearchField = z.infer<typeof NumberSearchFieldSchema>;
export type DatetimeSearchField = z.infer<typeof DatetimeSearchFieldSchema>;
export type SelectSearchField = z.infer<typeof SelectSearchFieldSchema>;
export type SearchField = z.infer<typeof SearchFieldSchema>;
export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export type SearchFilterValue =
  | string
  | number
  | { start: string; end: string }
  | { value: number; operator: string }
  | { min: number; max: number }
  | undefined;

export type SearchFilterValues = Record<string, SearchFilterValue>;

export type FilterConfig = z.infer<typeof FilterConfigSchema>;
export type PropertyDisplay = z.infer<typeof PropertyDisplaySchema>;
export type PropertyDisplayConfig = z.infer<typeof PropertyDisplayConfigSchema>;
export type PropertyDisplayConfigInput = z.input<typeof PropertyDisplayConfigSchema>;
export type LayerConfig = z.infer<typeof LayerConfigSchema>;
export type BasemapConfig = z.infer<typeof BasemapConfigSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type MapConfig = z.infer<typeof MapConfigSchema>;

/** A queryable property from OGC API metadata, used to drive editor dropdowns. */
export interface AvailableProperty {
  name: string;
  title?: string;
  type?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

// Re-export schemas for convenience
export {
  ViewConfigSchema,
  OgcApiSourceSchema,
  FillPaintSchema,
  LinePaintSchema,
  CirclePaintSchema,
  FillStyleSchema,
  LineStyleSchema,
  CircleStyleSchema,
  StyleConfigSchema,
  LegendEntrySchema,
  LegendConfigSchema,
  TextSearchFieldSchema,
  NumberSearchFieldSchema,
  DatetimeSearchFieldSchema,
  SelectSearchFieldSchema,
  SearchFieldSchema,
  SearchConfigSchema,
  FilterConfigSchema,
  PropertyDisplaySchema,
  PropertyDisplayConfigSchema,
  LayerConfigSchema,
  BasemapConfigSchema,
  UIConfigSchema,
  MapConfigSchema,
};
