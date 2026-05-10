import { describe, it, expect } from 'vitest';
import { prettifyZodPath, prettifyZodIssue } from '../prettifyZodPath';

describe('prettifyZodPath', () => {
  it('returns Config for empty path', () => {
    expect(prettifyZodPath([])).toBe('Config');
  });

  it('formats imagery layer paths with row + field', () => {
    expect(prettifyZodPath(['imageryLayers', 0, 'sourceId'])).toBe(
      'Imagery layer #1 → Source',
    );
    expect(prettifyZodPath(['imageryLayers', 2, 'tileUrlTemplate'])).toBe(
      'Imagery layer #3 → Tile URL',
    );
  });

  it('formats layer search field paths', () => {
    expect(
      prettifyZodPath(['layers', 1, 'search', 'fields', 0, 'property']),
    ).toBe('Layer #2 → Search → Search field #1 → Property');
  });

  it('formats global search property paths', () => {
    expect(
      prettifyZodPath(['globalSearch', 'layers', 0, 'properties', 1, 'label']),
    ).toBe('Global Search → Global-search layer #1 → Property #2 → Label');
  });

  it('falls back to camelCase prettification for unknown keys', () => {
    expect(prettifyZodPath(['ui', 'mysteryKey'])).toBe('Ui → Mystery Key');
  });

  it('falls back to indexed bracket on bare numbers', () => {
    expect(prettifyZodPath(['unknown', 4])).toBe('Unknown → #5');
  });
});

describe('prettifyZodIssue', () => {
  it('joins path and message', () => {
    expect(
      prettifyZodIssue({
        path: ['imageryLayers', 0, 'sourceId'],
        message: 'Required when no custom tile URL is set',
      }),
    ).toBe('Imagery layer #1 → Source: Required when no custom tile URL is set');
  });

  it('returns plain message when path resolves to Config', () => {
    expect(prettifyZodIssue({ path: [], message: 'Top-level error' })).toBe(
      'Top-level error',
    );
  });
});
