import { useState, useEffect } from 'react';

export interface ExportableLayer {
  id: string;
  label: string;
  collection: string;
}

export interface ExportFormatOption {
  id: string;
  label: string;
  extension: string;
  description?: string;
}

export type ExportMode = 'all' | 'selected';

export interface ExportRequest {
  layer: ExportableLayer;
  format: ExportFormatOption;
  filtered: boolean;
  mode: ExportMode;
}

export interface PdfExportOptions {
  title: string;
  filename: string;
  includeLegend: boolean;
  includeScaleBar: boolean;
  includeNorthArrow: boolean;
}

const PDF_FORMAT_ID = '__pdf__';

export interface ExportModalProps {
  open: boolean;
  layers: ExportableLayer[];
  availableFormats: ExportFormatOption[];
  hasActiveFilter: (layerId: string) => boolean;
  /** Number of currently-selected features. When > 0, the "Selected only" mode becomes available. */
  selectionCount?: number;
  /** If provided, the modal preselects and locks onto this layer id for "Selected only" exports. */
  selectionLayerId?: string | null;
  loading?: boolean;
  progress?: string | null;
  error?: string | null;
  onExport: (request: ExportRequest) => void;
  onClose: () => void;
  /** When true, a "PDF — Map snapshot" option appears in the format list. */
  pdfAvailable?: boolean;
  onPdfExport?: (options: PdfExportOptions) => void;
  pdfLoading?: boolean;
  pdfProgress?: string | null;
  pdfError?: string | null;
}

