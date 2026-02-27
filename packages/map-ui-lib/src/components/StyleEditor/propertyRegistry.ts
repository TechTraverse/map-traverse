import type { PropertyDefinition } from './propertyMetadata';

// --- Fill ---

const fillProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'fill-color', label: 'Fill Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'fill-opacity', label: 'Fill Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'fill-outline-color', label: 'Outline Color', widget: 'color', group: 'Appearance', category: 'paint', enableDefault: '#000000' },
  { key: 'fill-antialias', label: 'Antialias', widget: 'boolean', group: 'Appearance', category: 'paint', enableDefault: true },
  { key: 'fill-pattern', label: 'Pattern', widget: 'text', group: 'Appearance', category: 'paint', enableDefault: '' },
  // Transform (paint)
  { key: 'fill-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'fill-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Sorting (layout)
  { key: 'fill-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0 },
];

// --- Line ---

const lineProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'line-color', label: 'Line Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'line-width', label: 'Line Width', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.5 },
  { key: 'line-opacity', label: 'Line Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'line-blur', label: 'Blur', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'line-dasharray', label: 'Dash Array', widget: 'dasharray', group: 'Appearance', category: 'paint', enableDefault: [2, 4] },
  { key: 'line-pattern', label: 'Pattern', widget: 'text', group: 'Appearance', category: 'paint', enableDefault: '' },
  // Stroke (paint)
  { key: 'line-gap-width', label: 'Gap Width', widget: 'number', group: 'Stroke', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'line-offset', label: 'Offset', widget: 'number', group: 'Stroke', category: 'paint', step: 0.5, enableDefault: 0 },
  // Transform (paint)
  { key: 'line-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'line-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Cap & Join (layout)
  { key: 'line-cap', label: 'Line Cap', widget: 'enum', group: 'Cap & Join', category: 'layout', options: ['butt', 'round', 'square'], enableDefault: 'butt' },
  { key: 'line-join', label: 'Line Join', widget: 'enum', group: 'Cap & Join', category: 'layout', options: ['bevel', 'round', 'miter'], enableDefault: 'miter' },
  { key: 'line-miter-limit', label: 'Miter Limit', widget: 'number', group: 'Cap & Join', category: 'layout', step: 0.5, enableDefault: 2 },
  { key: 'line-round-limit', label: 'Round Limit', widget: 'number', group: 'Cap & Join', category: 'layout', step: 0.1, enableDefault: 1.05 },
  // Sorting (layout)
  { key: 'line-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0 },
];

// --- Circle ---

const circleProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'circle-color', label: 'Circle Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'circle-radius', label: 'Radius', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 1 },
  { key: 'circle-opacity', label: 'Circle Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'circle-blur', label: 'Blur', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.1, enableDefault: 0 },
  // Stroke (paint)
  { key: 'circle-stroke-color', label: 'Stroke Color', widget: 'color', group: 'Stroke', category: 'paint', enableDefault: '#000000' },
  { key: 'circle-stroke-width', label: 'Stroke Width', widget: 'number', group: 'Stroke', category: 'paint', min: 0, step: 1, enableDefault: 1 },
  { key: 'circle-stroke-opacity', label: 'Stroke Opacity', widget: 'opacity', group: 'Stroke', category: 'paint', enableDefault: 1 },
  // Transform (paint)
  { key: 'circle-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'circle-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Alignment (paint)
  { key: 'circle-pitch-scale', label: 'Pitch Scale', widget: 'enum', group: 'Alignment', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  { key: 'circle-pitch-alignment', label: 'Pitch Alignment', widget: 'enum', group: 'Alignment', category: 'paint', options: ['map', 'viewport'], enableDefault: 'viewport' },
  // Sorting (layout)
  { key: 'circle-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0 },
];

// --- Symbol ---

const symbolProperties: PropertyDefinition[] = [
  // Icon Appearance (paint)
  { key: 'icon-color', label: 'Icon Color', widget: 'color', group: 'Icon Appearance', category: 'paint', enableDefault: '#000000' },
  { key: 'icon-opacity', label: 'Icon Opacity', widget: 'opacity', group: 'Icon Appearance', category: 'paint', enableDefault: 1 },
  { key: 'icon-halo-color', label: 'Icon Halo Color', widget: 'color', group: 'Icon Appearance', category: 'paint', enableDefault: 'transparent' },
  { key: 'icon-halo-width', label: 'Icon Halo Width', widget: 'number', group: 'Icon Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'icon-halo-blur', label: 'Icon Halo Blur', widget: 'number', group: 'Icon Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  // Icon Transform (paint)
  { key: 'icon-translate', label: 'Icon Translate (X, Y)', widget: 'translate', group: 'Icon Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'icon-translate-anchor', label: 'Icon Translate Anchor', widget: 'enum', group: 'Icon Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Text Appearance (paint)
  { key: 'text-color', label: 'Text Color', widget: 'color', group: 'Text Appearance', category: 'paint', enableDefault: '#000000' },
  { key: 'text-opacity', label: 'Text Opacity', widget: 'opacity', group: 'Text Appearance', category: 'paint', enableDefault: 1 },
  { key: 'text-halo-color', label: 'Text Halo Color', widget: 'color', group: 'Text Appearance', category: 'paint', enableDefault: 'transparent' },
  { key: 'text-halo-width', label: 'Text Halo Width', widget: 'number', group: 'Text Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'text-halo-blur', label: 'Text Halo Blur', widget: 'number', group: 'Text Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  // Text Transform (paint)
  { key: 'text-translate', label: 'Text Translate (X, Y)', widget: 'translate', group: 'Text Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'text-translate-anchor', label: 'Text Translate Anchor', widget: 'enum', group: 'Text Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Icon Layout (layout)
  { key: 'icon-image', label: 'Icon Image', widget: 'text', group: 'Icon Layout', category: 'layout', enableDefault: '' },
  { key: 'icon-size', label: 'Icon Size', widget: 'number', group: 'Icon Layout', category: 'layout', min: 0, step: 0.1, enableDefault: 1 },
  { key: 'icon-rotate', label: 'Icon Rotate', widget: 'number', group: 'Icon Layout', category: 'layout', step: 1, enableDefault: 0 },
  { key: 'icon-padding', label: 'Icon Padding', widget: 'number', group: 'Icon Layout', category: 'layout', min: 0, step: 1, enableDefault: 2 },
  { key: 'icon-anchor', label: 'Icon Anchor', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], enableDefault: 'center' },
  { key: 'icon-allow-overlap', label: 'Icon Allow Overlap', widget: 'boolean', group: 'Icon Layout', category: 'layout', enableDefault: false },
  { key: 'icon-optional', label: 'Icon Optional', widget: 'boolean', group: 'Icon Layout', category: 'layout', enableDefault: false },
  { key: 'icon-rotation-alignment', label: 'Icon Rotation Alignment', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['map', 'viewport', 'auto'], enableDefault: 'auto' },
  { key: 'icon-text-fit', label: 'Icon Text Fit', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['none', 'width', 'height', 'both'], enableDefault: 'none' },
  { key: 'icon-offset', label: 'Icon Offset (X, Y)', widget: 'translate', group: 'Icon Layout', category: 'layout', enableDefault: [0, 0] },
  // Text Layout (layout)
  { key: 'text-field', label: 'Text Field', widget: 'text', group: 'Text Layout', category: 'layout', enableDefault: '{name}' },
  { key: 'text-size', label: 'Text Size', widget: 'number', group: 'Text Layout', category: 'layout', min: 0, step: 1, enableDefault: 16 },
  { key: 'text-font', label: 'Text Font (comma-separated)', widget: 'stringArray', group: 'Text Layout', category: 'layout', enableDefault: ['Open Sans Regular'] },
  { key: 'text-max-width', label: 'Text Max Width', widget: 'number', group: 'Text Layout', category: 'layout', min: 0, step: 1, enableDefault: 10 },
  { key: 'text-letter-spacing', label: 'Letter Spacing', widget: 'number', group: 'Text Layout', category: 'layout', step: 0.05, enableDefault: 0 },
  { key: 'text-justify', label: 'Text Justify', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['auto', 'left', 'center', 'right'], enableDefault: 'center' },
  { key: 'text-anchor', label: 'Text Anchor', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], enableDefault: 'center' },
  { key: 'text-transform', label: 'Text Transform', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['none', 'uppercase', 'lowercase'], enableDefault: 'none' },
  { key: 'text-offset', label: 'Text Offset (X, Y)', widget: 'translate', group: 'Text Layout', category: 'layout', enableDefault: [0, 0] },
  { key: 'text-allow-overlap', label: 'Text Allow Overlap', widget: 'boolean', group: 'Text Layout', category: 'layout', enableDefault: false },
  { key: 'text-optional', label: 'Text Optional', widget: 'boolean', group: 'Text Layout', category: 'layout', enableDefault: false },
  { key: 'text-rotation-alignment', label: 'Text Rotation Alignment', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['map', 'viewport', 'viewport-glyph', 'auto'], enableDefault: 'auto' },
  // Placement (layout)
  { key: 'symbol-placement', label: 'Symbol Placement', widget: 'enum', group: 'Placement', category: 'layout', options: ['point', 'line', 'line-center'], enableDefault: 'point' },
  { key: 'symbol-spacing', label: 'Symbol Spacing', widget: 'number', group: 'Placement', category: 'layout', min: 1, step: 1, enableDefault: 250 },
  { key: 'symbol-avoid-edges', label: 'Avoid Edges', widget: 'boolean', group: 'Placement', category: 'layout', enableDefault: false },
  { key: 'symbol-sort-key', label: 'Sort Key', widget: 'number', group: 'Placement', category: 'layout', step: 1, enableDefault: 0 },
  { key: 'symbol-z-order', label: 'Z-Order', widget: 'enum', group: 'Placement', category: 'layout', options: ['auto', 'viewport-y', 'source'], enableDefault: 'auto' },
];

const registry: Record<string, PropertyDefinition[]> = {
  fill: fillProperties,
  line: lineProperties,
  circle: circleProperties,
  symbol: symbolProperties,
};

export function getPropertyRegistry(type: string): PropertyDefinition[] {
  return registry[type] ?? [];
}

export function groupProperties(
  defs: PropertyDefinition[],
): Record<string, PropertyDefinition[]> {
  const groups: Record<string, PropertyDefinition[]> = {};
  for (const def of defs) {
    if (!groups[def.group]) groups[def.group] = [];
    groups[def.group].push(def);
  }
  return groups;
}
