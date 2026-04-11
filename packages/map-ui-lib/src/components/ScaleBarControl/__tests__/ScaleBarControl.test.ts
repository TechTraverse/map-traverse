import { describe, it, expect } from 'vitest';
import {
  metersPerPixel,
  computeMetricScale,
  computeImperialScale,
} from '../ScaleBarControl';

describe('metersPerPixel', () => {
  it('returns a positive finite value at the equator', () => {
    const mPerPx = metersPerPixel(0, 0);
    expect(mPerPx).toBeGreaterThan(0);
    expect(Number.isFinite(mPerPx)).toBe(true);
  });

  it('decreases as zoom increases', () => {
    const coarse = metersPerPixel(2, 0);
    const fine = metersPerPixel(10, 0);
    expect(fine).toBeLessThan(coarse);
  });

  it('decreases as latitude moves away from the equator', () => {
    const eq = metersPerPixel(10, 0);
    const high = metersPerPixel(10, 60);
    expect(high).toBeLessThan(eq);
  });
});

describe('computeMetricScale', () => {
  it('picks a round number ≤ the max and a bar width ≤ maxWidthPx', () => {
    const { label, widthPx } = computeMetricScale(12, 40.7128, 100);
    expect(label).toMatch(/^\d+(\.\d+)?\s(m|km)$/);
    expect(widthPx).toBeLessThanOrEqual(100);
    expect(widthPx).toBeGreaterThan(0);
  });

  it('switches between meters and kilometers appropriately', () => {
    const closeUp = computeMetricScale(18, 0, 100);
    const farOut = computeMetricScale(4, 0, 100);
    expect(closeUp.label).toMatch(/m$/);
    expect(farOut.label).toMatch(/km$/);
  });
});

describe('computeImperialScale', () => {
  it('returns a labeled value with a ≤ maxWidthPx bar', () => {
    const { label, widthPx } = computeImperialScale(12, 40.7128, 100);
    expect(label).toMatch(/^\d+(\.\d+)?\s(ft|mi)$/);
    expect(widthPx).toBeLessThanOrEqual(100);
    expect(widthPx).toBeGreaterThan(0);
  });

  it('switches between feet and miles appropriately', () => {
    const closeUp = computeImperialScale(18, 0, 100);
    const farOut = computeImperialScale(4, 0, 100);
    expect(closeUp.label).toMatch(/ft$/);
    expect(farOut.label).toMatch(/mi$/);
  });
});