export function ExportModal({
  open,
  layers,
  availableFormats,
  hasActiveFilter,
  selectionCount = 0,
  selectionLayerId = null,
  loading = false,
  progress,
  error,
  onExport,
  onClose,
  pdfAvailable = false,
  onPdfExport,
  pdfLoading = false,
  pdfProgress,
  pdfError,
}: ExportModalProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [applyFilters, setApplyFilters] = useState(true);
  const [exportMode, setExportMode] = useState<ExportMode>('all');

  // PDF-specific state
  const [pdfTitle, setPdfTitle] = useState('Map Export');
  const [pdfFilename, setPdfFilename] = useState('map.pdf');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeScaleBar, setIncludeScaleBar] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);

  const isPdf = selectedFormatId === PDF_FORMAT_ID;
  const hasSelection = selectionCount > 0;

  const isLoading = isPdf ? pdfLoading : loading;
  const activeProgress = isPdf ? pdfProgress : progress;
  const activeError = isPdf ? pdfError : error;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      const initialMode: ExportMode = hasSelection ? 'selected' : 'all';
      setExportMode(initialMode);
      const initialLayerId =
        initialMode === 'selected' && selectionLayerId
          ? selectionLayerId
          : layers.length === 1
            ? layers[0].id
            : '';
      setSelectedLayerId(initialLayerId);
      setSelectedFormatId(availableFormats.length > 0 ? availableFormats[0].id : '');
      setApplyFilters(true);
      setPdfTitle('Map Export');
      setPdfFilename('map.pdf');
      setIncludeLegend(true);
      setIncludeScaleBar(true);
      setIncludeNorthArrow(true);
    }
  }, [open, layers, availableFormats, hasSelection, selectionLayerId]);

  if (!open) return null;

  const effectiveLayerId =
    exportMode === 'selected' && selectionLayerId ? selectionLayerId : selectedLayerId;
  const selectedLayer = layers.find((l) => l.id === effectiveLayerId);
  const selectedFormat = availableFormats.find((f) => f.id === selectedFormatId);
  const showFilterToggle =
    !isPdf && exportMode === 'all' && selectedLayer != null && hasActiveFilter(selectedLayer.id);
  const canExportData = selectedLayer != null && selectedFormat != null && !isLoading;
  const canExportPdf = isPdf && pdfTitle.trim().length > 0 && pdfFilename.trim().length > 0 && !isLoading;
  const canExport = isPdf ? canExportPdf : canExportData;
  const layerLocked = exportMode === 'selected' && selectionLayerId != null;

  const handleExport = () => {
    if (isPdf) {
      if (!onPdfExport || !canExportPdf) return;
      const sanitized = pdfFilename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'map';
      const safeFilename = sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
      onPdfExport({
        title: pdfTitle.trim(),
        filename: safeFilename,
        includeLegend,
        includeScaleBar,
        includeNorthArrow,
      });
      return;
    }
    if (!selectedLayer || !selectedFormat) return;
    onExport({
      layer: selectedLayer,
      format: selectedFormat,
      filtered: showFilterToggle ? applyFilters : false,
      mode: exportMode,
    });
  };

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="mapui:mx-4 mapui:w-full mapui:max-w-md mapui:max-h-[90vh] mapui:overflow-y-auto mapui:rounded-lg mapui:bg-white mapui:p-6 mapui:shadow-xl">
        <h2
          id="export-modal-title"
          className="mapui:m-0 mapui:mb-4 mapui:text-base mapui:font-semibold mapui:text-gray-900"
        >
          Export Data
        </h2>

        {/* Export mode toggle — only shown when there is an active selection and not PDF */}
        {hasSelection && !isPdf && (
          <fieldset className="mapui:mb-4">
            <legend className="mapui:mb-1 mapui:text-sm mapui:font-medium mapui:text-gray-700">
              Source
            </legend>
            <div
              role="radiogroup"
              className="mapui:inline-flex mapui:rounded-md mapui:border mapui:border-gray-300 mapui:text-sm mapui:overflow-hidden"
            >
              <button
                type="button"
                role="radio"
                aria-checked={exportMode === 'all'}
                onClick={() => setExportMode('all')}
                className={[
                  'mapui:cursor-pointer mapui:px-3 mapui:py-1.5',
                  exportMode === 'all'
                    ? 'mapui:bg-blue-600 mapui:text-white'
                    : 'mapui:bg-white mapui:text-gray-700 hover:mapui:bg-gray-50',
                ].join(' ')}
              >
                All (filtered)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={exportMode === 'selected'}
                onClick={() => setExportMode('selected')}
                className={[
                  'mapui:cursor-pointer mapui:px-3 mapui:py-1.5 mapui:border-l mapui:border-gray-300',
                  exportMode === 'selected'
                    ? 'mapui:bg-blue-600 mapui:text-white'
                    : 'mapui:bg-white mapui:text-gray-700 hover:mapui:bg-gray-50',
                ].join(' ')}
              >
                Selected only ({selectionCount})
              </button>
            </div>
          </fieldset>
        )}

        {/* Layer select — hidden when PDF is selected */}
        {!isPdf && (
          <div className="mapui:mb-4">
            <label
              htmlFor="export-layer-select"
              className="mapui:mb-1 mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700"
            >
              Layer
            </label>
            {layerLocked || layers.length === 1 ? (
              <div className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-gray-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700">
                {selectedLayer?.label ?? layers[0]?.label ?? '—'}
              </div>
            ) : (
              <select
                id="export-layer-select"
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="mapui:w-full mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700"
              >
                <option value="" disabled>
                  Select a layer...
                </option>
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Format select (radio group) */}
        <fieldset className="mapui:mb-4">
          <legend className="mapui:mb-1 mapui:text-sm mapui:font-medium mapui:text-gray-700">
            Format
          </legend>
          <div className="mapui:space-y-1">
            {availableFormats.map((format) => (
              <label
                key={format.id}
                className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:rounded mapui:px-2 mapui:py-1.5 hover:mapui:bg-gray-50"
              >
                <input
                  type="radio"
                  name="export-format"
                  value={format.id}
                  checked={selectedFormatId === format.id}
                  onChange={() => setSelectedFormatId(format.id)}
                  className="mapui:accent-blue-600"
                />
                <span className="mapui:text-sm mapui:text-gray-700">
                  {format.label}
                  {format.description && (
                    <span className="mapui:ml-1 mapui:text-gray-400">— {format.description}</span>
                  )}
                </span>
              </label>
            ))}
            {pdfAvailable && (
              <>
                <div className="mapui:my-1 mapui:border-t mapui:border-gray-200" />
                <label className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:rounded mapui:px-2 mapui:py-1.5 hover:mapui:bg-gray-50">
                  <input
                    type="radio"
                    name="export-format"
                    value={PDF_FORMAT_ID}
                    checked={isPdf}
                    onChange={() => setSelectedFormatId(PDF_FORMAT_ID)}
                    className="mapui:accent-blue-600"
                  />
                  <span className="mapui:text-sm mapui:text-gray-700">
                    PDF
                    <span className="mapui:ml-1 mapui:text-gray-400">— Map snapshot</span>
                  </span>
                </label>
              </>
            )}
          </div>
        </fieldset>

        {/* PDF-specific fields */}
        {isPdf && (
          <>
            <div className="mapui:mb-4">
              <label htmlFor="pdf-title" className="mapui:mb-1 mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700">
                Title
              </label>
              <input
                id="pdf-title"
                type="text"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
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
                value={pdfFilename}
                onChange={(e) => setPdfFilename(e.target.value)}
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
          </>
        )}

        {/* Apply filters checkbox */}
        {showFilterToggle && (
          <label className="mapui:mb-4 mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-2">
            <input
              type="checkbox"
              checked={applyFilters}
              onChange={(e) => setApplyFilters(e.target.checked)}
              className="mapui:accent-blue-600"
            />
            <span className="mapui:text-sm mapui:text-gray-700">Apply current filters</span>
          </label>
        )}

        {/* Progress */}
        {isLoading && activeProgress && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-blue-600">{activeProgress}</p>
        )}

        {/* Error */}
        {activeError && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-red-600">{activeError}</p>
        )}

        {/* Footer */}
        <div className="mapui:flex mapui:justify-end mapui:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
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
            {isLoading ? 'Exporting...' : isPdf ? 'Export PDF' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
