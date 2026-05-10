import { describe, it, expect } from 'vitest';
import { validateSearchField } from '../searchFieldValidation';
import type { AvailableProperty, SearchField } from '../../types';

const ap = (name: string, type: string, format?: string): AvailableProperty => ({ name, type, format });

const f = {
  text: (property = 'p'): SearchField => ({ type: 'text', property, label: '', autocomplete: false }),
  number: (property = 'p'): SearchField => ({ type: 'number', property, label: '', inputMode: 'input', operator: 'eq' }),
  datetime: (property = 'p'): SearchField => ({ type: 'datetime', property, label: '', range: false }),
  select: (property = 'p'): SearchField => ({ type: 'select', property, label: '' }),
};

describe('validateSearchField', () => {
  it('returns null when no available properties (queryables not loaded)', () => {
    expect(validateSearchField(f.text(), undefined)).toBeNull();
    expect(validateSearchField(f.text(), [])).toBeNull();
  });

  it('returns null when the field has no property bound yet', () => {
    expect(validateSearchField(f.text(''), [ap('name', 'string')])).toBeNull();
  });

  it('flags a missing property', () => {
    const result = validateSearchField(f.text('nope'), [ap('name', 'string')]);
    expect(result?.kind).toBe('missing');
    expect(result?.message).toMatch(/nope/);
  });

  it('accepts a string-typed property for a text field', () => {
    expect(validateSearchField(f.text('name'), [ap('name', 'string')])).toBeNull();
  });

  it('rejects a number-typed property bound to a text field', () => {
    const r = validateSearchField(f.text('age'), [ap('age', 'number')]);
    expect(r?.kind).toBe('incompatible');
  });

  it('requires numeric for number fields', () => {
    expect(validateSearchField(f.number('age'), [ap('age', 'number')])).toBeNull();
    expect(validateSearchField(f.number('age'), [ap('age', 'integer')])).toBeNull();
    expect(validateSearchField(f.number('name'), [ap('name', 'string')])?.kind).toBe('incompatible');
  });

  it('accepts date-time format strings for datetime fields', () => {
    expect(validateSearchField(f.datetime('created'), [ap('created', 'string', 'date-time')])).toBeNull();
    expect(validateSearchField(f.datetime('created'), [ap('created', 'string', 'date')])).toBeNull();
  });

  it('falls back to name-based heuristic for datetime when format is missing', () => {
    expect(validateSearchField(f.datetime('start_date'), [ap('start_date', 'string')])).toBeNull();
    expect(validateSearchField(f.datetime('name'), [ap('name', 'string')])?.kind).toBe('incompatible');
  });

  it('rejects boolean queryables for select fields', () => {
    expect(validateSearchField(f.select('active'), [ap('active', 'boolean')])?.kind).toBe('incompatible');
  });

  it('accepts unknown queryable type for text (servers sometimes omit type)', () => {
    expect(validateSearchField(f.text('mystery'), [ap('mystery', '')])).toBeNull();
  });
});
