/**
 * A palette of visually distinct categorical colors (Tableau 10-inspired).
 * Used by DataDrivenColorEditor auto-populate to assign colors to categorical values.
 */
const CATEGORICAL_PALETTE: string[] = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
];

/**
 * Returns a color from the categorical palette, cycling if index exceeds palette length.
 */
export function getColorFromPalette(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}
