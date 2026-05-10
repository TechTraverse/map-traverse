import type { AvailableProperty, SearchField } from '../types';

export interface SearchFieldValidationError {
  kind: 'missing' | 'incompatible';
  message: string;
}

/**
 * Validates a SearchField's bound `property` against a layer's queryables.
 *
 * Returns `null` when:
 *  - no `availableProperties` were provided (queryables not loaded yet);
 *  - the field has no property bound yet (user hasn't picked one);
 *  - the property exists with a compatible type.
 *
 * Returns an error otherwise. Used by `SearchFieldEditor` (inline error +
 * disabled activation) and by the wizard's pre-save lint pass.
 */
export function validateSearchField(
  field: SearchField,
  available: AvailableProperty[] | undefined,
): SearchFieldValidationError | null {
  if (!available || available.length === 0) return null;
  if (!field.property) return null;

  const ap = available.find((p) => p.name === field.property);
  if (!ap) {
    return {
      kind: 'missing',
      message: `Property "${field.property}" doesn't exist in this collection's queryables.`,
    };
  }

  const apType = (ap.type ?? '').toLowerCase();
  const apFormat = (ap.format ?? '').toLowerCase();

  switch (field.type) {
    case 'text':
      if (apType === 'number' || apType === 'integer' || apType === 'boolean') {
        return {
          kind: 'incompatible',
          message: `Property "${field.property}" is type "${ap.type}" — text fields expect a string.`,
        };
      }
      return null;
    case 'select':
      if (apType === 'boolean') {
        return {
          kind: 'incompatible',
          message: `Property "${field.property}" is boolean — use a text field with static options instead.`,
        };
      }
      return null;
    case 'number':
      if (apType !== 'number' && apType !== 'integer') {
        return {
          kind: 'incompatible',
          message: `Property "${field.property}" is type "${ap.type ?? 'unknown'}" — number fields require numeric data.`,
        };
      }
      return null;
    case 'datetime': {
      if (apType === 'string' && (apFormat === 'date-time' || apFormat === 'date')) return null;
      const looksDatey =
        ap.name.toLowerCase().includes('date') || ap.name.toLowerCase().includes('time');
      if (apType === 'string' && looksDatey) return null;
      return {
        kind: 'incompatible',
        message: `Property "${field.property}" doesn't look like a date/time field — check the queryable's type/format.`,
      };
    }
    default:
      return null;
  }
}
