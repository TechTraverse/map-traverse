/**
 * Draw / edit a single geometry on a MapLibre map using terra-draw. This is the
 * app-side, framework-bound counterpart to the lib's framework-agnostic
 * `GeometryEditor`: it is injected into that editor's `mapSlot` and stays
 * controlled — `geometry` in, `onChange(geometry)` out.
 *
 * terra-draw lives ONLY in the app (never the lib) per the framework-agnostic
 * rule. It draws simple Point/LineString/Polygon/Rectangle features; the server
 * coerces a drawn single geometry up to the collection's Multi type on write.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import bbox from '@turf/bbox';
import {
  featuresToGeometry,
  geometryToDrawFeatures,
  defaultDrawMode,
  type DrawMode,
} from '../utils/geometryDraw';

const POSITRON = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

type ToolMode = DrawMode | 'rectangle' | 'select';

export interface GeometryDrawMapProps {
  geometry: GeoJSON.Geometry | null;
  onChange: (geometry: GeoJSON.Geometry | null) => void;
  geometryType?: string;
  height?: number;
}

const TOOLS: Array<{ id: ToolMode; label: string }> = [
  { id: 'point', label: 'Point' },
  { id: 'linestring', label: 'Line' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'rectangle', label: 'Box' },
  { id: 'select', label: 'Edit' },
];

/** Stable structural key so we can ignore prop echoes of our own emissions. */
function geomKey(g: GeoJSON.Geometry | null): string {
  return g ? JSON.stringify(g) : '';
}

export function GeometryDrawMap({
  geometry,
  onChange,
  geometryType,
  height = 320,
}: GeometryDrawMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks the last geometry we emitted so the external-sync effect can skip
  // re-seeding the map with a geometry that originated from the map itself.
  const lastEmittedRef = useRef<string>('');
  const seededRef = useRef(false);

  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [ready, setReady] = useState(false);

  const seedGeometry = useCallback((g: GeoJSON.Geometry | null) => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    const features = geometryToDrawFeatures(g, 'editing-feature');
    if (features.length > 0) {
      try {
        // geometryToDrawFeatures only yields Point/LineString/Polygon features
        // (Multi*/GeometryCollection → []) — exactly terra-draw's accepted store
        // geometries; the generic GeoJSON.Feature type is just wider than its
        // GeoJSONStoreFeatures parameter.
        draw.addFeatures(features as unknown as Parameters<typeof draw.addFeatures>[0]);
      } catch {
        // terra-draw rejects geometries it can't represent — leave the map
        // empty and let the user redraw; WKT/coords tabs still hold the value.
      }
    }
  }, []);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: map as unknown as maplibregl.Map }),
      modes: [
        new TerraDrawPointMode(),
        new TerraDrawLineStringMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawRectangleMode(),
        new TerraDrawSelectMode({
          flags: {
            point: { feature: { draggable: true } },
            linestring: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
            polygon: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
          },
        }),
      ],
    });
    draw.start();
    draw.setMode('select');

    const emit = () => {
      const g = featuresToGeometry(draw.getSnapshot() as GeoJSON.Feature[]);
      lastEmittedRef.current = geomKey(g);
      onChangeRef.current(g);
    };
    // A single-geometry editor: when a new feature finishes, drop any earlier
    // one so the store only ever holds the geometry we emit.
    draw.on('finish', () => {
      const snapshot = draw.getSnapshot() as GeoJSON.Feature[];
      if (snapshot.length > 1) {
        const keepId = snapshot[snapshot.length - 1].id;
        draw.removeFeatures(
          snapshot.filter((f) => f.id !== keepId).map((f) => f.id as string),
        );
      }
      emit();
    });
    draw.on('change', (_ids, type) => {
      // 'provisional' fires mid-draw on every vertex; only emit on committed edits.
      if (type === 'finish' || type === 'commit') emit();
    });

    drawRef.current = draw;
    setReady(true);
  }, []);

  // Seed initial geometry once the draw instance is ready.
  useEffect(() => {
    if (!ready || seededRef.current) return;
    seededRef.current = true;
    if (geometry) {
      lastEmittedRef.current = geomKey(geometry);
      seedGeometry(geometry);
      // Fit the map to the seeded geometry.
      try {
        const [minX, minY, maxX, maxY] = bbox(geometry as GeoJSON.Geometry);
        mapRef.current?.fitBounds(
          [
            [minX, minY],
            [maxX, maxY],
          ],
          { padding: 40, duration: 0, maxZoom: 16 },
        );
      } catch {
        /* ignore un-fittable geometry */
      }
    }
  }, [ready, geometry, seedGeometry]);

  // Reflect external geometry changes (WKT / Coordinates tabs) into the map,
  // skipping echoes of geometry the map itself just emitted.
  useEffect(() => {
    if (!ready) return;
    if (geomKey(geometry) === lastEmittedRef.current) return;
    lastEmittedRef.current = geomKey(geometry);
    seedGeometry(geometry);
  }, [ready, geometry, seedGeometry]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      try {
        drawRef.current?.stop();
      } catch {
        /* noop */
      }
      drawRef.current = null;
    };
  }, []);

  const selectTool = (tool: ToolMode) => {
    setActiveTool(tool);
    drawRef.current?.setMode(tool);
  };

  const clearAll = () => {
    drawRef.current?.clear();
    lastEmittedRef.current = '';
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTool(t.id)}
            aria-pressed={activeTool === t.id}
            className={`rounded border px-2 py-1 text-xs font-medium ${
              activeTool === t.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Clear
        </button>
      </div>
      <div className="overflow-hidden rounded border border-slate-200" style={{ height }}>
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={POSITRON}
          initialViewState={{ longitude: -98, latitude: 39, zoom: 3 }}
          onLoad={handleLoad}
          attributionControl={false}
          // The draw default tool reflects the collection's declared type so the
          // toolbar starts sensibly even though we boot in 'select' mode.
          data-default-mode={defaultDrawMode(geometryType)}
        />
      </div>
    </div>
  );
}
