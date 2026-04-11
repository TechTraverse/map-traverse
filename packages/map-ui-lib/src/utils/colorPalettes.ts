import { getColorFromTheme, type ColorThemeId } from './colorThemes';

/**
 * Returns a color from the categorical palette, optionally scoped to a theme.
 * Cycles when index exceeds palette length.
 */
export function getColorFromPalette(index: number, theme?: ColorThemeId): string {
  return getColorFromTheme(index, theme);
}
