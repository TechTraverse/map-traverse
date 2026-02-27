import type { StyleConfig } from '../../types';

export function StylePreview({ style }: { style: StyleConfig }) {
  if (style.type === 'fill') {
    return (
      <div
        className="mapui:h-8 mapui:w-full mapui:rounded mapui:border mapui:border-gray-200"
        style={{
          backgroundColor: style.paint['fill-color'],
          opacity: style.paint['fill-opacity'],
          outline: style.paint['fill-outline-color']
            ? `2px solid ${style.paint['fill-outline-color']}`
            : undefined,
        }}
        aria-label="Style preview"
      />
    );
  }
  if (style.type === 'line') {
    return (
      <div
        className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:rounded mapui:border mapui:border-gray-200 mapui:px-2"
        aria-label="Style preview"
      >
        <div
          style={{
            width: '100%',
            height: style.paint['line-width'],
            backgroundColor: style.paint['line-color'],
            opacity: style.paint['line-opacity'],
          }}
        />
      </div>
    );
  }
  if (style.type === 'circle') {
    return (
      <div
        className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-gray-200"
        aria-label="Style preview"
      >
        <div
          style={{
            width: style.paint['circle-radius'] * 2,
            height: style.paint['circle-radius'] * 2,
            backgroundColor: style.paint['circle-color'],
            opacity: style.paint['circle-opacity'],
            borderRadius: '50%',
            border: style.paint['circle-stroke-color']
              ? `${style.paint['circle-stroke-width'] ?? 1}px solid ${style.paint['circle-stroke-color']}`
              : undefined,
          }}
        />
      </div>
    );
  }
  // symbol
  return (
    <div
      className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-gray-200"
      aria-label="Style preview"
    >
      <span
        style={{
          color: style.paint['text-color'] ?? style.paint['icon-color'] ?? '#333333',
          fontSize: '1.1rem',
          fontWeight: 600,
        }}
      >
        A
      </span>
    </div>
  );
}
