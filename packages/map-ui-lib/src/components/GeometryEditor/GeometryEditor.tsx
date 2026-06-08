import { useEffect, useRef, useState, type ReactNode } from 'react';
import { geojsonGeometryToWkt, wktToGeojsonGeometry } from '../../utils/wkt';
import {
  coordinateListToGeometry,
  geometryToCoordinateList,
  isValidGeometry,
  type SimpleGeometryKind,
} from '../../utils/geometry';

export type GeometryEditorMode = 'draw' | 'wkt' | 'coordinates';

export interface GeometryEditorProps {
  geometry: GeoJSON.Geometry | null;
  onChange: (geometry: GeoJSON.Geometry | null) => void;
  /** Declared collection geometry type, e.g. 'MultiPolygon' (informational / seeds the coordinates kind). */
  geometryType?: string;
  /** Optionally control the active tab. When omitted the tab is managed internally. */
  mode?: GeometryEditorMode;
  onModeChange?: (mode: GeometryEditorMode) => void;
  /** App-injected draw map, rendered in the 'draw' tab. The map is what calls `onChange` while drawing. */
  mapSlot?: ReactNode;
  /** Server / external validation error, surfaced under the editor. */
  error?: string;
  idPrefix?: string;
}

const SIMPLE_KINDS: SimpleGeometryKind[] = ['Point', 'LineString', 'Polygon'];

function isSimpleKind(t: string | undefined): t is SimpleGeometryKind {
  return t === 'Point' || t === 'LineString' || t === 'Polygon';
}

function geometriesEqual(a: GeoJSON.Geometry | null, b: GeoJSON.Geometry | null): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function deriveKind(
  geometry: GeoJSON.Geometry | null,
  geometryType: string | undefined,
): SimpleGeometryKind {
  if (geometry && isSimpleKind(geometry.type)) return geometry.type;
  if (isSimpleKind(geometryType)) return geometryType;
  return 'Point';
}

function deriveRows(geometry: GeoJSON.Geometry | null): Array<[string, string]> {
  const list = geometryToCoordinateList(geometry);
  return list ? list.map((c) => [String(c[0]), String(c[1])] as [string, string]) : [];
}

function rowsToCoords(rows: Array<[string, string]>): number[][] {
  return rows
    .map(([a, b]) => [Number(a), Number(b)])
    .filter(([a, b]) => a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b));
}

const tabBase =
  'mapui:rounded-md mapui:px-3 mapui:py-1 mapui:text-sm mapui:font-medium mapui:cursor-pointer mapui:transition-colors';
const tabActive = 'mapui:bg-white mapui:text-blue-700 mapui:shadow-sm mapui:ring-1 mapui:ring-slate-200';
const tabInactive = 'mapui:text-slate-500 mapui:hover:text-slate-800';
const inputClass =
  'mapui:rounded-md mapui:border mapui:border-slate-300 mapui:px-2.5 mapui:py-1.5 mapui:text-sm mapui:outline-none mapui:transition-colors mapui:focus:border-blue-500 mapui:focus:ring-2 mapui:focus:ring-blue-100';
const ghostBtn =
  'mapui:cursor-pointer mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2.5 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-slate-600 mapui:transition-colors mapui:hover:bg-slate-50 mapui:hover:text-slate-900';

const TABS: Array<{ id: GeometryEditorMode; label: string }> = [
  { id: 'draw', label: 'Draw' },
  { id: 'wkt', label: 'WKT' },
  { id: 'coordinates', label: 'Coordinates' },
];

/**
 * GeometryEditor — a controlled, map-agnostic geometry editor with three tabs:
 * Draw (renders an app-injected `mapSlot`), WKT (a text area backed by
 * {@link wktToGeojsonGeometry}), and Coordinates (a structured `[lng, lat]`
 * list editor for simple Point/LineString/Polygon geometries).
 *
 * Domain geometry is fully controlled via `geometry` / `onChange`. Only
 * UI-local editing state (raw WKT text, in-progress coordinate rows, active
 * tab when uncontrolled) lives inside the component.
 */
