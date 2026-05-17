import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Legend } from '../Legend';
import type { LayerConfig } from '../../../types';

function makeLayer(id: string, shape: 'square' | 'circle' | 'line' | 'outline-square' | 'outline-circle', extra: Record<string, unknown> = {}): LayerConfig {
  return {
    id,
    sourceId: 'demo',
    collection: 'demo',
    label: id,
    visible: true,
    dataMode: 'vector-tiles',
    legend: {
      entries: [
        {
          label: id,
          color: '#1d4ed8',
          shape,
          ...extra,
        },
      ],
    },
  } as LayerConfig;
}

describe('Legend Swatch', () => {
  it('renders outline-square as SVG <rect> with no fill', () => {
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('a', 'outline-square', { outlineColor: '#1d4ed8', outlineWidth: 2 })]}
        visibleLayerIds={['a']}
      />,
    );
    expect(html).toContain('<rect');
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="#1d4ed8"');
    expect(html).toContain('stroke-width="2"');
  });

  it('renders outline-circle as SVG <circle> with no fill', () => {
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('b', 'outline-circle', { outlineColor: '#dc2626', outlineWidth: 1.5 })]}
        visibleLayerIds={['b']}
      />,
    );
    expect(html).toMatch(/<circle\b/);
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="#dc2626"');
  });

  it('honors dasharray on outline-square (dashed border)', () => {
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('c', 'outline-square', { dasharray: [3, 2] })]}
        visibleLayerIds={['c']}
      />,
    );
    expect(html).toContain('<rect');
    expect(html).toContain('stroke-dasharray="3,2"');
  });

  it('honors dasharray on outline-circle (dashed border)', () => {
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('d', 'outline-circle', { dasharray: [2, 2] })]}
        visibleLayerIds={['d']}
      />,
    );
    expect(html).toMatch(/<circle\b/);
    expect(html).toContain('stroke-dasharray="2,2"');
  });

  it('omits stroke-dasharray when no dasharray (or only one element) is provided', () => {
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('e', 'outline-square')]}
        visibleLayerIds={['e']}
      />,
    );
    expect(html).not.toContain('stroke-dasharray');
  });

  it('does not apply rounded-sm corner radius to outline-square (sharp corners)', () => {
    // Outline shapes render as SVG <rect> without any rx/ry — sharp 90° corners
    // are how outline-square stays visually distinct from outline-circle.
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('f', 'outline-square')]}
        visibleLayerIds={['f']}
      />,
    );
    // The <rect> element itself should carry no rx attribute.
    const rectMatch = html.match(/<rect[^>]*\/?>/);
    expect(rectMatch).not.toBeNull();
    expect(rectMatch![0]).not.toContain('rx=');
    expect(rectMatch![0]).not.toContain('rounded-sm');
  });

  it('renders the plain `line` shape with dasharray as SVG <line>', () => {
    // Pre-existing behavior — this test guards against regressing the line shape
    // while reworking outline shapes.
    const html = renderToStaticMarkup(
      <Legend
        layers={[makeLayer('g', 'line', { dasharray: [4, 2] })]}
        visibleLayerIds={['g']}
      />,
    );
    expect(html).toMatch(/<line\b/);
    expect(html).toContain('stroke-dasharray="4,2"');
  });
});
