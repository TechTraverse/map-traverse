import { useState, useRef, useEffect } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { buildBoxDrawData } from '@ogc-maps/storybook-components';

export interface UseBoxDrawOptions {
  mapRef: React.RefObject<MapRef | null>;
  enabled: boolean;
  /** MapLibre layer IDs to query for features */
  queryLayerIds: string[];
  onComplete: (features: Array<{ id?: string | number; properties: Record<string, unknown>; geometry: Record<string, unknown> }>) => void;
}

export interface UseBoxDrawResult {
  boxDrawData: GeoJSON.Feature | null;
  drawing: boolean;
}

export function useBoxDraw({ mapRef, enabled, queryLayerIds, onComplete }: UseBoxDrawOptions): UseBoxDrawResult {
  const [boxDrawData, setBoxDrawData] = useState<GeoJSON.Feature | null>(null);
  const drawing = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Keep refs up to date for event handlers
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const queryLayerIdsRef = useRef(queryLayerIds);
  queryLayerIdsRef.current = queryLayerIds;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !enabled) {
      setBoxDrawData(null);
      drawing.current = false;
      setIsDrawing(false);
      return;
    }

    const canvas = map.getCanvasContainer();

    const onMouseDown = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      // Only left mouse button
      if (e.button !== 0) return;
      e.preventDefault();
      drawing.current = true;
      setIsDrawing(true);
      startPoint.current = { x: e.clientX, y: e.clientY };
      map.dragPan.disable();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drawing.current || !startPoint.current) return;
      const rect = canvas.getBoundingClientRect();
      const start = map.unproject([
        startPoint.current.x - rect.left,
        startPoint.current.y - rect.top,
      ]);
      const end = map.unproject([
        e.clientX - rect.left,
        e.clientY - rect.top,
      ]);
      setBoxDrawData(buildBoxDrawData(
        [start.lng, start.lat],
        [end.lng, end.lat],
      ));
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!drawing.current || !startPoint.current) return;
      drawing.current = false;
      setIsDrawing(false);
      map.dragPan.enable();

      const rect = canvas.getBoundingClientRect();
      const startPixel: [number, number] = [
        startPoint.current.x - rect.left,
        startPoint.current.y - rect.top,
      ];
      const endPixel: [number, number] = [
        e.clientX - rect.left,
        e.clientY - rect.top,
      ];

      // Only query if the box has some size
      const dx = Math.abs(endPixel[0] - startPixel[0]);
      const dy = Math.abs(endPixel[1] - startPixel[1]);
      if (dx < 5 && dy < 5) {
        setBoxDrawData(null);
        startPoint.current = null;
        return;
      }

      const bbox: [[number, number], [number, number]] = [
        [Math.min(startPixel[0], endPixel[0]), Math.min(startPixel[1], endPixel[1])],
        [Math.max(startPixel[0], endPixel[0]), Math.max(startPixel[1], endPixel[1])],
      ];

      const layerIds = queryLayerIdsRef.current;
      const queryOpts = layerIds.length > 0 ? { layers: layerIds } : undefined;
      const features = map.queryRenderedFeatures(bbox, queryOpts);

      const results = features.map((f) => ({
        id: f.id,
        properties: (f.properties ?? {}) as Record<string, unknown>,
        geometry: (f.geometry ?? {}) as unknown as Record<string, unknown>,
      }));

      onCompleteRef.current(results);

      setBoxDrawData(null);
      startPoint.current = null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (drawing.current) {
        map.dragPan.enable();
        drawing.current = false;
        setIsDrawing(false);
      }
      setBoxDrawData(null);
    };
  }, [mapRef, enabled]);

  return { boxDrawData, drawing: isDrawing };
}
