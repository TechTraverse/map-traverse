import { useState } from 'react';
import { LuMaximize2, LuMinimize2 } from 'react-icons/lu';
import { MdOutlineKeyboardArrowRight, MdOutlineKeyboardArrowDown } from 'react-icons/md';
import type { LayerConfig, LegendConfig, LegendEntry } from '../../types';

export interface LegendProps {
  layers: LayerConfig[];
  visibleLayerIds: string[];
  /**
   * Optional explicit legend display order (array of layer IDs). IDs in this
   * list render first, in order; any visible legend layers not listed follow
   * in their natural order. Unknown IDs are ignored.
   */
  legendOrder?: string[];
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
  let inner: React.ReactNode;

  if (resolvedShape === 'circle') {
    inner = (
      <span
        className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  } else if (resolvedShape === 'line') {
    inner = (
      <span
        className="mapui:inline-block mapui:h-0.5 mapui:w-4 mapui:rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  } else {
    // square (default)
    inner = (
      <span
        className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:rounded-sm"
        style={{ backgroundColor: color }}
      />
    );
  }

  return (
    <span className="mapui:inline-flex mapui:items-center mapui:justify-center mapui:w-5 mapui:shrink-0">
      {inner}
    </span>
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

/** Parses a hex color (#rgb or #rrggbb) to its HSL hue (0–360), or null if unparseable. */
function hexToHue(color: string): number | null {
  const hex = color.trim();
  let r: number, g: number, b: number;
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (/^#[0-9a-f]{6}$/i.test(hex)) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return null;
  }
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + 6) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return h * 60;
}

/** Sorts legend entries by hue; entries with non-hex colors are placed at the end. */
function sortByHue(entries: LegendEntry[]): LegendEntry[] {
  return [...entries].sort((a, b) => {
    const ha = hexToHue(a.color);
    const hb = hexToHue(b.color);
    if (ha === null && hb === null) return 0;
    if (ha === null) return 1;
    if (hb === null) return -1;
    return ha - hb;
  });
}

function SimpleLegend({ legend, label, hasArrowColumn }: { legend: LegendConfig; label: string; hasArrowColumn?: boolean }) {
  const { entries } = legend;
  const arrowSpacer = hasArrowColumn ? <span className="mapui:w-5 mapui:shrink-0" /> : null;
  if (entries.length === 1) {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0">
        {arrowSpacer}
        <Swatch color={entries[0].color} shape={entries[0].shape} />
        <span className="mapui:text-slate-700 mapui:truncate">
          {entries[0].label || label}
        </span>
      </div>
    );
  }
  return (
    <div>
      <div className="mapui:mb-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
        {label}
      </div>
      <ul className="mapui:m-0 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:pl-1">
        {entries.map((entry, i) => (
          <li
            key={`${entry.label}-${i}`}
            className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
          >
            {arrowSpacer}
            <Swatch color={entry.color} shape={entry.shape} />
            <span className="mapui:text-slate-700 mapui:truncate">{entry.label}</span>
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
  hasArrowColumn,
}: {
  legend: LegendConfig;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  hasArrowColumn?: boolean;
}) {
  const { entries } = legend;
  const showColorBar = legend.showColorBar !== false;
  const showArrow = legend.showDisclosureArrow !== false;
  const showLabelsCollapsed = legend.showLabelsCollapsed ?? false;
  const uniqueColorEntries = entries.filter((e, i, arr) => arr.findIndex((x) => x.color === e.color) === i);
  const sortedEntries = sortByHue(uniqueColorEntries);

  const arrowElement = (
    <span className="mapui:inline-flex mapui:items-center mapui:justify-center mapui:w-5 mapui:shrink-0">
      <span className="mapui:text-slate-400">
        {expanded ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
      </span>
    </span>
  );

  const header = (
    <>
      {/* Col 1: arrow column — only when hasArrowColumn (two-column layout) */}
      {hasArrowColumn && (showArrow ? arrowElement : <span className="mapui:w-5 mapui:shrink-0" />)}
      {/* Col 2: color indicator — or arrow when it's the sole prefix */}
      {showColorBar ? (
        <div
          className="mapui:h-3 mapui:w-5 mapui:rounded-sm mapui:shrink-0"
          style={{ background: segmentedGradient(sortedEntries) }}
        />
      ) : !hasArrowColumn && showArrow ? (
        arrowElement
      ) : (
        <span className="mapui:w-5 mapui:shrink-0" />
      )}
      <span className="mapui:truncate">{label}</span>
    </>
  );
  return (
    <div>
      {showArrow ? (
        <button
          type="button"
          className="mapui:flex mapui:items-center mapui:gap-2 mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-left mapui:text-slate-700 mapui:text-sm mapui:font-medium mapui:min-w-0"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {header}
        </button>
      ) : (
        <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:text-slate-700 mapui:text-sm mapui:font-medium mapui:min-w-0">
          {header}
        </div>
      )}
      {(expanded || showLabelsCollapsed) && (
        <ul className={`mapui:m-0 mapui:mt-1 mapui:list-none mapui:space-y-1 mapui:p-0 mapui:max-h-48 mapui:overflow-y-auto${showArrow ? ' mapui:ml-7' : ''}`}>
          {entries.map((entry, i) => (
            <li
              key={`${entry.label}-${i}`}
              className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
            >
              <Swatch color={entry.color} shape={entry.shape} />
              <span className="mapui:text-slate-700 mapui:truncate mapui:text-xs">
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
  hasArrowColumn,
}: {
  legend: LegendConfig;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  hasArrowColumn?: boolean;
}) {
  const { entries, gradientProperty } = legend;
  const showColorBar = legend.showColorBar !== false;
  const showArrow = legend.showDisclosureArrow !== false;

  const arrowElement = (
    <span className="mapui:inline-flex mapui:items-center mapui:justify-center mapui:w-5 mapui:shrink-0">
      <span className="mapui:text-slate-400">
        {expanded ? <MdOutlineKeyboardArrowDown /> : <MdOutlineKeyboardArrowRight />}
      </span>
    </span>
  );

  const header = (
    <>
      {/* Col 1: arrow column — only when hasArrowColumn */}
      {hasArrowColumn && (showArrow ? arrowElement : <span className="mapui:w-5 mapui:shrink-0" />)}
      {/* Col 2: inline gradient bar (conditional on showColorBar) */}
      {showColorBar ? (
        <div
          className="mapui:h-3 mapui:w-5 mapui:rounded-sm mapui:shrink-0"
          style={{ background: smoothGradient(entries) }}
        />
      ) : !hasArrowColumn && showArrow ? (
        arrowElement
      ) : (
        <span className="mapui:w-5 mapui:shrink-0" />
      )}
      <span className="mapui:truncate">{label}</span>
    </>
  );
  return (
    <div>
      {showArrow ? (
        <button
          type="button"
          className="mapui:flex mapui:items-center mapui:gap-2 mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-left mapui:text-slate-700 mapui:text-sm mapui:font-medium"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {header}
        </button>
      ) : (
        <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:text-slate-700 mapui:text-sm mapui:font-medium">
          {header}
        </div>
      )}
      {expanded && (
        <>
        {gradientProperty && (
          <div className={`mapui:mt-1 mapui:text-xs mapui:font-medium mapui:text-slate-600${showArrow ? ' mapui:ml-7' : ''}`}>
            {gradientProperty}
          </div>
        )}
        <ul className={`mapui:m-0 mapui:mt-1 mapui:list-none mapui:space-y-1 mapui:p-0${showArrow ? ' mapui:ml-7' : ''}`}>
          {entries.map((entry, i) => (
            <li
              key={`${entry.label}-${i}`}
              className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0"
            >
              <Swatch color={entry.color} shape={entry.shape} />
              <span className="mapui:text-slate-700 mapui:truncate mapui:text-xs">
                {entry.label}
              </span>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}

function OpacitySlider({
  layerId,
  opacity,
  onChange,
  hasArrowColumn,
}: {
  layerId: string;
  opacity: number;
  onChange: (layerId: string, opacity: number) => void;
  hasArrowColumn?: boolean;
}) {
  return (
    <div className={`mapui:flex mapui:items-center mapui:gap-1.5 mapui:mt-0.5 ${hasArrowColumn ? 'mapui:ml-14' : 'mapui:ml-7'}`}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={opacity}
        onChange={(e) => onChange(layerId, parseFloat(e.target.value))}
        className="range-sm mapui:w-14"
      />
      <span className="mapui:text-[9px] mapui:text-slate-400 mapui:w-6 mapui:text-right mapui:tabular-nums">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}

export function Legend({ layers, visibleLayerIds, legendOrder, onOpacityChange, className }: LegendProps) {
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
  const unorderedLegendLayers = visibleLayers.filter((l) => l.legend !== undefined);

  // Apply explicit legendOrder (when provided): listed IDs first in order,
  // then any remaining layers in their natural order. Unknown IDs are ignored.
  const legendLayers = (() => {
    if (!legendOrder || legendOrder.length === 0) return unorderedLegendLayers;
    const byId = new Map(unorderedLegendLayers.map((l) => [l.id, l]));
    const ordered: typeof unorderedLegendLayers = [];
    const seen = new Set<string>();
    for (const id of legendOrder) {
      const match = byId.get(id);
      if (match && !seen.has(id)) {
        ordered.push(match);
        seen.add(id);
      }
    }
    for (const l of unorderedLegendLayers) {
      if (!seen.has(l.id)) ordered.push(l);
    }
    return ordered;
  })();

  if (legendLayers.length === 0) {
    return null;
  }

  // True when any legend row needs BOTH an arrow column AND a color indicator column.
  // This triggers the two-column prefix layout for ALL rows so labels align.
  const hasArrowColumn = legendLayers.some((l) => {
    const legend = l.legend!;
    const mode = legend.displayMode ?? 'simple';
    const hasArrow = legend.showDisclosureArrow !== false;
    if (mode === 'gradient') return hasArrow && legend.showColorBar !== false;
    if (mode === 'categorical') return hasArrow && legend.showColorBar !== false;
    return false;
  });

  return (
    <div
      className={`mapui:rounded-lg mapui:bg-white mapui:p-3 mapui:shadow-md mapui:text-sm${className ? ` ${className}` : ''}`}
    >
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:mb-2">
        <h3 className="mapui:m-0 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
          Legend
        </h3>
        {onOpacityChange && (
          <button
            type="button"
            className="mapui:bg-transparent mapui:border-none mapui:p-0 mapui:cursor-pointer mapui:text-slate-400 hover:mapui:text-slate-600 mapui:text-sm"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse legend' : 'Expand legend'}
          >
            {expanded ? <LuMinimize2 /> : <LuMaximize2 />}
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
                  hasArrowColumn={hasArrowColumn}
                />
              ) : mode === 'gradient' ? (
                <GradientLegend
                  legend={legend}
                  label={layer.label}
                  expanded={isEntryExpanded}
                  onToggle={() => toggleExpand(layer.id)}
                  hasArrowColumn={hasArrowColumn}
                />
              ) : (
                <SimpleLegend legend={legend} label={layer.label} hasArrowColumn={hasArrowColumn} />
              )}
              {expanded && onOpacityChange && (
                <OpacitySlider
                  layerId={layer.id}
                  opacity={getLayerOpacity(layer)}
                  onChange={onOpacityChange}
                  hasArrowColumn={hasArrowColumn}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
