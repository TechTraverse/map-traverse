import { useState } from 'react';
import type { AvailableProperty } from '../../types';
import { ColorPicker } from '../admin/ColorPicker';
import { getColorFromPalette } from '../../utils/colorPalettes';

export interface DataDrivenColorEditorProps {
  value: unknown[];
  onChange: (expr: unknown[]) => void;
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: (property: string) => Promise<string[]>;
}

type ExprMode = 'match' | 'interpolate';

interface MatchPair {
  value: string;
  color: string;
}

interface InterpolateStop {
  stop: number;
  color: string;
}

function detectMode(expr: unknown[]): ExprMode {
  return expr[0] === 'interpolate' ? 'interpolate' : 'match';
}

function parseMatchExpr(expr: unknown[]): { property: string; pairs: MatchPair[]; fallback: string } {
  // ["match", ["get", prop], val1, color1, ..., fallback]
  const property = Array.isArray(expr[1]) ? (expr[1][1] as string) ?? '' : '';
  const fallback = (expr[expr.length - 1] as string) ?? '#000000';
  const pairs: MatchPair[] = [];
  for (let i = 2; i < expr.length - 1; i += 2) {
    pairs.push({ value: String(expr[i] ?? ''), color: (expr[i + 1] as string) ?? '#000000' });
  }
  return { property, pairs, fallback };
}

function buildMatchExpr(property: string, pairs: MatchPair[], fallback: string): unknown[] {
  const flat: unknown[] = ['match', ['get', property]];
  for (const p of pairs) {
    flat.push(p.value, p.color);
  }
  flat.push(fallback);
  return flat;
}

function parseInterpolateExpr(expr: unknown[]): { property: string; stops: InterpolateStop[] } {
  // ["interpolate", ["linear"], ["get", prop], stop1, color1, ...]
  const property = Array.isArray(expr[2]) ? (expr[2][1] as string) ?? '' : '';
  const stops: InterpolateStop[] = [];
  for (let i = 3; i < expr.length; i += 2) {
    stops.push({ stop: Number(expr[i] ?? 0), color: (expr[i + 1] as string) ?? '#000000' });
  }
  return { property, stops };
}

