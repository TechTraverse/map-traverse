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

export interface ExportRequest {
  layer: ExportableLayer;
  format: ExportFormatOption;
  filtered: boolean;
}

export interface ExportModalProps {
  open: boolean;
  layers: ExportableLayer[];
  availableFormats: ExportFormatOption[];
  hasActiveFilter: (layerId: string) => boolean;
  loading?: boolean;
  progress?: string | null;
  error?: string | null;
  onExport: (request: ExportRequest) => void;
  onClose: () => void;
}

export function ExportModal({
  open,
  layers,
  availableFormats,
  hasActiveFilter,
  loading = false,
  progress,
  error,
  onExport,
  onClose,
}: ExportModalProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [applyFilters, setApplyFilters] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedLayerId(layers.length === 1 ? layers[0].id : '');
      setSelectedFormatId(availableFormats.length > 0 ? availableFormats[0].id : '');
      setApplyFilters(true);
    }
  }, [open, layers, availableFormats]);

  if (!open) return null;

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const selectedFormat = availableFormats.find((f) => f.id === selectedFormatId);
  const showFilterToggle = selectedLayer != null && hasActiveFilter(selectedLayer.id);
  const canExport = selectedLayer != null && selectedFormat != null && !loading;

  const handleExport = () => {
    if (!selectedLayer || !selectedFormat) return;
    onExport({
      layer: selectedLayer,
      format: selectedFormat,
      filtered: showFilterToggle ? applyFilters : false,
    });
  };

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="mapui:w-full mapui:max-w-md mapui:rounded-lg mapui:bg-white mapui:p-6 mapui:shadow-xl">
        <h2
          id="export-modal-title"
          className="mapui:m-0 mapui:mb-4 mapui:text-base mapui:font-semibold mapui:text-gray-900"
        >
          Export Data
        </h2>

        {/* Layer select */}
        <div className="mapui:mb-4">
          <label
            htmlFor="export-layer-select"
            className="mapui:mb-1 mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700"
          >
            Layer
          </label>
          {layers.length === 1 ? (
            <div className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-gray-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700">
              {layers[0].label}
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
          </div>
        </fieldset>

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
        {loading && progress && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-blue-600">{progress}</p>
        )}

        {/* Error */}
        {error && (
          <p className="mapui:m-0 mapui:mb-3 mapui:text-sm mapui:text-red-600">{error}</p>
        )}

        {/* Footer */}
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
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
