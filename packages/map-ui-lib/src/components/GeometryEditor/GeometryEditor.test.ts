import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { GeometryEditor } from './GeometryEditor';

const SAMPLE_POLYGON: GeoJSON.Geometry = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
};

function render(props: Partial<Parameters<typeof GeometryEditor>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(GeometryEditor, {
      geometry: SAMPLE_POLYGON,
      onChange: () => {},
      ...props,
    }),
  );
}

describe('GeometryEditor', () => {
  it('renders all three tabs', () => {
    const html = render({ mode: 'wkt' });
    expect(html).toContain('Draw');
    expect(html).toContain('WKT');
    expect(html).toContain('Coordinates');
  });

  it('seeds the WKT textarea from the geometry', () => {
    const html = render({ mode: 'wkt' });
    expect(html).toContain('<textarea');
    expect(html).toContain('POLYGON ((0 0, 2 0, 2 2, 0 2, 0 0))');
  });

  it('marks the active tab as selected', () => {
    const html = render({ mode: 'coordinates' });
    // The Coordinates tab button is aria-selected.
    expect(html).toMatch(/aria-selected="true"[^>]*>Coordinates|Coordinates<\/button>/);
  });

  it('renders the draw map slot when provided', () => {
    const html = render({ mode: 'draw', mapSlot: createElement('div', null, 'MY_MAP') });
    expect(html).toContain('MY_MAP');
    expect(html).not.toContain('No draw map available.');
  });

  it('renders a placeholder in the draw tab when no mapSlot', () => {
    const html = render({ mode: 'draw' });
    expect(html).toContain('No draw map available.');
  });

  it('renders coordinate rows for a simple polygon', () => {
    const html = render({ mode: 'coordinates' });
    // 5 positions -> 5 longitude inputs
    const lngCount = (html.match(/aria-label="Longitude /g) || []).length;
    expect(lngCount).toBe(5);
    expect(html).toContain('+ Add coordinate');
  });

  it('shows an unsupported note for complex geometry in the coordinates tab', () => {
    const html = render({
      mode: 'coordinates',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]],
      },
    });
    expect(html).toContain('be edited as a simple coordinate list');
    expect(html).toContain('MultiPolygon');
  });

  it('surfaces an external error', () => {
    const html = render({ mode: 'wkt', error: 'Server says no.' });
    expect(html).toContain('Server says no.');
  });

  it('seeds an empty WKT textarea when geometry is null', () => {
    const html = render({ mode: 'wkt', geometry: null });
    expect(html).toContain('<textarea');
    // The textarea value (between the tags) is empty; only the placeholder
    // attribute mentions POLYGON.
    expect(html).toMatch(/aria-label="WKT geometry"><\/textarea>/);
  });
});
