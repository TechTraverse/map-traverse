import { useState } from 'react';
import { pushRecentColor, useColorClipboard } from '../../hooks/useColorClipboard';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const iconBtnClass =
  'mapui:flex mapui:h-6 mapui:w-6 mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:text-slate-600 mapui:cursor-pointer hover:mapui:border-blue-400 hover:mapui:text-blue-600 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-40 disabled:hover:mapui:border-slate-300 disabled:hover:mapui:text-slate-600';

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 1H4a1 1 0 0 0-1 1v8h1V2h6V1Zm2 2H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm0 10H6V4h6v9Z"
      />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 2h-1.17A2 2 0 0 0 8 1a2 2 0 0 0-1.83 1H5a1 1 0 0 0-1 1v1H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-1V3a1 1 0 0 0-1-1ZM8 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 3h6v2H5V3Zm-2 2h1v1h8V5h1v9H3V5Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.485 4.515a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414L6.778 9.808l5.293-5.293a1 1 0 0 1 1.414 0Z"
      />
    </svg>
  );
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { copied, recents, copy, paste, clipboard } = useColorClipboard();
  const [justPasted, setJustPasted] = useState(false);

  // We push to recents only on "user finished editing" events (paste,
  // recent-click, copy, blur after using the native picker) — not on
  // every `onChange` tick, which fires continuously while dragging the
  // native color swatch and would spam the strip.
  const commit = (next: string) => {
    onChange(next);
    pushRecentColor(next);
  };

  const handlePaste = () => {
    const c = paste();
    if (!c) return;
    commit(c);
    setJustPasted(true);
    window.setTimeout(() => setJustPasted(false), 1200);
  };

  const handleCopy = () => {
    if (!value) return;
    copy(value);
    pushRecentColor(value);
  };

  const canPaste = clipboard != null;

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (value) pushRecentColor(value);
          }}
          aria-label={label ?? 'Color'}
          className="mapui:h-8 mapui:w-10 mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:p-0.5"
        />
        <span className="mapui:font-mono mapui:text-xs mapui:text-slate-600">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy color'}
          aria-label="Copy color"
          className={iconBtnClass}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button
          type="button"
          onClick={handlePaste}
          disabled={!canPaste}
          title={canPaste ? `Paste ${clipboard}` : 'Nothing to paste'}
          aria-label="Paste color"
          className={iconBtnClass}
        >
          {justPasted ? <CheckIcon /> : <PasteIcon />}
        </button>
      </div>
      {recents.length > 0 && (
        <div
          className="mapui:flex mapui:items-center mapui:gap-1"
          role="group"
          aria-label="Recent colors"
        >
          <span className="mapui:text-[10px] mapui:uppercase mapui:tracking-wide mapui:text-slate-400">
            Recent
          </span>
          {recents.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => commit(c)}
              title={c}
              aria-label={`Use recent color ${c}`}
              style={{ backgroundColor: c }}
              className="mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 hover:mapui:border-blue-500"
            />
          ))}
        </div>
      )}
    </div>
  );
}
