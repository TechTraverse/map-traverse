import { useEffect, useRef, useState } from 'react';
import { safeValidateMapConfig } from '@techtraverse/map-ui-lib/schemas';
import type { MapConfig } from '@techtraverse/map-ui-lib';

interface JsonConfigEditorProps {
  /** Current config. Used to seed the editor and on "Reset". */
  value: MapConfig;
  /** Called with a validated MapConfig when the user clicks "Apply". */
  onApply: (config: MapConfig) => void;
  /** Optional label for the apply button (default: "Apply Changes"). */
  applyLabel?: string;
}

interface ValidationIssue {
  path: string;
  message: string;
}

type ValidationState =
  | { kind: 'idle' }
  | { kind: 'parse-error'; message: string }
  | { kind: 'schema-error'; issues: ValidationIssue[] }
  | { kind: 'valid' };

function formatConfig(config: MapConfig): string {
  return JSON.stringify(config, null, 2);
}

function humanizePath(segments: PropertyKey[]): string {
  if (segments.length === 0) return 'root config';
  return segments
    .map((seg, i) => {
      if (typeof seg === 'number') {
        const parent = segments[i - 1];
        return parent ? `${String(parent)} item ${seg + 1}` : `item ${seg + 1}`;
      }
      if (typeof segments[i + 1] === 'number') return null;
      return typeof seg === 'symbol' ? seg.toString() : seg;
    })
    .filter(Boolean)
    .join(' > ');
}

function validateText(text: string): ValidationState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { kind: 'parse-error', message: err instanceof Error ? err.message : String(err) };
  }
  const result = safeValidateMapConfig(parsed);
  if (!result.success) {
    return {
      kind: 'schema-error',
      issues: result.error.issues.map((issue) => ({
        path: humanizePath(issue.path),
        message: issue.message,
      })),
    };
  }
  return { kind: 'valid' };
}

export function JsonConfigEditor({ value, onApply, applyLabel = 'Apply Changes' }: JsonConfigEditorProps) {
  const [text, setText] = useState(() => formatConfig(value));
  const [seed, setSeed] = useState(() => formatConfig(value));
  const [validation, setValidation] = useState<ValidationState>({ kind: 'valid' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed when the parent config changes AND the user hasn't started editing.
  useEffect(() => {
    const formatted = formatConfig(value);
    if (formatted === seed) return;
    const userIsDirty = text !== seed;
    setSeed(formatted);
    if (!userIsDirty) {
      setText(formatted);
      setValidation({ kind: 'valid' });
    }
  }, [value, text, seed]);

  const handleChange = (next: string) => {
    setText(next);
    setValidation(validateText(next));
  };

  const handleReset = () => {
    setText(seed);
    setValidation({ kind: 'valid' });
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      const pretty = JSON.stringify(parsed, null, 2);
      setText(pretty);
      setValidation(validateText(pretty));
    } catch {
      // If it doesn't parse, leave as-is; validation state will reflect the error.
    }
  };

  const handleLoadFile = async (file: File | null) => {
    if (!file) return;
    const content = await file.text();
    handleChange(content);
  };

  const handleApply = () => {
    const result = validateText(text);
    setValidation(result);
    if (result.kind !== 'valid') return;
    try {
      const parsed = JSON.parse(text) as MapConfig;
      onApply(parsed);
    } catch {
      // validation already caught it
    }
  };

  const dirty = text !== seed;
  const canApply = dirty && validation.kind === 'valid';

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-2">
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          <span className="mapui:text-sm mapui:font-medium mapui:text-slate-700">JSON Editor</span>
          {dirty && (
            <span className="mapui:rounded mapui:bg-amber-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-amber-800">
              unsaved changes
            </span>
          )}
        </div>
        <div className="mapui:flex mapui:gap-2">
          <button
            type="button"
            onClick={handleFormat}
            className="mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:border mapui:border-slate-300 mapui:rounded mapui:text-slate-700 mapui:hover:bg-slate-50"
          >
            Format
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:border mapui:border-slate-300 mapui:rounded mapui:text-slate-700 mapui:hover:bg-slate-50"
          >
            Load File…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleLoadFile(file);
              e.target.value = '';
            }}
            className="mapui:hidden"
          />
          <button
            type="button"
            onClick={handleReset}
            disabled={!dirty}
            className="mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:border mapui:border-slate-300 mapui:rounded mapui:text-slate-700 mapui:hover:bg-slate-50 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        rows={20}
        className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-slate-900 mapui:text-slate-100 mapui:px-3 mapui:py-2 mapui:text-xs mapui:font-mono mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
        placeholder="Paste a MapConfig JSON document here…"
      />

      {validation.kind === 'parse-error' && (
        <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-3">
          <p className="mapui:text-sm mapui:font-medium mapui:text-red-800 mapui:mb-1">Invalid JSON</p>
          <p className="mapui:text-xs mapui:text-red-700 mapui:font-mono">{validation.message}</p>
        </div>
      )}

      {validation.kind === 'schema-error' && (
        <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-3">
          <p className="mapui:text-sm mapui:font-medium mapui:text-red-800 mapui:mb-2">
            Config does not match MapConfig schema:
          </p>
          <ul className="mapui:list-disc mapui:list-inside mapui:space-y-1 mapui:max-h-40 mapui:overflow-y-auto">
            {validation.issues.map((issue, i) => (
              <li key={i} className="mapui:text-xs mapui:text-red-700">
                <span className="mapui:font-mono">{issue.path}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.kind === 'valid' && dirty && (
        <div className="mapui:rounded mapui:bg-green-50 mapui:border mapui:border-green-200 mapui:p-2">
          <p className="mapui:text-xs mapui:text-green-700">JSON is valid — click &quot;{applyLabel}&quot; to apply.</p>
        </div>
      )}

      <div className="mapui:flex mapui:justify-end">
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}
