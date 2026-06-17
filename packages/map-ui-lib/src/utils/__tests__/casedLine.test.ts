import { describe, it, expect } from 'vitest';
import {
  getCasedLineParams,
  applyCasedLineParams,
  isPlainCasedLine,
  type CasedLinePair,
} from '../casedLine';
import type { LineStyle } from '../../types';

function line(color: string, width: number, extra: Record<string, unknown> = {}): LineStyle {
  return { type: 'line', paint: { 'line-color': color, 'line-width': width, 'line-opacity': 1, ...extra } } as LineStyle;
}

describe('casedLine helpers', () => {
  it('derives inner/outer params, with edge as half the width difference', () => {
    const pair: CasedLinePair = [line('#111111', 6), line('#ffffff', 2)];
    const params = getCasedLineParams(pair);
    expect(params.innerColor).toBe('#ffffff');
    expect(params.innerWidth).toBe(2);
    expect(params.outerColor).toBe('#111111');
    expect(params.edge).toBe(2); // (6 - 2) / 2
  });

  it('clamps a negative edge to 0 when the casing is not wider than the road', () => {
    const pair: CasedLinePair = [line('#111111', 1), line('#ffffff', 3)];
    expect(getCasedLineParams(pair).edge).toBe(0);
  });

  it('applies params back so outer width = inner + 2 * edge', () => {
    const pair: CasedLinePair = [line('#000000', 4), line('#000000', 2)];
    const [outer, inner] = applyCasedLineParams(pair, {
      innerColor: '#ff0000',
      innerWidth: 3,
      outerColor: '#0000ff',
      edge: 1.5,
    });
    expect(inner.paint['line-color']).toBe('#ff0000');
    expect(inner.paint['line-width']).toBe(3);
    expect(outer.paint['line-color']).toBe('#0000ff');
    expect(outer.paint['line-width']).toBe(6); // 3 + 2 * 1.5
  });

  it('preserves unrelated paint keys when applying params', () => {
    const pair: CasedLinePair = [
      line('#000000', 4, { 'line-opacity': 0.5, 'line-cap': 'round' }),
      line('#000000', 2, { 'line-opacity': 0.8 }),
    ];
    const [outer, inner] = applyCasedLineParams(pair, getCasedLineParams(pair));
    expect(outer.paint['line-opacity']).toBe(0.5);
    expect((outer.paint as Record<string, unknown>)['line-cap']).toBe('round');
    expect(inner.paint['line-opacity']).toBe(0.8);
  });

  it('round-trips get -> apply without changing a plain pair', () => {
    const pair: CasedLinePair = [line('#1a5276', 5), line('#2980b9', 2)];
    const [outer, inner] = applyCasedLineParams(pair, getCasedLineParams(pair));
    expect(outer.paint['line-color']).toBe('#1a5276');
    expect(outer.paint['line-width']).toBe(5);
    expect(inner.paint['line-color']).toBe('#2980b9');
    expect(inner.paint['line-width']).toBe(2);
  });

  describe('isPlainCasedLine', () => {
    it('accepts a pair of plain string-coloured, fixed-width lines', () => {
      expect(isPlainCasedLine([line('#111', 4), line('#fff', 2)])).toBe(true);
    });

    it('rejects expression colours', () => {
      const exprLine = { type: 'line', paint: { 'line-color': ['match', ['get', 'x'], '#fff'], 'line-width': 2 } } as unknown as LineStyle;
      expect(isPlainCasedLine([line('#111', 4), exprLine])).toBe(false);
    });

    it('rejects dashed / patterned lines', () => {
      expect(isPlainCasedLine([line('#111', 4, { 'line-dasharray': [2, 2] }), line('#fff', 2)])).toBe(false);
    });

    it('rejects per-category dashing', () => {
      const dashed = { ...line('#111', 4), dashByCategory: { property: 'kind', cases: [] } } as unknown as LineStyle;
      expect(isPlainCasedLine([dashed, line('#fff', 2)])).toBe(false);
    });
  });
});
