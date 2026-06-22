import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { polygon as turfPolygon, point as turfPoint } from '@turf/helpers';
import {
  buildMeasureGeometryData,
  buildMeasurePointsData,
} from '@techtraverse/map-ui-lib';

export interface UsePolygonDrawOptions {
  mapRef: React.RefObject<MapRef | null>;
  enabled: boolean;
  /** MapLibre layer IDs to query for features */
  queryLayerIds: string[];
  onComplete: (
    features: Array<{
      id?: string | number;
      properties: Record<string, unknown>;
      geometry: Record<string, unknown>;
    }>,
  ) => void;
}

export interface UsePolygonDrawResult {
  polygonDrawData: GeoJSON.Feature | null;
  polygonDrawPointsData: GeoJSON.FeatureCollection | null;
  addPoint: (point: [number, number]) => void;
  complete: () => void;
  reset: () => void;
}

export function usePolygonDraw({
  mapRef,
  enabled,
  queryLayerIds,
  onComplete,
}: UsePolygonDrawOptions): UsePolygonDrawResult {
  const [points, setPoints] = useState<[number, number][]>([]);

  // Keep refs so complete() can read current values without re-creating the callback
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const queryLayerIdsRef = useRef(queryLayerIds);
  queryLayerIdsRef.current = queryLayerIds;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const polygonDrawData = useMemo(() => buildMeasureGeometryData('area', points), [points]);
  const polygonDrawPointsData = useMemo(() => buildMeasurePointsData(points), [points]);

  const addPoint = useCallback((point: [number, number]) => {
    setPoints((prev) => [...prev, point]);
  }, []);

  const reset = useCallback(() => {
    setPoints([]);
  }, []);

  const complete = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Remove the duplicate last point added by the double-click
    const currentPoints = pointsRef.current;
    const pts = currentPoints.length > 3
      ? currentPoints.slice(0, -1)
      : currentPoints;

    if (pts.length < 3) {
      setPoints([]);
      return;
    }

    const closed: [number, number][] = [...pts, pts[0]];
    const selectionPolygon = turfPolygon([closed]);

    // Compute pixel bounding box of the polygon
    const projected = pts.map((p) => map.project(p as [number, number]));
    const xs = projected.map((p) => p.x);
    const ys = projected.map((p) => p.y);
    const pixelBbox: [[number, number], [number, number]] = [
      [Math.min(...xs), Math.min(...ys)],
      [Math.max(...xs), Math.max(...ys)],
    ];

    const layerIds = queryLayerIdsRef.current;
    const queryOpts = layerIds.length > 0 ? { layers: layerIds } : undefined;
    const candidates = map.queryRenderedFeatures(pixelBbox, queryOpts);

    // Filter to features actually inside the polygon
    const filtered = candidates.filter((f) => {
      try {
        const geom = f.geometry;
        if (!geom) return false;

        if (geom.type === 'Point') {
          return booleanPointInPolygon(
            turfPoint(geom.coordinates as [number, number]),
            selectionPolygon,
          );
        }

        if (geom.type === 'MultiPoint') {
          return (geom.coordinates as [number, number][]).some((coord) =>
            booleanPointInPolygon(turfPoint(coord), selectionPolygon),
          );
        }

        return booleanIntersects(f as GeoJSON.Feature, selectionPolygon);
      } catch {
        return false;
      }
    });

    const results = filtered.map((f) => ({
      id: f.id as string | number | undefined,
      properties: (f.properties ?? {}) as Record<string, unknown>,
      geometry: (f.geometry ?? {}) as unknown as Record<string, unknown>,
    }));

    onCompleteRef.current(results);
    setPoints([]);
  }, [mapRef]);

  useEffect(() => {
    if (!enabled) {
      setPoints([]);
    }
  }, [enabled]);

  return {
    polygonDrawData,
    polygonDrawPointsData,
    addPoint,
    complete,
    reset,
  };
}
