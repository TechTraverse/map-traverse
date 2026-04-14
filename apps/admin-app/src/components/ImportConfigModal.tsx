import { useEffect, useRef, useState } from 'react';
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';
import { slugify } from '@ogc-maps/storybook-components';
import type { MapConfig } from '@ogc-maps/storybook-components';

interface ImportConfigModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (newConfigId: string) => void;
  /** Names already in use — used to warn the user if a duplicate is entered. */
  existingNames: string[];
}

type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'parse-error'; message: string }
  | { kind: 'schema-error'; issues: { path: string; message: string }[] }
  | { kind: 'valid' };

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

function validateJson(text: string): ImportStatus {
  if (!text.trim()) return { kind: 'idle' };
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
      issues: result.error.issues.map((i) => ({
        path: humanizePath(i.path),
        message: i.message,
      })),
    };
  }
  return { kind: 'valid' };
}

export function ImportConfigModal({ open, onClose, onImported, existingNames }: ImportConfigModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal is opened.
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setJsonText('');
      setSubmitError(null);
    }
  }, [open]);

  if (!open) return null;

  const status = validateJson(jsonText);
  const normalizedName = slugify(name).toLowerCase();
  const nameInUse = normalizedName.length > 0 && existingNames.includes(normalizedName);
  const nameValid = normalizedName.length > 0 && !nameInUse;
  const canSubmit = nameValid && status.kind === 'valid' && !submitting;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const content = await file.text();
    setJsonText(content);
    // Offer to seed the name from the filename if empty.
    if (!name) {
      const base = file.name.replace(/\.json$/i, '');
      setName(slugify(base).toLowerCase());
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (status.kind !== 'valid' || !nameValid) return;
    let parsed: MapConfig;
    try {
      parsed = JSON.parse(jsonText) as MapConfig;
    } catch (err) {
      setSubmitError(String(err));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: normalizedName,
          description: description || undefined,
          config: parsed,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setSubmitError(`Import failed: ${text}`);
        return;
      }
      const created = (await res.json()) as { id: string };
      onImported(created.id);
    } catch (err) {
      setSubmitError(`Import failed: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/40 mapui:p-4"
      onClick={onClose}
    >
      <div
        className="mapui:bg-white mapui:rounded-lg mapui:shadow-xl mapui:w-full mapui:max-w-3xl mapui:max-h-[90vh] mapui:overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mapui:flex mapui:items-center mapui:justify-between mapui:border-b mapui:border-slate-200 mapui:px-6 mapui:py-4">
          <h2 className="mapui:text-lg mapui:font-semibold mapui:text-slate-900">Import Map Configuration</h2>
          <button
            type="button"
            onClick={onClose}
            className="mapui:text-slate-400 mapui:hover:text-slate-600 mapui:text-xl mapui:leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mapui:px-6 mapui:py-4 mapui:space-y-4">
          <p className="mapui:text-sm mapui:text-slate-600">
            Paste a complete MapConfig JSON document below, or upload a <code>.json</code> file.
            The config will be validated against the schema before import.
          </p>

          <div>
            <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-slate-700 mapui:mb-1">
              Map Name <span className="mapui:text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-'))}
              onBlur={() => setName(name.replace(/^-|-$/g, '').toLowerCase())}
              placeholder="my-imported-map"
              className="mapui:w-full mapui:border mapui:border-slate-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-mono mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
            />
            {nameInUse && (
              <p className="mapui:text-xs mapui:text-red-600 mapui:mt-1">
                A map named &quot;{normalizedName}&quot; already exists — choose a different name.
              </p>
            )}
            {!nameInUse && (
              <p className="mapui:text-xs mapui:text-slate-400 mapui:mt-1">
                Lowercase letters, numbers, and hyphens.
              </p>
            )}
          </div>

          <div>
            <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-slate-700 mapui:mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="mapui:w-full mapui:border mapui:border-slate-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mapui:flex mapui:items-center mapui:justify-between mapui:mb-1">
              <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-slate-700">
                MapConfig JSON <span className="mapui:text-red-500">*</span>
              </label>
              <div className="mapui:flex mapui:gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:border mapui:border-slate-300 mapui:rounded mapui:text-slate-700 mapui:hover:bg-slate-50"
                >
                  Upload File…
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    handleFile(file);
                    e.target.value = '';
                  }}
                  className="mapui:hidden"
                />
                <button
                  type="button"
                  onClick={() => setJsonText('')}
                  disabled={!jsonText}
                  className="mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:border mapui:border-slate-300 mapui:rounded mapui:text-slate-700 mapui:hover:bg-slate-50 mapui:disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              rows={14}
              placeholder='{ "sources": [], "layers": [], "basemaps": [], "ui": { ... }, "initialView": { ... } }'
              className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-slate-900 mapui:text-slate-100 mapui:px-3 mapui:py-2 mapui:text-xs mapui:font-mono mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
            />
          </div>

          {status.kind === 'parse-error' && (
            <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-3">
              <p className="mapui:text-sm mapui:font-medium mapui:text-red-800 mapui:mb-1">Invalid JSON</p>
              <p className="mapui:text-xs mapui:text-red-700 mapui:font-mono">{status.message}</p>
            </div>
          )}

          {status.kind === 'schema-error' && (
            <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-3">
              <p className="mapui:text-sm mapui:font-medium mapui:text-red-800 mapui:mb-2">
                Config does not match MapConfig schema:
              </p>
              <ul className="mapui:list-disc mapui:list-inside mapui:space-y-1 mapui:max-h-40 mapui:overflow-y-auto">
                {status.issues.map((issue, i) => (
                  <li key={i} className="mapui:text-xs mapui:text-red-700">
                    <span className="mapui:font-mono">{issue.path}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.kind === 'valid' && (
            <div className="mapui:rounded mapui:bg-green-50 mapui:border mapui:border-green-200 mapui:p-2">
              <p className="mapui:text-xs mapui:text-green-700">JSON is valid.</p>
            </div>
          )}

          {submitError && (
            <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-3">
              <p className="mapui:text-sm mapui:text-red-700">{submitError}</p>
            </div>
          )}
        </div>

        <div className="mapui:flex mapui:items-center mapui:justify-end mapui:gap-2 mapui:border-t mapui:border-slate-200 mapui:px-6 mapui:py-4">
          <button
            type="button"
            onClick={onClose}
            className="mapui:px-4 mapui:py-2 mapui:border mapui:border-slate-300 mapui:rounded mapui:text-sm mapui:text-slate-700 mapui:hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
          >
            {submitting ? 'Importing…' : 'Import Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
