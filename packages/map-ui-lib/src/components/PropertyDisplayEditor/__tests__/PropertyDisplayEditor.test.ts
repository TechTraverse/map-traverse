import { describe, it, expect } from 'vitest';
import { toEntries, fromEntries } from '../PropertyDisplayEditor';
import type { PropertyDisplayConfig } from '../../../types';

describe('toEntries', () => {
  it('returns empty array for empty config', () => {
    expect(toEntries({})).toEqual([]);
  });

  it('converts record to ordered entries with defaults', () => {
    const config: PropertyDisplayConfig = {
      name: { label: 'Country Name', visible: true },
      internal_id: { visible: false },
    };
    expect(toEntries(config)).toEqual([
      { key: 'name', label: 'Country Name', visible: true },
      { key: 'internal_id', label: '', visible: false },
    ]);
  });

  it('defaults visible to true when missing', () => {
    const config = { name: { label: 'Name' } } as unknown as PropertyDisplayConfig;
    expect(toEntries(config)[0].visible).toBe(true);
  });

  it('defaults label to empty string when missing', () => {
    const config: PropertyDisplayConfig = { name: { visible: true } };
    expect(toEntries(config)[0].label).toBe('');
  });

  it('preserves insertion order', () => {
    const config: PropertyDisplayConfig = {
      z_prop: { visible: true },
      a_prop: { visible: true },
      m_prop: { visible: true },
    };
    expect(toEntries(config).map((e) => e.key)).toEqual(['z_prop', 'a_prop', 'm_prop']);
  });
});

describe('fromEntries', () => {
  it('returns empty record for empty array', () => {
    expect(fromEntries([])).toEqual({});
  });

  it('converts entries back to record', () => {
    const entries = [
      { key: 'name', label: 'Country Name', visible: true },
      { key: 'internal_id', label: '', visible: false },
    ];
    expect(fromEntries(entries)).toEqual({
      name: { label: 'Country Name', visible: true },
      internal_id: { visible: false },
    });
  });

  it('omits label key when label is empty string', () => {
    const entries = [{ key: 'name', label: '', visible: true }];
    const result = fromEntries(entries);
    expect(result.name).toEqual({ visible: true });
    expect('label' in result.name).toBe(false);
  });

  it('preserves entry order in the record', () => {
    const entries = [
      { key: 'z_prop', label: '', visible: true },
      { key: 'a_prop', label: '', visible: true },
    ];
    expect(Object.keys(fromEntries(entries))).toEqual(['z_prop', 'a_prop']);
  });
});

describe('round-trip: toEntries → mutate → fromEntries', () => {
  it('adding a property creates entry with visible: true', () => {
    const config: PropertyDisplayConfig = { name: { label: 'Name', visible: true } };
    const entries = toEntries(config);
    const updated = [...entries, { key: 'new_prop', label: '', visible: true }];
    const result = fromEntries(updated);
    expect(result['new_prop']).toEqual({ visible: true });
  });

  it('changing a label updates the record', () => {
    const config: PropertyDisplayConfig = { name: { label: 'Old', visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'name' ? { ...e, label: 'New Name' } : e));
    expect(fromEntries(updated)['name'].label).toBe('New Name');
  });

  it('toggling visible updates the record', () => {
    const config: PropertyDisplayConfig = { name: { visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'name' ? { ...e, visible: false } : e));
    expect(fromEntries(updated)['name'].visible).toBe(false);
  });

  it('removing a property removes it from the record', () => {
    const config: PropertyDisplayConfig = {
      name: { visible: true },
      internal_id: { visible: false },
    };
    const entries = toEntries(config);
    const updated = entries.filter((e) => e.key !== 'internal_id');
    const result = fromEntries(updated);
    expect('internal_id' in result).toBe(false);
    expect('name' in result).toBe(true);
  });

  it('reorder buttons swap adjacent entries', () => {
    const config: PropertyDisplayConfig = {
      a: { visible: true },
      b: { visible: true },
      c: { visible: true },
    };
    const entries = toEntries(config);
    // move 'b' (index 1) up
    const updated = [...entries];
    [updated[0], updated[1]] = [updated[1], updated[0]];
    expect(Object.keys(fromEntries(updated))).toEqual(['b', 'a', 'c']);
  });

  it('renaming a property key updates the record key', () => {
    const config: PropertyDisplayConfig = { old_key: { label: 'Old', visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'old_key' ? { ...e, key: 'new_key' } : e));
    const result = fromEntries(updated);
    expect('old_key' in result).toBe(false);
    expect(result['new_key']).toEqual({ label: 'Old', visible: true });
  });
});