export function GeometryEditor({
  geometry,
  onChange,
  geometryType,
  mode,
  onModeChange,
  mapSlot,
  error,
  idPrefix = 'geom',
}: GeometryEditorProps) {
  const [internalMode, setInternalMode] = useState<GeometryEditorMode>(mode ?? 'draw');
  const activeMode = mode ?? internalMode;
  const setMode = (next: GeometryEditorMode) => {
    if (onModeChange) onModeChange(next);
    if (mode === undefined) setInternalMode(next);
  };

  // --- WKT tab state -------------------------------------------------------
  const [wktText, setWktText] = useState<string>(() => geojsonGeometryToWkt(geometry));
  const [wktError, setWktError] = useState<string | null>(null);

  // --- Coordinates tab state ----------------------------------------------
  const [coordKind, setCoordKind] = useState<SimpleGeometryKind>(() =>
    deriveKind(geometry, geometryType),
  );
  const [coordRows, setCoordRows] = useState<Array<[string, string]>>(() => deriveRows(geometry));

  // Resync local editing state when the geometry prop changes from outside
  // (e.g. the user drew on the injected map). Guard against clobbering
  // mid-typing: only resync when the incoming geometry differs from what the
  // current local state already represents.
  const skipWktResync = useRef(false);
  useEffect(() => {
    if (skipWktResync.current) {
      skipWktResync.current = false;
    } else if (!geometriesEqual(wktToGeojsonGeometry(wktText), geometry)) {
      setWktText(geojsonGeometryToWkt(geometry));
      setWktError(null);
    }

    const localCoordGeom = coordinateListToGeometry(rowsToCoords(coordRows), coordKind);
    if (!geometriesEqual(localCoordGeom, geometry)) {
      setCoordRows(deriveRows(geometry));
      setCoordKind(deriveKind(geometry, geometryType));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  const handleWktChange = (text: string) => {
    setWktText(text);
    if (text.trim() === '') {
      setWktError(null);
      skipWktResync.current = true;
      onChange(null);
      return;
    }
    const parsed = wktToGeojsonGeometry(text);
    if (parsed && isValidGeometry(parsed)) {
      setWktError(null);
      skipWktResync.current = true;
      onChange(parsed);
    } else {
      setWktError('Invalid WKT geometry.');
    }
  };

  const emitCoords = (rows: Array<[string, string]>, kind: SimpleGeometryKind) => {
    onChange(coordinateListToGeometry(rowsToCoords(rows), kind));
  };

  const updateRow = (index: number, axis: 0 | 1, value: string) => {
    const next = coordRows.map((row, i) =>
      i === index ? ((axis === 0 ? [value, row[1]] : [row[0], value]) as [string, string]) : row,
    );
    setCoordRows(next);
    emitCoords(next, coordKind);
  };

  const addRow = () => {
    const next: Array<[string, string]> = [...coordRows, ['', '']];
    setCoordRows(next);
    emitCoords(next, coordKind);
  };

  const removeRow = (index: number) => {
    const next = coordRows.filter((_, i) => i !== index);
    setCoordRows(next);
    emitCoords(next, coordKind);
  };

  const changeKind = (kind: SimpleGeometryKind) => {
    setCoordKind(kind);
    emitCoords(coordRows, kind);
  };

  // The coordinates tab can only represent simple types. A non-null geometry
  // that doesn't flatten (MultiPolygon, GeometryCollection, polygon-with-holes)
  // is "unsupported" here.
  const coordsUnsupported = geometry != null && geometryToCoordinateList(geometry) == null;

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      {/* Tabs */}
      <div
        className="mapui:inline-flex mapui:gap-0.5 mapui:self-start mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-slate-50 mapui:p-0.5"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeMode === tab.id}
            onClick={() => setMode(tab.id)}
            className={`${tabBase} ${activeMode === tab.id ? tabActive : tabInactive}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Draw tab */}
      {activeMode === 'draw' && (
        <div>
          {mapSlot ?? (
            <div className="mapui:flex mapui:h-48 mapui:items-center mapui:justify-center mapui:rounded-lg mapui:border mapui:border-dashed mapui:border-slate-300 mapui:bg-slate-50 mapui:text-sm mapui:text-slate-400">
              No draw map available.
            </div>
          )}
        </div>
      )}

      {/* WKT tab */}
      {activeMode === 'wkt' && (
        <div className="mapui:flex mapui:flex-col mapui:gap-1">
          <textarea
            id={`${idPrefix}-wkt`}
            value={wktText}
            onChange={(e) => handleWktChange(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))"
            className={`${inputClass} mapui:font-mono mapui:resize-y`}
            aria-label="WKT geometry"
          />
          {wktError && (
            <p className="mapui:m-0 mapui:text-xs mapui:text-red-600" role="alert">
              {wktError}
            </p>
          )}
        </div>
      )}

      {/* Coordinates tab */}
      {activeMode === 'coordinates' && (
        <div className="mapui:flex mapui:flex-col mapui:gap-2">
          {coordsUnsupported ? (
            <p className="mapui:m-0 mapui:rounded mapui:bg-amber-50 mapui:p-2 mapui:text-xs mapui:text-amber-700">
              This geometry type ({geometry?.type}) can&apos;t be edited as a simple coordinate
              list. Use the WKT or Draw tab instead.
            </p>
          ) : (
            <>
              <div className="mapui:flex mapui:items-center mapui:gap-2">
                <label
                  htmlFor={`${idPrefix}-kind`}
                  className="mapui:text-xs mapui:font-medium mapui:text-slate-700"
                >
                  Type
                </label>
                <select
                  id={`${idPrefix}-kind`}
                  value={coordKind}
                  onChange={(e) => changeKind(e.target.value as SimpleGeometryKind)}
                  className={`${inputClass} mapui:bg-white`}
                >
                  {SIMPLE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mapui:flex mapui:flex-col mapui:gap-1">
                {coordRows.map((row, i) => (
                  <div key={i} className="mapui:flex mapui:items-center mapui:gap-2">
                    <input
                      type="number"
                      value={row[0]}
                      onChange={(e) => updateRow(i, 0, e.target.value)}
                      placeholder="lng"
                      aria-label={`Longitude ${i + 1}`}
                      className={`${inputClass} mapui:w-28`}
                    />
                    <input
                      type="number"
                      value={row[1]}
                      onChange={(e) => updateRow(i, 1, e.target.value)}
                      placeholder="lat"
                      aria-label={`Latitude ${i + 1}`}
                      className={`${inputClass} mapui:w-28`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      aria-label={`Remove coordinate ${i + 1}`}
                      className="mapui:cursor-pointer mapui:rounded-md mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:text-slate-400 mapui:transition-colors mapui:hover:bg-red-50 mapui:hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addRow} className={`mapui:self-start ${ghostBtn}`}>
                + Add coordinate
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mapui:m-0 mapui:text-xs mapui:text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
