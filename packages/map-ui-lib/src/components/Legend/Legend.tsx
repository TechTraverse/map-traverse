import { useState } from 'react';
import { BsArrowsAngleExpand, BsArrowsAngleContract } from 'react-icons/bs';
import type { LayerConfig, LegendConfig, LegendEntry } from '../../types';

export interface LegendProps {
  layers: LayerConfig[];
  visibleLayerIds: string[];
  onOpacityChange?: (layerId: string, opacity: number) => void;
  className?: string;
}

const OPACITY_KEY: Record<string, string> = {
  fill: 'fill-opacity',
  line: 'line-opacity',
  circle: 'circle-opacity',
  symbol: 'icon-opacity',
};

function getLayerOpacity(layer: LayerConfig): number {
  const style = layer.styles?.[0];
  if (!style) return 1;
  const key = OPACITY_KEY[style.type];
  if (!key) return 1;
  const val = (style.paint as Record<string, unknown>)?.[key];
  return typeof val === 'number' ? val : 1;
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

/** Builds a CSS gradient string with hard color stops (no blending between colors). */
function segmentedGradient(entries: LegendEntry[]): string {
  return `linear-gradient(to right, ${entries.map((e, i) => `${e.color} ${(i / entries.length) * 100}% ${((i + 1) / entries.length) * 100}%`).join(', ')})`;
}

/** Builds a smooth CSS gradient string. */
function smoothGradient(entries: LegendEntry[]): string {
  return `linear-gradient(to right, ${entries.map((e) => e.color).join(', ')})`;
}

function SimpleLegend({ legend, label }: { legend: LegendConfig; label: string }) {
  const { entries } = legend;
  if (entries.length === 1) {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0">
        <Swatch color={entries[0].color} shape={entries[0].shape} />
        <span className="mapui:text-gray-700 mapui:truncate">
          {entries[0].label || label}
        </span>
      </div>
    );
  }
  return (
    <div>
      <div className="mapui:mb-1 mapui:text-xs mapui:font-medium mapui:text-gray-600">
        {label}
      </div>
      <ul className="mapui:m-0 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:pl-1">
        {entries.map((entry, i) => (
          <li
            key={`${entry.label}-${i}`}
            className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
          >
            <Swatch color={entry.color} shape={entry.shape} />
            <span className="mapui:text-gray-700 mapui:truncate">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoricalLegend({
  legend,
  label,
  expanded,
  onToggle,
}: {
  legend: LegendConfig;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { entries, showLabelsCollapsed } = legend;
  return (
    <div>
      <button
        type="button"
        className="mapui:flex mapui:items-center mapui:gap-1 mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-left mapui:text-gray-700 mapui:text-sm mapui:font-medium"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="mapui:text-xs mapui:text-gray-400">
          {expanded ? '\u25BE' : '\u25B8'}
        </span>
        <span className="mapui:truncate">{label}</span>
      </button>
      <div className="mapui:mt-1 mapui:ml-4">
        <div
          className="mapui:h-3 mapui:min-w-12 mapui:max-w-32 mapui:rounded-sm"
          style={{ background: segmentedGradient(entries) }}
        />
        {showLabelsCollapsed && !expanded && (
          <div className="mapui:mt-1 mapui:flex mapui:justify-between mapui:text-[10px] mapui:text-gray-500 mapui:max-w-32">
            <span className="mapui:truncate">{entries[0]?.label}</span>
            {entries.length > 1 && (
              <span className="mapui:truncate">{entries[entries.length - 1]?.label}</span>
            )}
          </div>
        )}
      </div>
      {expanded && (
        <ul className="mapui:m-0 mapui:mt-1 mapui:ml-4 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:max-h-48 mapui:overflow-y-auto">
          {entries.map((entry, i) => (
            <li
              key={`${entry.label}-${i}`}
              className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
            >
              <Swatch color={entry.color} shape={entry.shape} />
              <span className="mapui:text-gray-700 mapui:truncate mapui:text-xs">
                {entry.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GradientLegend({
  legend,
  label,
  expanded,
  onToggle,
}: {
  legend: LegendConfig;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { entries, gradientProperty } = legend;
  return (
    <div>
      <button
        type="button"
        className="mapui:flex mapui:items-center mapui:gap-1 mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-left mapui:text-gray-700 mapui:text-sm mapui:font-medium"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="mapui:text-xs mapui:text-gray-400">
          {expanded ? '\u25BE' : '\u25B8'}
        </span>
        <span className="mapui:truncate">{label}</span>
      </button>
      <div className="mapui:mt-1 mapui:ml-4">
        <div
          className="mapui:h-3 mapui:min-w-12 mapui:max-w-32 mapui:rounded-sm"
          style={{ background: smoothGradient(entries) }}
        />
      </div>
      {expanded && (
        <div className="mapui:mt-1 mapui:ml-4 mapui:text-xs mapui:text-gray-600">
          {gradientProperty && (
            <div className="mapui:font-medium mapui:mb-1">{gradientProperty}</div>
          )}
          {entries.length >= 2 && (
            <div className="mapui:flex mapui:justify-between mapui:max-w-32">
              <span>{entries[0].label}</span>
              <span>{entries[entries.length - 1].label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpacitySlider({
  layerId,
  opacity,
  onChange,
}: {
  layerId: string;
  opacity: number;
  onChange: (layerId: string, opacity: number) => void;
}) {
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-1.5 mapui:mt-0.5 mapui:ml-1">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={opacity}
        onChange={(e) => onChange(layerId, parseFloat(e.target.value))}
        className="range-sm mapui:w-14"
      />
      <span className="mapui:text-[9px] mapui:text-gray-400 mapui:w-6 mapui:text-right mapui:tabular-nums">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}

export function Legend({ layers, visibleLayerIds, onOpacityChange, className }: LegendProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const visibleLayers = layers.filter((l) => visibleLayerIds.includes(l.id));

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Only show layers that have an explicit legend config
  const legendLayers = visibleLayers.filter((l) => l.legend !== undefined);

  if (legendLayers.length === 0) {
    return null;
  }

  return (
    <div
      className={`mapui:rounded-lg mapui:bg-white mapui:p-3 mapui:shadow-md mapui:text-sm${className ? ` ${className}` : ''}`}
    >
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:mb-2">
        <h3 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-gray-500">
          Legend
        </h3>
        {onOpacityChange && (
          <button
            type="button"
            className="mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-gray-400 hover:mapui:text-gray-600 mapui:text-sm"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse legend' : 'Expand legend'}
          >
            {expanded ? <BsArrowsAngleContract /> : <BsArrowsAngleExpand />}
          </button>
        )}
      </div>
      <ul className={`mapui:m-0 mapui:list-none mapui:p-0 ${expanded ? 'mapui:space-y-1.5' : 'mapui:space-y-2'}`}>
        {legendLayers.map((layer) => {
          const legend = layer.legend!;
          const mode = legend.displayMode ?? 'simple';
          const isEntryExpanded = expanded || expandedIds.has(layer.id);

          return (
            <li key={layer.id}>
              {mode === 'categorical' ? (
                <CategoricalLegend
                  legend={legend}
                  label={layer.label}
                  expanded={isEntryExpanded}
                  onToggle={() => toggleExpand(layer.id)}
                />
              ) : mode === 'gradient' ? (
                <GradientLegend
                  legend={legend}
                  label={layer.label}
                  expanded={isEntryExpanded}
                  onToggle={() => toggleExpand(layer.id)}
                />
              ) : (
                <SimpleLegend legend={legend} label={layer.label} />
              )}
              {expanded && onOpacityChange && (
                <OpacitySlider
                  layerId={layer.id}
                  opacity={getLayerOpacity(layer)}
                  onChange={onOpacityChange}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
