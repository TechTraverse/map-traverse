import { describe, it, expect } from 'vitest';
import {
  STYLE_PRESETS,
  getPresetsForGeometries,
  inferActivePresetId,
} from '../stylePresets';
import { StyleConfigSchema } from '../../schemas/config';
import type { StyleConfig } from '../../types';

describe('STYLE_PRESETS', () => {
  it('every preset builds to schema-valid StyleConfig[]', () => {
    for (const p of STYLE_PRESETS) {
      const styles = p.build('#4a90d9');
      expect(styles.length, `${p.id} should produce at least one style`).toBeGreaterThan(0);
      for (const s of styles) {
        const parsed = StyleConfigSchema.safeParse(s);
        expect(parsed.success, `${p.id}: ${parsed.success ? '' : JSON.stringify(parsed.error.format())}`).toBe(true);
      }
    }
  });

  it('every polygon preset includes a fill style (regression: fillless polygons break clicks)', () => {
    const polygonPresets = STYLE_PRESETS.filter((p) => p.geometry === 'polygon');
    expect(polygonPresets.length).toBeGreaterThan(0);
    for (const p of polygonPresets) {
      const styles = p.build('#4a90d9');
      const fills = styles.filter((s) => s.type === 'fill');
      expect(fills.length, `${p.id} must contain a fill style`).toBeGreaterThan(0);
    }
  });

  it('polygon-outline emits a transparent fill so interiors remain clickable', () => {
    const preset = STYLE_PRESETS.find((p) => p.id === 'polygon-outline');
    expect(preset).toBeDefined();
    const styles = preset!.build('#4a90d9');
    const fill = styles.find((s) => s.type === 'fill');
    expect(fill).toBeDefined();
    expect((fill as { paint: Record<string, unknown> }).paint['fill-opacity']).toBe(0);
  });

  it('line-cased emits two stacked line styles', () => {
    const preset = STYLE_PRESETS.find((p) => p.id === 'line-cased');
    const styles = preset!.build('#2980b9');
    expect(styles).toHaveLength(2);
    expect(styles.every((s) => s.type === 'line')).toBe(true);
  });

  it('point-icon produces a symbol style with icon-image', () => {
    const preset = STYLE_PRESETS.find((p) => p.id === 'point-icon');
    const styles = preset!.build('#e74c3c');
    expect(styles).toHaveLength(1);
    expect(styles[0].type).toBe('symbol');
    expect((styles[0] as { layout?: Record<string, unknown> }).layout?.['icon-image']).toBeDefined();
  });
});

describe('getPresetsForGeometries', () => {
  it('returns only presets matching the requested geometry families', () => {
    const polygonOnly = getPresetsForGeometries(['polygon']);
    expect(polygonOnly.every((p) => p.geometry === 'polygon')).toBe(true);

    const mixed = getPresetsForGeometries(['polygon', 'line']);
    const geoms = new Set(mixed.map((p) => p.geometry));
    expect(geoms).toEqual(new Set(['polygon', 'line']));
  });

  it('returns empty for empty geometry list', () => {
    expect(getPresetsForGeometries([])).toEqual([]);
  });
});

describe('inferActivePresetId', () => {
  it('returns null for empty/missing styles', () => {
    expect(inferActivePresetId(undefined)).toBeNull();
    expect(inferActivePresetId(null)).toBeNull();
    expect(inferActivePresetId([])).toBeNull();
  });

  it('round-trips every preset', () => {
    for (const p of STYLE_PRESETS) {
      const styles = p.build('#4a90d9');
      const inferred = inferActivePresetId(styles);
      expect(inferred, `${p.id} should be inferred from its own build()`).toBe(p.id);
    }
  });

  it('distinguishes polygon-outline (opacity 0) from fill+outline (opacity > 0)', () => {
    const outline: StyleConfig[] = [
      { type: 'fill', paint: { 'fill-color': '#abc', 'fill-opacity': 0 } },
      { type: 'line', paint: { 'line-color': '#abc', 'line-width': 1.5, 'line-opacity': 1 } },
    ];
    expect(inferActivePresetId(outline)).toBe('polygon-outline');

    const filled: StyleConfig[] = [
      { type: 'fill', paint: { 'fill-color': '#abc', 'fill-opacity': 0.5 } },
      { type: 'line', paint: { 'line-color': '#abc', 'line-width': 1.5, 'line-opacity': 1 } },
    ];
    expect(inferActivePresetId(filled)).toBe('polygon-fill-outline');
  });

  it('returns null for unrecognised shapes (e.g. fill + line + symbol)', () => {
    const custom: StyleConfig[] = [
      { type: 'fill', paint: { 'fill-color': '#abc', 'fill-opacity': 0.5 } },
      { type: 'line', paint: { 'line-color': '#abc', 'line-width': 1.5, 'line-opacity': 1 } },
      { type: 'symbol', paint: {}, layout: { 'text-field': '{name}' } },
    ];
    expect(inferActivePresetId(custom)).toBeNull();
  });
});
