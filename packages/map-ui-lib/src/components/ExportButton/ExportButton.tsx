import { useEffect, useRef, useState } from 'react';

export interface ExportableLayer {
  id: string;
  label: string;
  collection: string;
}

export interface ExportButtonProps {
  layers: ExportableLayer[];
  onExport: (layer: ExportableLayer) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  layers,
  onExport,
  loading = false,
  disabled = false,
  className = '',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const upward = rect.bottom > window.innerHeight / 2;
      setOpenUpward(upward);
      const gap = 12;
      setDropdownMaxHeight(upward ? rect.top - gap : window.innerHeight - rect.bottom - gap);
    }
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const isDisabled = disabled || loading || layers.length === 0;

  const buttonClasses = [
    'mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded mapui:border mapui:border-gray-300',
    'mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-gray-700 mapui:transition-colors',
    isDisabled
      ? 'mapui:cursor-not-allowed mapui:opacity-50'
      : 'mapui:cursor-pointer hover:mapui:bg-gray-50 hover:mapui:border-gray-400',
  ].join(' ');

  if (layers.length === 1) {
    return (
      <button
        className={`${buttonClasses} ${className}`.trim()}
        disabled={isDisabled}
        onClick={() => !isDisabled && onExport(layers[0])}
      >
        {loading ? 'Exporting...' : `Export ${layers[0].label}`}
      </button>
    );
  }

  return (
    <div ref={containerRef} className={`mapui:relative mapui:inline-block ${className}`.trim()}>
      <button
        className={buttonClasses}
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? 'Exporting...' : 'Export'}
        {!loading && (
          <span aria-hidden="true" className="mapui:text-gray-400">
            ▾
          </span>
        )}
      </button>
      {open && (
        <ul
          role="listbox"
          className={`mapui:absolute mapui:right-0 mapui:z-10 mapui:min-w-[160px] mapui:overflow-y-auto mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:py-1 mapui:shadow-lg ${openUpward ? 'mapui:bottom-full mapui:mb-1' : 'mapui:top-full mapui:mt-1'}`}
          style={{ maxHeight: dropdownMaxHeight }}
        >
          {layers.map((layer) => (
            <li
              key={layer.id}
              role="option"
              aria-selected={false}
              className="mapui:cursor-pointer mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-gray-700 hover:mapui:bg-gray-100"
              onClick={() => {
                onExport(layer);
                setOpen(false);
              }}
            >
              {layer.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
