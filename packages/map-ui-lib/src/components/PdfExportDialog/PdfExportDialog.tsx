import { useState, useEffect } from 'react';

export interface PdfExportOptions {
  title: string;
  filename: string;
  includeLegend: boolean;
  includeScaleBar: boolean;
  includeNorthArrow: boolean;
}

export interface PdfExportDialogProps {
  open: boolean;
  defaultTitle?: string;
  defaultFilename?: string;
  loading?: boolean;
  progress?: string | null;
  error?: string | null;
  onExport: (options: PdfExportOptions) => void;
  onClose: () => void;
}

export function PdfExportDialog({
  open,
  defaultTitle = 'Map Export',
  defaultFilename = 'map.pdf',
  loading = false,
  progress,
  error,
  onExport,
  onClose,
}: PdfExportDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [filename, setFilename] = useState(defaultFilename);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeScaleBar, setIncludeScaleBar] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setFilename(defaultFilename);
      setIncludeLegend(true);
      setIncludeScaleBar(true);
      setIncludeNorthArrow(true);
    }
  }, [open, defaultTitle, defaultFilename]);

  if (!open) return null;

  const canExport = title.trim().length > 0 && filename.trim().length > 0 && !loading;

  const handleExport = () => {
    if (!canExport) return;
    // Strip characters that are unsafe in filenames across platforms.
    const sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'map';
    const safeFilename = sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
    onExport({ title: title.trim(), filename: safeFilename, includeLegend, includeScaleBar, includeNorthArrow });
  };

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="mapui:mx-4 mapui:w-full mapui:max-w-md mapui:max-h-[90vh] mapui:overflow-y-auto mapui:rounded-lg mapui:bg-white mapui:p-6 mapui:shadow-xl">
        <h2
          id="pdf-export-title"
          className="mapui:m-0 mapui:mb-4 mapui:text-base mapui:font-semibold mapui:text-gray-900"
        >
          Export Map as PDF
        </h2>

        <div className="mapui:mb-4">
          <label htmlFor="pdf-title" className="mapui:mb-1 mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700">
            Title
          </label>
          <input
            id="pdf-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mapui:w-full mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700 focus:mapui:border-blue-500 focus:mapui:outline-none focus:mapui:ring-1 focus:mapui:ring-blue-500"
            placeholder="Map Export"
          />
        </div>

        <div className="mapui:mb-4">
          <label htmlFor="pdf-filename" className="mapui:mb-1 mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700">
            Filename
          </label>
          <input
            id="pdf-filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="mapui:w-full mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700 focus:mapui:border-blue-500 focus:mapui:outline-none focus:mapui:ring-1 focus:mapui:ring-blue-500"
            placeholder="map.pdf"
          />
        </div>

        <fieldset className="mapui:mb-4">
          <legend className="mapui:mb-1 mapui:text-sm mapui:font-medium mapui:text-gray-700">
            Include
          </legend>
          <div className="mapui:space-y-1">
            <label className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:text-sm mapui:text-gray-700">
              <input
                type="checkbox"
                checked={includeLegend}
                onChange={(e) => setIncludeLegend(e.target.checked)}
                className="mapui:accent-blue-600"
              />
              Legend
            </label>
            <label className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:text-sm mapui:text-gray-700">
              <input
                type="checkbox"
                checked={includeScaleBar}
                onChange={(e) => setIncludeScaleBar(e.target.checked)}
                className="mapui:accent-blue-600"
              />
              Scale bar
            </label>
            <label className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:text-sm mapui:text-gray-700">
              <input
                type="checkbox"
                checked={includeNorthArrow}
                onChange={(e) => setIncludeNorthArrow(e.target.checked)}
                className="mapui:accent-blue-600"
              />
              North arrow
            </label>
          </div>
        </fieldset>

        {loading && progress && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-blue-600">{progress}</p>
        )}

        {error && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-red-600">{error}</p>
        )}

        <div className="mapui:flex mapui:justify-end mapui:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-gray-700 hover:mapui:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className={[
              'mapui:rounded mapui:border mapui:border-transparent mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-white',
              canExport
                ? 'mapui:cursor-pointer mapui:bg-blue-600 hover:mapui:bg-blue-700'
                : 'mapui:cursor-not-allowed mapui:bg-blue-400',
            ].join(' ')}
          >
            {loading ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
