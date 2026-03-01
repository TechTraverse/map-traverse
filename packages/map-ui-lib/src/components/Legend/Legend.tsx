import type { LayerConfig, StyleConfig, LegendEntry } from '../../types';

export interface LegendProps {
  layers: LayerConfig[];
  visibleLayerIds: string[];
  className?: string;
}

function resolveColor(value: string | unknown[] | undefined, fallback: string): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    // Extract fallback color from expression (last element of match/interpolate)
    const last = value[value.length - 1];
    if (typeof last === 'string') return last;
  }
  return fallback;
}

function getColorFromStyle(style: StyleConfig): string {
  switch (style.type) {
    case 'fill':
      return resolveColor(style.paint['fill-color'], '#000000');
    case 'line':
      return resolveColor(style.paint['line-color'], '#000000');
    case 'circle':
      return resolveColor(style.paint['circle-color'], '#000000');
    case 'symbol':
      return resolveColor(style.paint['text-color'] ?? style.paint['icon-color'], '#000000');
  }
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

function deriveEntriesFromStyle(
  layer: LayerConfig
): LegendEntry[] | null {
  if (!layer.style) return null;
  return [
    {
      label: layer.label,
      color: getColorFromStyle(layer.style),
      shape: getShapeFromStyle(layer.style),
    },
  ];
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

export function Legend({ layers, visibleLayerIds, className }: LegendProps) {
  const visibleLayers = layers.filter((l) => visibleLayerIds.includes(l.id));

  const layerEntries = visibleLayers
    .map((layer) => {
      const entries = layer.legend?.entries ?? deriveEntriesFromStyle(layer);
      if (!entries) return null;
      return { layer, entries };
    })
    .filter(Boolean) as { layer: LayerConfig; entries: LegendEntry[] }[];

  if (layerEntries.length === 0) {
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
        {layerEntries.map(({ layer, entries }) => (
          <li key={layer.id}>
            {entries.length === 1 ? (
              <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0">
                <Swatch
                  color={entries[0].color}
                  shape={entries[0].shape}
                />
                <span className="mapui:text-gray-700 mapui:truncate">{entries[0].label}</span>
              </div>
            ) : (
              <div>
                <div className="mapui:mb-1 mapui:text-xs mapui:font-medium mapui:text-gray-600">
                  {layer.label}
                </div>
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
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
