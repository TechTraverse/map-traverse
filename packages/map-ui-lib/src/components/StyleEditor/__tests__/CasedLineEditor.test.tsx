import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CasedLineEditor } from '../CasedLineEditor';
import type { CasedLinePair } from '../../../utils/casedLine';

const pair: CasedLinePair = [
  { type: 'line', paint: { 'line-color': '#1a5276', 'line-width': 6, 'line-opacity': 1 } },
  { type: 'line', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 1 } },
];

describe('CasedLineEditor', () => {
  it('renders inner + outer controls and a preview without crashing', () => {
    const html = renderToStaticMarkup(<CasedLineEditor value={pair} onChange={() => {}} />);
    expect(html).toContain('Inner (road)');
    expect(html).toContain('Outer (casing)');
    expect(html).toContain('Casing edge (per side)');
    expect(html).toContain('Cased line preview');
  });

  it('shows the derived edge width (½ the width difference) in the edge input', () => {
    // outer 6, inner 2 -> edge = 2
    const html = renderToStaticMarkup(<CasedLineEditor value={pair} onChange={() => {}} />);
    expect(html).toContain('value="2"');
  });
});
