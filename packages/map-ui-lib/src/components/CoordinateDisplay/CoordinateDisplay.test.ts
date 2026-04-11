import { describe, it, expect } from 'vitest';
import { parseCoordinate } from './CoordinateDisplay';

describe('parseCoordinate', () => {
  it('parses plain decimal degrees', () => {
    expect(parseCoordinate('40.7128')).toBeCloseTo(40.7128, 6);
    expect(parseCoordinate('-74.006')).toBeCloseTo(-74.006, 6);
  });

  it('returns null for empty or whitespace input', () => {
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('   ')).toBeNull();
  });

  it('honours hemisphere letters', () => {
    expect(parseCoordinate('40.7128 N')).toBeCloseTo(40.7128, 6);
    expect(parseCoordinate('40.7128 S')).toBeCloseTo(-40.7128, 6);
    expect(parseCoordinate('74.006 E')).toBeCloseTo(74.006, 6);
    expect(parseCoordinate('74.006 W')).toBeCloseTo(-74.006, 6);
  });

  it('parses DDM (degrees + decimal minutes)', () => {
    expect(parseCoordinate('40 42.768')).toBeCloseTo(40.7128, 4);
    expect(parseCoordinate('40° 42.768\' N')).toBeCloseTo(40.7128, 4);
    expect(parseCoordinate('74° 0.360\' W')).toBeCloseTo(-74.006, 4);
  });

  it('parses DMS (degrees, minutes, seconds)', () => {
    expect(parseCoordinate('40 42 46.08')).toBeCloseTo(40.7128, 4);
    expect(parseCoordinate('40°42\'46.08"N')).toBeCloseTo(40.7128, 4);
    expect(parseCoordinate('74°0\'21.6"W')).toBeCloseTo(-74.006, 4);
  });

  it('returns null for unparseable input', () => {
    expect(parseCoordinate('abc')).toBeNull();
    expect(parseCoordinate('40 42 46 12')).toBeNull();
  });

  it('handles negative degrees in multi-token forms', () => {
    expect(parseCoordinate('-40 42.768')).toBeCloseTo(-40.7128, 4);
  });
});
