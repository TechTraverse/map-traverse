import { describe, it, expect } from 'vitest';
import { buildSourceOptionGroups } from '../buildSourceOptionGroups';
import type { OgcApiSource } from '../../../types';

const src = (id: string, label?: string): OgcApiSource => ({
  id,
  url: `http://example/${id}`,
  label,
  tileMatrixSetId: 'WebMercatorQuad',
});

const sources = [src('tipg-local', 'My Data'), src('remote-a', 'County GIS'), src('remote-b', 'State Portal')];

describe('buildSourceOptionGroups', () => {
  it('returns a single ungrouped bucket when no groups are given', () => {
    const out = buildSourceOptionGroups(sources);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBeNull();
    expect(out[0].sources).toHaveLength(3);
  });

  it('arranges sources into named groups in order', () => {
    const out = buildSourceOptionGroups(sources, [
      { id: 'my-data', label: 'My Data', sourceIds: ['tipg-local'] },
      { id: 'external', label: 'External Sources', sourceIds: ['remote-a', 'remote-b'] },
    ]);
    expect(out.map(g => g.label)).toEqual(['My Data', 'External Sources']);
    expect(out[0].sources.map(s => s.id)).toEqual(['tipg-local']);
    expect(out[1].sources.map(s => s.id)).toEqual(['remote-a', 'remote-b']);
  });

  it('collects sources not in any group into a trailing Other bucket', () => {
    const out = buildSourceOptionGroups(sources, [
      { id: 'my-data', label: 'My Data', sourceIds: ['tipg-local'] },
    ]);
    expect(out.map(g => g.label)).toEqual(['My Data', 'Other']);
    expect(out[1].sources.map(s => s.id)).toEqual(['remote-a', 'remote-b']);
  });

  it('omits empty groups and never duplicates a source', () => {
    const out = buildSourceOptionGroups(sources, [
      { id: 'empty', label: 'Empty', sourceIds: ['does-not-exist'] },
      { id: 'my-data', label: 'My Data', sourceIds: ['tipg-local', 'tipg-local'] },
      { id: 'external', label: 'External Sources', sourceIds: ['remote-a', 'remote-b'] },
    ]);
    expect(out.map(g => g.label)).toEqual(['My Data', 'External Sources']);
    expect(out[0].sources).toHaveLength(1);
  });
});
