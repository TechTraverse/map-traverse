import type { FilterRule, FilterRuleGroup } from '../types';
import { isFilterRuleGroup } from './cql2';
import { isSpatialOperator } from '../components/Cql2FilterEditor/operatorOptions';

/**
 * A user-facing parameter extracted from a CQL2 filter template.
 * Used to render input fields in the QueryPanel.
 */
export interface QueryParameter {
  name: string;
  label: string;
  inputType: 'text' | 'number' | 'date' | 'select';
  default?: string | number;
}

/**
 * Walks a FilterRuleGroup tree and extracts all parameterized values
 * that the user needs to fill in at runtime. Deduplicates by name.
 */
export function extractQueryParameters(group: FilterRuleGroup): QueryParameter[] {
  const seen = new Map<string, QueryParameter>();

  function add(param: QueryParameter) {
    if (!seen.has(param.name)) {
      seen.set(param.name, param);
    }
  }

  function extractFromOffset(offset: { kind: string; name?: string; label?: string; default?: number }) {
    if (offset.kind === 'parameter' && offset.name) {
      add({ name: offset.name, label: offset.label ?? offset.name, inputType: 'number', default: offset.default });
    }
  }

  function extractFromRule(rule: FilterRule) {
    const { value, spatial } = rule;

    if (value.kind === 'parameter') {
      add({ name: value.name, label: value.label, inputType: value.inputType, default: value.default });
    } else if (value.kind === 'computedRange') {
      // baseParam is an implicit number parameter
      add({ name: value.baseParam, label: value.baseLabel, inputType: 'number' });
      extractFromOffset(value.offsetAmount);
    } else if (value.kind === 'dateRange') {
      extractFromEndpoint(value.start);
      extractFromEndpoint(value.end);
    } else if (value.kind === 'relativeDate') {
      extractFromOffset(value.offset);
    }

    // Parameterized spatial distance
    if (spatial?.distance && typeof spatial.distance === 'object') {
      const d = spatial.distance as { kind: string; name?: string; label?: string; default?: number };
      if (d.kind === 'parameter' && d.name) {
        add({ name: d.name, label: d.label ?? d.name, inputType: 'number', default: d.default });
      }
    }
  }

  function extractFromEndpoint(endpoint: { kind: string; name?: string; label?: string; default?: string | number; offset?: { kind: string; name?: string; label?: string; default?: number } }) {
    if (endpoint.kind === 'parameter' && endpoint.name) {
      add({ name: endpoint.name, label: endpoint.label ?? endpoint.name, inputType: 'date', default: endpoint.default });
    } else if (endpoint.kind === 'relativeDate' && endpoint.offset) {
      extractFromOffset(endpoint.offset);
    }
  }

  function walk(group: FilterRuleGroup) {
    for (const item of group.rules) {
      if (isFilterRuleGroup(item)) {
        walk(item);
      } else {
        extractFromRule(item);
      }
    }
  }

  walk(group);
  return Array.from(seen.values());
}

/**
 * Returns true if the filter group contains any spatial operators
 * that require a selection geometry at runtime.
 */
export function queryRequiresGeometry(group: FilterRuleGroup): boolean {
  if (group.spatialConstraint) return true;
  for (const item of group.rules) {
    if (isFilterRuleGroup(item)) {
      if (queryRequiresGeometry(item)) return true;
    } else {
      if (isSpatialOperator(item.operator)) {
        return true;
      }
    }
  }
  return false;
}