function buildInterpolateExpr(property: string, stops: InterpolateStop[]): unknown[] {
  const flat: unknown[] = ['interpolate', ['linear'], ['get', property]];
  for (const s of stops) {
    flat.push(s.stop, s.color);
  }
  return flat;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const btnClass =
  'mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50';

const dangerBtnClass =
  'mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50';

export function DataDrivenColorEditor({
  value,
  onChange,
  availableProperties = [],
  onFetchDistinctValues,
}: DataDrivenColorEditorProps) {
  const [mode, setMode] = useState<ExprMode>(() => detectMode(value));
  const [autoPopulating, setAutoPopulating] = useState(false);

  // Match state
  const parsed = parseMatchExpr(value);
  const interpolated = parseInterpolateExpr(value);

  const matchProperty = mode === 'match' ? parsed.property : '';
  const matchPairs = mode === 'match' ? parsed.pairs : [];
  const matchFallback = mode === 'match' ? parsed.fallback : '#000000';

  const interpolateProperty = mode === 'interpolate' ? interpolated.property : '';
  const interpolateStops = mode === 'interpolate' ? interpolated.stops : [];

  const stringProperties = availableProperties.filter(
    (p) => !p.type || p.type === 'string',
  );
  const numericProperties = availableProperties.filter(
    (p) => p.type === 'number' || p.type === 'integer',
  );

  // --- Match handlers ---
  const updateMatch = (
    property: string,
    pairs: MatchPair[],
    fallback: string,
  ) => {
    onChange(buildMatchExpr(property, pairs, fallback));
  };

  const handleMatchPropertyChange = (property: string) => {
    updateMatch(property, matchPairs, matchFallback);
  };

  const handleMatchFallbackChange = (color: string) => {
    updateMatch(matchProperty, matchPairs, color);
  };

  const handleMatchPairValueChange = (index: number, val: string) => {
    const next = matchPairs.map((p, i) => (i === index ? { ...p, value: val } : p));
    updateMatch(matchProperty, next, matchFallback);
  };

  const handleMatchPairColorChange = (index: number, color: string) => {
    const next = matchPairs.map((p, i) => (i === index ? { ...p, color } : p));
    updateMatch(matchProperty, next, matchFallback);
  };

  const handleMatchPairRemove = (index: number) => {
    const next = matchPairs.filter((_, i) => i !== index);
    updateMatch(matchProperty, next, matchFallback);
  };

  const handleMatchPairAdd = () => {
    const next = [...matchPairs, { value: '', color: getColorFromPalette(matchPairs.length) }];
    updateMatch(matchProperty, next, matchFallback);
  };

  const handleAutoPopulate = async () => {
    if (!onFetchDistinctValues || !matchProperty) return;
    setAutoPopulating(true);
    try {
      const values = await onFetchDistinctValues(matchProperty);
      const pairs = values.map((v, i) => ({
        value: v,
        color: getColorFromPalette(i),
      }));
      updateMatch(matchProperty, pairs, matchFallback);
    } finally {
      setAutoPopulating(false);
    }
  };

  // --- Interpolate handlers ---
  const updateInterpolate = (property: string, stops: InterpolateStop[]) => {
    onChange(buildInterpolateExpr(property, stops));
  };

  const handleInterpolatePropertyChange = (property: string) => {
    updateInterpolate(property, interpolateStops);
  };

  const handleInterpolateStopValueChange = (index: number, stop: number) => {
    const next = interpolateStops.map((s, i) => (i === index ? { ...s, stop } : s));
    updateInterpolate(interpolateProperty, next);
  };

  const handleInterpolateStopColorChange = (index: number, color: string) => {
    const next = interpolateStops.map((s, i) => (i === index ? { ...s, color } : s));
    updateInterpolate(interpolateProperty, next);
  };

  const handleInterpolateStopRemove = (index: number) => {
    const next = interpolateStops.filter((_, i) => i !== index);
    updateInterpolate(interpolateProperty, next);
  };

  const handleInterpolateStopAdd = () => {
    const lastStop = interpolateStops[interpolateStops.length - 1]?.stop ?? 0;
    const next = [...interpolateStops, { stop: lastStop + 10, color: getColorFromPalette(interpolateStops.length) }];
    updateInterpolate(interpolateProperty, next);
  };

  // --- Mode switch ---
  const handleModeSwitch = (newMode: ExprMode) => {
    setMode(newMode);
    if (newMode === 'match') {
      onChange(buildMatchExpr('', [], '#000000'));
    } else {
      onChange(buildInterpolateExpr('', []));
    }
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      {/* Mode toggle */}
      <div className="mapui:flex mapui:overflow-hidden mapui:rounded mapui:border mapui:border-gray-300">
        {(['match', 'interpolate'] as ExprMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            className={[
              'mapui:flex-1 mapui:cursor-pointer mapui:border-0 mapui:px-3 mapui:py-1 mapui:text-xs mapui:capitalize mapui:outline-none',
              'focus:mapui:ring-1 focus:mapui:ring-inset focus:mapui:ring-blue-400',
              mode === m
                ? 'mapui:bg-blue-500 mapui:text-white'
                : 'mapui:bg-white mapui:text-gray-700 hover:mapui:bg-gray-50',
            ].join(' ')}
          >
            {m === 'match' ? 'Categorical' : 'Gradient'}
          </button>
        ))}
      </div>

      {mode === 'match' && (
        <>
          {/* Property selector */}
          <select
            value={matchProperty}
            onChange={(e) => handleMatchPropertyChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a property…</option>
            {stringProperties.map((p) => (
              <option key={p.name} value={p.name}>
                {p.title ?? p.name}
              </option>
            ))}
          </select>

          {/* Value → color pairs */}
          {matchPairs.length > 0 && (
            <div className="mapui:flex mapui:flex-col mapui:gap-1">
              {matchPairs.map((pair, i) => (
                <div key={i} className="mapui:flex mapui:items-center mapui:gap-2">
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => handleMatchPairValueChange(i, e.target.value)}
                    placeholder="value"
                    className={`${inputClass} mapui:flex-1`}
                  />
                  <ColorPicker
                    value={pair.color}
                    onChange={(c) => handleMatchPairColorChange(i, c)}
                    label={`Color for "${pair.value}"`}
                  />
                  <button type="button" onClick={() => handleMatchPairRemove(i)} className={dangerBtnClass}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fallback color */}
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <span className="mapui:text-xs mapui:text-gray-500 mapui:shrink-0">Fallback:</span>
            <ColorPicker value={matchFallback} onChange={handleMatchFallbackChange} label="Fallback color" />
          </div>

          {/* Buttons */}
          <div className="mapui:flex mapui:gap-2">
            <button type="button" onClick={handleMatchPairAdd} className={btnClass}>
              + Add value
            </button>
            {onFetchDistinctValues && matchProperty && (
              <button
                type="button"
                onClick={handleAutoPopulate}
                disabled={autoPopulating}
                className={btnClass}
              >
                {autoPopulating ? 'Loading…' : 'Auto-populate'}
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'interpolate' && (
        <>
          {/* Property selector */}
          <select
            value={interpolateProperty}
            onChange={(e) => handleInterpolatePropertyChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a numeric property…</option>
            {numericProperties.map((p) => (
              <option key={p.name} value={p.name}>
                {p.title ?? p.name}
              </option>
            ))}
          </select>

          {/* Stops */}
          {interpolateStops.length > 0 && (
            <div className="mapui:flex mapui:flex-col mapui:gap-1">
              {interpolateStops.map((s, i) => (
                <div key={i} className="mapui:flex mapui:items-center mapui:gap-2">
                  <input
                    type="number"
                    value={s.stop}
                    onChange={(e) => handleInterpolateStopValueChange(i, parseFloat(e.target.value) || 0)}
                    placeholder="stop"
                    className={`${inputClass} mapui:w-24`}
                  />
                  <ColorPicker
                    value={s.color}
                    onChange={(c) => handleInterpolateStopColorChange(i, c)}
                    label={`Color at stop ${s.stop}`}
                  />
                  <button type="button" onClick={() => handleInterpolateStopRemove(i)} className={dangerBtnClass}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={handleInterpolateStopAdd} className={btnClass}>
            + Add stop
          </button>
        </>
      )}
    </div>
  );
}
