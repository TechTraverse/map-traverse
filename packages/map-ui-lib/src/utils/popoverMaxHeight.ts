import type { ControlCorner } from '../types';

/** Gap kept between a popover edge and the viewport edge (matches the 1rem corner insets). */
export const POPOVER_VIEWPORT_MARGIN = 16;

/** Never cap a popover below this — a sliver of panel is worse than slight overflow. */
export const POPOVER_MIN_HEIGHT = 120;

/**
 * Max height for a button-anchored popover so it stays inside the viewport.
 *
 * top-* corners: the panel top aligns with the button top and grows downward,
 * so the available space is from the button top to the viewport bottom.
 * bottom-* corners: the panel bottom aligns with the button bottom and grows
 * upward, so the available space is from the viewport top to the button bottom.
 */
export function computePopoverMaxHeight(
  anchorTop: number,
  anchorBottom: number,
  viewportHeight: number,
  corner: ControlCorner,
  margin: number = POPOVER_VIEWPORT_MARGIN,
): number {
  const available = corner.startsWith('top')
    ? viewportHeight - anchorTop - margin
    : anchorBottom - margin;
  return Math.max(Math.round(available), POPOVER_MIN_HEIGHT);
}
