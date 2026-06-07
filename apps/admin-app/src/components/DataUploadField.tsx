import { useRef, useState } from 'react';
import {
  uploadDataset,
  DataApiError,
  type UploadOptions,
  type UploadResult,
  type LayerInfo,
} from '../utils/dataApi';

export interface DataUploadFieldProps {
  /** Called after a successful ingest so the parent can refresh its list. */
  onUploaded: (result: UploadResult) => void;
}

const FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'geojson', label: 'GeoJSON (.geojson)' },
  { value: 'csv', label: 'CSV with WKT (.csv)' },
  { value: 'kml', label: 'KML (.kml)' },
  { value: 'shp-zip', label: 'Shapefile (.zip)' },
  { value: 'fgb', label: 'FlatGeobuf (.fgb)' },
  { value: 'gpkg', label: 'GeoPackage (.gpkg)' },
];

const EXT_TO_FORMAT: Record<string, string> = {
  geojson: 'geojson', json: 'geojson', csv: 'csv', kml: 'kml', zip: 'shp-zip', fgb: 'fgb', gpkg: 'gpkg',
};

/** Best-effort format guess from a filename extension. */
export function detectFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_FORMAT[ext] ?? 'auto';
}

const btnPrimary =
  'mapui:rounded mapui:bg-blue-600 mapui:px-4 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-white mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed';
const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500';

export function DataUploadField({ onUploaded }: DataUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState('auto');
  const [label, setLabel] = useState('');
  const [srs, setSrs] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerInfo[] | null>(null);
  const [layer, setLayer] = useState('');
  const [isConflict, setIsConflict] = useState(false);

  const reset = () => {
    setFile(null); setFormat('auto'); setLabel(''); setSrs('');
    setProgress(null); setError(null); setLayers(null); setLayer(''); setIsConflict(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = (f: File) => {
    setFile(f);
    setFormat(detectFormat(f.name));
    setError(null);
    setLayers(null);
    setLayer('');
    setIsConflict(false);
  };

  // CSV has no embedded CRS; offer an SRS override there.
  const showSrs = format === 'csv' || format === 'shp-zip';

  const submit = async (replace = false) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    const opts: UploadOptions = {
      format: format === 'auto' ? undefined : format,
      label: label || undefined,
      srs: srs || undefined,
      layer: layer || undefined,
      replace,
    };
    try {
      const result = await uploadDataset(file, opts, setProgress);
      reset();
      onUploaded(result);
    } catch (err) {
      setProgress(null);
      if (err instanceof DataApiError && err.body.needsLayer) {
        setLayers((err.body.layers as LayerInfo[]) ?? []);
        setError('This file has multiple layers — choose one to import.');
      } else if (err instanceof DataApiError && err.status === 409) {
        // Leave the file selected so the button becomes "Replace existing".
        setIsConflict(true);
        setError(`${err.message}. Upload again to replace it.`);
        setLayers(null);
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  };

  const uploading = progress !== null;

  return (
    <div className="mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pick(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          'mapui:cursor-pointer mapui:rounded-lg mapui:border-2 mapui:border-dashed mapui:p-6 mapui:text-center mapui:text-sm',
          dragOver ? 'mapui:border-blue-400 mapui:bg-blue-50' : 'mapui:border-slate-300 mapui:bg-slate-50',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".geojson,.json,.csv,.kml,.zip,.fgb,.gpkg"
          className="mapui:hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />
        {file ? (
          <span className="mapui:font-medium mapui:text-slate-700">{file.name}</span>
        ) : (
          <span className="mapui:text-slate-500">
            Drag a GIS file here, or click to browse (GeoJSON, CSV, KML, Shapefile .zip, FlatGeobuf, GeoPackage)
          </span>
        )}
      </div>

      {file && (
        <div className="mapui:mt-4 mapui:flex mapui:flex-col mapui:gap-3">
          <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
            <label className="mapui:flex mapui:flex-col mapui:gap-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
              Name
              <input
                className={inputClass}
                value={label}
                placeholder="Defaults to the file name"
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <label className="mapui:flex mapui:flex-col mapui:gap-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
              Format
              <select className={inputClass} value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          {showSrs && (
            <label className="mapui:flex mapui:flex-col mapui:gap-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
              Source CRS (optional — used when the file has none, e.g. EPSG:2232)
              <input
                className={inputClass}
                value={srs}
                placeholder="EPSG:4326"
                onChange={(e) => setSrs(e.target.value)}
              />
            </label>
          )}

          {layers && layers.length > 0 && (
            <label className="mapui:flex mapui:flex-col mapui:gap-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
              Layer to import
              <select className={inputClass} value={layer} onChange={(e) => setLayer(e.target.value)}>
                <option value="">Select a layer…</option>
                {layers.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}{l.geometryType ? ` (${l.geometryType})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {uploading && (
            <div className="mapui:h-2 mapui:w-full mapui:overflow-hidden mapui:rounded mapui:bg-slate-200">
              <div
                className="mapui:h-full mapui:bg-blue-600 mapui:transition-all"
                style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
              />
            </div>
          )}

          {error && (
            <p className="mapui:m-0 mapui:rounded mapui:bg-amber-50 mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-amber-800">
              {error}
            </p>
          )}

          <div className="mapui:flex mapui:justify-end mapui:gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={uploading}
              className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-4 mapui:py-2 mapui:text-sm mapui:text-slate-700 mapui:hover:bg-slate-50 mapui:disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit(isConflict)}
              disabled={uploading || (layers != null && layers.length > 0 && !layer)}
              className={btnPrimary}
            >
              {uploading ? 'Uploading…' : isConflict ? 'Replace existing' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
