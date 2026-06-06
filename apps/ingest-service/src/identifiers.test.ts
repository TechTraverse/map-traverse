import { describe, it, expect } from 'vitest';
import { sanitizeTableName, isValidIdentifier, MAX_IDENTIFIER_LENGTH } from './identifiers.js';

/**
 * Shared sanitizer vectors. The admin-app mirrors `sanitizeTableName` and its
 * test asserts the SAME input→output pairs, keeping the two copies in lockstep.
 * If you change a vector here, change it there too.
 */
export const SANITIZER_VECTORS: Array<{ input: string; expected: string }> = [
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

describe('sanitizeTableName', () => {
  for (const { input, expected } of SANITIZER_VECTORS) {
    it(`maps ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
      expect(sanitizeTableName(input)).toBe(expected);
    });
  }

  it('always returns a valid identifier', () => {
    const inputs = [
      'Parcels', '../../etc/passwd', 'a"; DROP TABLE x', '12345', '日本語',
      '!!!', 'x'.repeat(200), 'uploads', 'SELECT', 'a b c d',
    ];
    for (const input of inputs) {
      expect(isValidIdentifier(sanitizeTableName(input))).toBe(true);
    }
  });

  it('truncates to the 63-byte cap with no trailing underscore', () => {
    const out = sanitizeTableName('a'.repeat(40) + ' ' + 'b'.repeat(40));
    expect(out.length).toBeLessThanOrEqual(MAX_IDENTIFIER_LENGTH);
    expect(out.endsWith('_')).toBe(false);
  });

  it('strips path-traversal sequences', () => {
    expect(sanitizeTableName('../../secret')).toBe('secret');
    expect(sanitizeTableName('..\\..\\secret')).toBe('secret');
  });
});

describe('isValidIdentifier', () => {
  it('accepts safe snake_case names', () => {
    expect(isValidIdentifier('parcels')).toBe(true);
    expect(isValidIdentifier('my_parcels_2024')).toBe(true);
    expect(isValidIdentifier('_private')).toBe(true);
  });

  it('rejects injection, casing, length, leading digits, and reserved words', () => {
    expect(isValidIdentifier('Parcels')).toBe(false); // uppercase
    expect(isValidIdentifier('123abc')).toBe(false); // leading digit
    expect(isValidIdentifier('a;b')).toBe(false);
    expect(isValidIdentifier('a"b')).toBe(false);
    expect(isValidIdentifier('a b')).toBe(false);
    expect(isValidIdentifier('uploads')).toBe(false); // reserved
    expect(isValidIdentifier('drop')).toBe(false); // reserved
    expect(isValidIdentifier('x'.repeat(64))).toBe(false); // too long
    expect(isValidIdentifier('')).toBe(false);
  });
});
