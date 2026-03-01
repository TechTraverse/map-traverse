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
}
