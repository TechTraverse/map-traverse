import { useState } from 'react';
import type { LayerConfig, StyleConfig, LegendEntry } from '../../types';
import {
  isExpression,
  expressionType,
  expressionColors,
  expressionEntries,
} from '../../utils/expressionColors';

export interface LegendProps {
  layers: LayerConfig[];
  visibleLayerIds: string[];
  className?: string;
}

function resolveColor(value: string | unknown[] | undefined, fallback: string): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    if (typeof last === 'string') return last;
  }
  return fallback;
}

function getRawColor(style: StyleConfig): string | unknown[] {
  switch (style.type) {
    case 'fill':
      return style.paint['fill-color'] ?? '#000000';
    case 'line':
      return style.paint['line-color'] ?? '#000000';
    case 'circle':
      return style.paint['circle-color'] ?? '#000000';
    case 'symbol':
      return style.paint['text-color'] ?? style.paint['icon-color'] ?? '#000000';
  }
}

function getColorFromStyle(style: StyleConfig): string {
  const raw = getRawColor(style);
  if (typeof raw === 'string') return raw;
  return resolveColor(raw, '#000000');
}

function getShapeFromStyle(style: StyleConfig): 'square' | 'line' | 'circle' {
  switch (style.type) {
    case 'fill':
      return 'square';
    case 'line':
      return 'line';
    case 'circle':
    case 'symbol':
      return 'circle';
  }
}

type DerivedLegendData =
  | { kind: 'entries'; entries: LegendEntry[] }
  | { kind: 'expression'; label: string; expr: unknown[]; shape: 'square' | 'line' | 'circle' };

function deriveFromStyle(layer: LayerConfig): DerivedLegendData | null {
  if (!layer.style) return null;
  const raw = getRawColor(layer.style);
  if (isExpression(raw) && expressionType(raw) !== null) {
    return {
      kind: 'expression',
      label: layer.label,
      expr: raw,
      shape: getShapeFromStyle(layer.style),
    };
  }
  return {
    kind: 'entries',
    entries: [
      {
        label: layer.label,
        color: getColorFromStyle(layer.style),
        shape: getShapeFromStyle(layer.style),
      },
    ],
  };
}

function Swatch({ color, shape }: { color: string; shape?: string }) {
  const resolvedShape = shape ?? 'square';

  if (resolvedShape === 'circle') {
    return (
      <span
        className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:rounded-full mapui:shrink-0"
        style={{ backgroundColor: color }}
      />
    );
  }

  if (resolvedShape === 'line') {
    return (
      <span
        className="mapui:inline-block mapui:h-0.5 mapui:w-4 mapui:rounded-full mapui:shrink-0"
        style={{ backgroundColor: color }}
      />
    );
  }

  // square (default)
  return (
    <span
      className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:rounded-sm mapui:shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function ExpressionSwatch({ expr }: { expr: unknown[] }) {
  const colors = expressionColors(expr);
  if (colors.length === 0) return null;

  const type = expressionType(expr);
  const background =
    type === 'interpolate'
      ? `linear-gradient(to right, ${colors.join(', ')})`
      : `linear-gradient(to right, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')})`;

  return (
    <div
      className="mapui:h-3 mapui:min-w-12 mapui:max-w-32 mapui:rounded-sm"
      style={{ background }}
    />
  );
}

function ConfigEntries({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="mapui:m-0 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:pl-1">
      {entries.map((entry, i) => (
        <li
          key={`${entry.label}-${i}`}
          className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
        >
          <Swatch color={entry.color} shape={entry.shape} />
          <span className="mapui:text-gray-700 mapui:truncate">
            {entry.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Legend({ layers, visibleLayerIds, className }: LegendProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const visibleLayers = layers.filter((l) => visibleLayerIds.includes(l.id));

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const layerData = visibleLayers
    .map((layer) => {
      // Explicit legend entries always win
      if (layer.legend?.entries) {
        return { layer, data: { kind: 'entries' as const, entries: layer.legend.entries } };
      }
      const derived = deriveFromStyle(layer);
      if (!derived) return null;
      return { layer, data: derived };
    })
    .filter(Boolean) as { layer: LayerConfig; data: DerivedLegendData }[];

  if (layerData.length === 0) {
    return null;
  }

  return (
    <div
      className={`mapui:rounded-lg mapui:bg-white mapui:p-3 mapui:shadow-md mapui:text-sm${className ? ` ${className}` : ''}`}
    >
      <h3 className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-gray-500">
        Legend
      </h3>
      <ul className="mapui:m-0 mapui:list-none mapui:space-y-2 mapui:p-0">
        {layerData.map(({ layer, data }) => (
          <li key={layer.id}>
            {data.kind === 'expression' ? (
              <div>
                <button
                  type="button"
                  className="mapui:flex mapui:items-center mapui:gap-1 mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-left mapui:text-gray-700 mapui:text-sm mapui:font-medium"
                  onClick={() => toggleExpand(layer.id)}
                  aria-expanded={expandedIds.has(layer.id)}
                >
                  <span className="mapui:text-xs mapui:text-gray-400">
                    {expandedIds.has(layer.id) ? '\u25BE' : '\u25B8'}
                  </span>
                  <span className="mapui:truncate">{data.label}</span>
                </button>
                <div className="mapui:mt-1 mapui:ml-4">
                  <ExpressionSwatch expr={data.expr} />
                </div>
                {expandedIds.has(layer.id) && (
                  <ul className="mapui:m-0 mapui:mt-1 mapui:ml-4 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:max-h-48 mapui:overflow-y-auto">
                    {expressionEntries(data.expr).map((entry, i) => (
                      <li
                        key={`${entry.label}-${i}`}
                        className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
                      >
                        <Swatch color={entry.color} shape={data.shape} />
                        <span className="mapui:text-gray-700 mapui:truncate mapui:text-xs">
                          {entry.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : data.entries.length === 1 ? (
              <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0">
                <Swatch
                  color={data.entries[0].color}
                  shape={data.entries[0].shape}
                />
                <span className="mapui:text-gray-700 mapui:truncate">{data.entries[0].label}</span>
              </div>
            ) : (
              <div>
                <div className="mapui:mb-1 mapui:text-xs mapui:font-medium mapui:text-gray-600">
                  {layer.label}
                </div>
                <ConfigEntries entries={data.entries} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
