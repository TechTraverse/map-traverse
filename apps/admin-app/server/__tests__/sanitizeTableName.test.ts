import { describe, it, expect } from 'vitest';
import { sanitizeTableName, isValidIdentifier, MAX_IDENTIFIER_LENGTH } from '../sanitizeTableName.js';

/**
 * MUST match `apps/ingest-service/src/identifiers.test.ts`'s SANITIZER_VECTORS
 * exactly — the admin sanitizer and the sidecar sanitizer have to agree, or a
 * file could land in a table the admin can't address/delete.
 */
const SANITIZER_VECTORS: Array<{ input: string; expected: string }> = [
  { input: 'Parcels', expected: 'parcels' },
  { input: 'My Parcels 2024', expected: 'my_parcels_2024' },
  { input: 'roads-and-trails', expected: 'roads_and_trails' },
  { input: 'café data', expected: 'cafe_data' },
  { input: '  spaced  out  ', expected: 'spaced_out' },
  { input: 'parcels.shp.zip', expected: 'parcels' },
  { input: 'flood_zones.geojson', expected: 'flood_zones' },
  { input: '123counties', expected: 't_123counties' },
  { input: '!!!', expected: 'dataset' },
  { input: '', expected: 'dataset' },
  { input: 'uploads', expected: 'uploads_t' },
  { input: 'select', expected: 'select_t' },
  { input: 'a"; DROP TABLE x; --', expected: 'a_drop_table_x' },
];

describe('sanitizeTableName (admin mirror)', () => {
  for (const { input, expected } of SANITIZER_VECTORS) {
    it(`maps ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
      expect(sanitizeTableName(input)).toBe(expected);
    });
  }

  it('always returns a valid identifier', () => {
    for (const input of ['Parcels', '../../etc', 'a"; DROP', '12345', '日本語', 'x'.repeat(200), 'uploads']) {
      expect(isValidIdentifier(sanitizeTableName(input))).toBe(true);
    }
  });

  it('respects the 63-byte cap', () => {
    expect(sanitizeTableName('x'.repeat(120)).length).toBeLessThanOrEqual(MAX_IDENTIFIER_LENGTH);
  });
});

describe('isValidIdentifier (admin mirror)', () => {
  it('rejects unsafe names', () => {
    expect(isValidIdentifier('uploads')).toBe(false);
    expect(isValidIdentifier('Parcels')).toBe(false);
    expect(isValidIdentifier('a;b')).toBe(false);
    expect(isValidIdentifier('123')).toBe(false);
  });
});
