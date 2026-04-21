export type EditorWidget =
  | 'color'
  | 'opacity'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'translate'
  | 'padding'
  | 'dasharray'
  | 'stringArray'
  | 'text'
  | 'icon-image';

export interface PropertyDefinition {
  key: string;
  label: string;
  widget: EditorWidget;
  group: string;
  category: 'paint' | 'layout';
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  /** Value set when the user enables an optional property. undefined means the property is required. */
  enableDefault?: unknown;
  /**
   * If true, the field exposes an fx toggle that lets the user author a data-driven
   * MapLibre expression (match/interpolate) instead of a static value. Today this
   * is honored on `number` and `icon-image` widgets; color fields always allow it.
   */
  dataDriven?: boolean;
}
