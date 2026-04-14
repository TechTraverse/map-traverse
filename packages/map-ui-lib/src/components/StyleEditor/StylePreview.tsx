import type { StyleConfig } from '../../types';
import { isExpression, expressionColors } from '../../utils/expressionColors';

/** Renders a gradient/segmented swatch for expression color values. */
function ExpressionSwatch({ expr, height }: { expr: unknown[]; height?: number }) {
  const colors = expressionColors(expr);
  if (colors.length === 0) {
    return (
      <div
        style={{ width: '100%', height: height ?? 32, background: '#e5e7eb', borderRadius: 4 }}
        title="Expression (no preview)"
      />
    );
  }
  const isGradient = expr[0] === 'interpolate';
  const background = isGradient
    ? `linear-gradient(to right, ${colors.join(', ')})`
    : colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ');

  return (
    <div
      style={{
        width: '100%',
        height: height ?? 32,
        background: isGradient ? background : `linear-gradient(to right, ${background})`,
        borderRadius: 4,
      }}
      title="Data-driven color expression"
    />
  );
}

/** Safely resolves a color value (string or expression) to a CSS color string. */
function resolveColor(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (isExpression(value)) {
    const colors = expressionColors(value);
    return colors[0] ?? fallback;
  }
  return fallback;
}

export function StylePreview({ style }: { style: StyleConfig }) {
  if (style.type === 'fill') {
    const fillColor = style.paint['fill-color'];
    return (
      <div
        className="mapui:h-8 mapui:w-full mapui:rounded mapui:border mapui:border-slate-200 mapui:overflow-hidden"
        aria-label="Style preview"
      >
        {isExpression(fillColor) ? (
          <ExpressionSwatch expr={fillColor} height={32} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: fillColor,
              opacity: style.paint['fill-opacity'],
              outline: style.paint['fill-outline-color'] && !isExpression(style.paint['fill-outline-color'])
                ? `2px solid ${style.paint['fill-outline-color']}`
                : undefined,
            }}
          />
        )}
      </div>
    );
  }
  if (style.type === 'line') {
    const lineColor = style.paint['line-color'];
    return (
      <div
        className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:rounded mapui:border mapui:border-slate-200 mapui:px-2"
        aria-label="Style preview"
      >
        {isExpression(lineColor) ? (
          <ExpressionSwatch expr={lineColor} height={style.paint['line-width']} />
        ) : (
          <div
            style={{
              width: '100%',
              height: style.paint['line-width'],
              backgroundColor: lineColor,
              opacity: style.paint['line-opacity'],
            }}
          />
        )}
      </div>
    );
  }
  if (style.type === 'circle') {
    const circleColor = style.paint['circle-color'];
    const diameter = style.paint['circle-radius'] * 2;
    return (
      <div
        className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-200"
        aria-label="Style preview"
      >
        {isExpression(circleColor) ? (
          <div style={{ width: diameter, height: diameter, borderRadius: '50%', overflow: 'hidden' }}>
            <ExpressionSwatch expr={circleColor} height={diameter} />
          </div>
        ) : (
          <div
            style={{
              width: diameter,
              height: diameter,
              backgroundColor: circleColor,
              opacity: style.paint['circle-opacity'],
              borderRadius: '50%',
              border: style.paint['circle-stroke-color'] && !isExpression(style.paint['circle-stroke-color'])
                ? `${style.paint['circle-stroke-width'] ?? 1}px solid ${style.paint['circle-stroke-color']}`
                : undefined,
            }}
          />
        )}
      </div>
    );
  }
  // symbol
  const textColor = resolveColor(style.paint['text-color'], '#333333');
  const iconColor = resolveColor(style.paint['icon-color'], '#333333');
  return (
    <div
      className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-200"
      aria-label="Style preview"
    >
      <span
        style={{
          color: textColor ?? iconColor ?? '#333333',
          fontSize: '1.1rem',
          fontWeight: 600,
        }}
      >
        A
      </span>
    </div>
  );
}
