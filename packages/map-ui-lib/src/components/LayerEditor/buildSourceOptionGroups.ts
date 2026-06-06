import type { OgcApiSource } from '../../types';

/**
 * A named grouping of sources for the layer editor's source dropdown — e.g.
 * "My Data" (uploaded datasets, backed by the local tipg source) vs "External
 * Sources" (remote OGC APIs). Pure UI metadata: it never changes how a layer is
 * serialized (still `sourceId` + `collection`).
 */
export interface SourceGroup {
  id: string;
  label: string;
  sourceIds: string[];
}

export interface SourceOptionGroup {
  /** `null` renders the options ungrouped (no <optgroup>). */
  label: string | null;
  sources: OgcApiSource[];
}

/**
 * Arrange `sources` into ordered option groups. With no groups provided, returns
 * a single ungrouped bucket (backward-compatible flat list). With groups, emits
 * them in order (only sources actually present), and collects any source not
 * claimed by a group into a trailing "Other" bucket so nothing is ever dropped.
 */
export function buildSourceOptionGroups(
  sources: OgcApiSource[],
  groups?: SourceGroup[],
): SourceOptionGroup[] {
  if (!groups || groups.length === 0) {
    return [{ label: null, sources }];
  }

  const byId = new Map(sources.map(s => [s.id, s]));
  const claimed = new Set<string>();
  const result: SourceOptionGroup[] = [];

  for (const group of groups) {
    const groupSources: OgcApiSource[] = [];
    for (const id of group.sourceIds) {
      const src = byId.get(id);
      if (src && !claimed.has(id)) {
        groupSources.push(src);
        claimed.add(id);
      }
    }
    if (groupSources.length > 0) {
      result.push({ label: group.label, sources: groupSources });
    }
  }

  const leftovers = sources.filter(s => !claimed.has(s.id));
  if (leftovers.length > 0) {
    result.push({ label: 'Other', sources: leftovers });
  }

  return result;
}
