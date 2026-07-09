import { describe, it, expect } from 'vitest';
import {
  computePopoverMaxHeight,
  POPOVER_MIN_HEIGHT,
  POPOVER_VIEWPORT_MARGIN,
} from '../popoverMaxHeight';

describe('computePopoverMaxHeight', () => {
  it('caps a top-corner popover to the space below the anchor top', () => {
    // button at top=300 in a 600px viewport: 600 - 300 - 16 margin
    expect(computePopoverMaxHeight(300, 340, 600, 'top-right')).toBe(284);
    expect(computePopoverMaxHeight(300, 340, 600, 'top-left')).toBe(284);
  });

  it('caps a bottom-corner popover to the space above the anchor bottom', () => {
    // panel grows upward from the button bottom: 500 - 16 margin
    expect(computePopoverMaxHeight(460, 500, 600, 'bottom-right')).toBe(484);
    expect(computePopoverMaxHeight(460, 500, 600, 'bottom-left')).toBe(484);
  });

  it('clamps to the minimum height when the anchor is near the far edge', () => {
    // top corner, button almost at the viewport bottom
    expect(computePopoverMaxHeight(580, 620, 600, 'top-right')).toBe(POPOVER_MIN_HEIGHT);
    // bottom corner, button almost at the viewport top
    expect(computePopoverMaxHeight(10, 50, 600, 'bottom-left')).toBe(POPOVER_MIN_HEIGHT);
  });

  it('honors a custom margin', () => {
    expect(computePopoverMaxHeight(300, 340, 600, 'top-right', 40)).toBe(260);
  });

  it('rounds fractional rect values to whole pixels', () => {
    expect(computePopoverMaxHeight(300.4, 340.4, 600, 'top-right')).toBe(284);
  });

  it('exports the default margin used by CollapsibleControl', () => {
    expect(POPOVER_VIEWPORT_MARGIN).toBe(16);
  });
});
