import { useEffect, useRef } from 'react';
import { useMapStore } from '../stores/mapStore';
import { useMapUrlState } from './useMapUrlState';

/**
 * Bidirectional sync between Zustand stores and URL parameters.
 *
 * - On mount: URL params override store values (if present)
 * - On store change: Write updates to URL
 * - Viewport changes: debounced, replace history
 * - Layer/basemap changes: immediate, push history
 */
export function useMapSync() {
  const { viewportState, setViewportState, layerState, setLayerState } =
    useMapUrlState();

  const viewState = useMapStore((s) => s.viewState);
  const layers = useMapStore((s) => s.layers);
  const activeBasemapId = useMapStore((s) => s.activeBasemapId);
  const activeFilters = useMapStore((s) => s.activeFilters);

  const setViewState = useMapStore((s) => s.setViewState);
  const setLayerVisibility = useMapStore((s) => s.setLayerVisibility);
  const setActiveBasemap = useMapStore((s) => s.setActiveBasemap);
  const setLayerFilters = useMapStore((s) => s.setLayerFilters);

  // Prevent infinite loops when syncing from URL → store
  // Start as true to guard all effects during initial mount/hydration
  const isSyncingFromUrl = useRef(true);

  // Track previous values to detect changes
  const prevViewStateRef = useRef(viewState);
  const prevLayersRef = useRef(layers);
  const prevBasemapRef = useRef(activeBasemapId);
  const prevFiltersRef = useRef(activeFilters);

  // On mount: URL → Zustand (URL wins if params present)
  useEffect(() => {
    // Sync viewport
    const { lat, lng, zoom, pitch, bearing } = viewportState;
    if (lat !== null || lng !== null || zoom !== null || pitch !== null || bearing !== null) {
      setViewState({
        ...(lat !== null && { latitude: lat }),
        ...(lng !== null && { longitude: lng }),
        ...(zoom !== null && { zoom }),
        ...(pitch !== null && { pitch }),
        ...(bearing !== null && { bearing }),
      });
    }

    // Sync layers
    if (layerState.layers) {
      const urlLayerIds = new Set(layerState.layers);
      layers.forEach((layer) => {
        const shouldBeVisible = urlLayerIds.has(layer.id);
        if (layer.visible !== shouldBeVisible) {
          setLayerVisibility(layer.id, shouldBeVisible);
        }
      });
    }

    // Sync basemap
    if (layerState.basemap) {
      setActiveBasemap(layerState.basemap);
    }

    // Sync filters
    if (layerState.filters) {
      Object.entries(layerState.filters).forEach(([layerId, filters]) => {
        if (filters) {
          setLayerFilters(layerId, filters);
        }
      });
    }

    // Update prev refs to reflect the current state after URL sync
    prevLayersRef.current = useMapStore.getState().layers;
    prevBasemapRef.current = useMapStore.getState().activeBasemapId;
    prevFiltersRef.current = useMapStore.getState().activeFilters;
    prevViewStateRef.current = useMapStore.getState().viewState;

    // Release guard after browser has processed all pending renders
    // (including StrictMode double-mounts)
    requestAnimationFrame(() => {
      isSyncingFromUrl.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Zustand → URL (store changes write to URL)
  useEffect(() => {
    if (isSyncingFromUrl.current) return;

    const prev = prevViewStateRef.current;
    const hasChanged =
      viewState.latitude !== prev.latitude ||
      viewState.longitude !== prev.longitude ||
      viewState.zoom !== prev.zoom ||
      viewState.pitch !== prev.pitch ||
      viewState.bearing !== prev.bearing;

    if (hasChanged) {
      setViewportState({
        lat: viewState.latitude,
        lng: viewState.longitude,
        zoom: viewState.zoom,
        pitch: viewState.pitch,
        bearing: viewState.bearing,
      });
      prevViewStateRef.current = viewState;
    }
  }, [viewState, setViewportState]);

  // Sync layer visibility changes
  useEffect(() => {
    if (isSyncingFromUrl.current) return;

    const visibleLayerIds = layers.filter((l) => l.visible).map((l) => l.id);
    const prev = prevLayersRef.current.filter((l) => l.visible).map((l) => l.id);

    // Compare arrays
    const hasChanged =
      visibleLayerIds.length !== prev.length ||
      visibleLayerIds.some((id, i) => id !== prev[i]);

    if (hasChanged) {
      setLayerState({
        layers: visibleLayerIds.length > 0 ? visibleLayerIds : null,
      });
      prevLayersRef.current = layers;
    }
  }, [layers, setLayerState]);

  // Sync basemap changes
  useEffect(() => {
    if (isSyncingFromUrl.current) return;

    if (activeBasemapId !== prevBasemapRef.current) {
      setLayerState({
        basemap: activeBasemapId || null,
      });
      prevBasemapRef.current = activeBasemapId;
    }
  }, [activeBasemapId, setLayerState]);

  // Sync filter changes
  useEffect(() => {
    if (isSyncingFromUrl.current) return;

    // We only want to push to history if filters actually changed
    // Simple deep equality check or JSON stringify comp could work for light usage
    const filtersJson = JSON.stringify(activeFilters);
    const prevFiltersJson = JSON.stringify(prevFiltersRef.current);

    if (filtersJson !== prevFiltersJson) {
      // Filter out empty objects
      const cleanedFilters: Record<string, Record<string, string | number>> = {};
      for (const [layerId, filters] of Object.entries(activeFilters)) {
        const clean = Object.entries(filters).reduce((acc, [k, v]) => {
          if (v !== undefined && v !== '') acc[k] = v;
          return acc;
        }, {} as Record<string, string | number>);

        if (Object.keys(clean).length > 0) {
          cleanedFilters[layerId] = clean;
        }
      }

      setLayerState({
        filters: Object.keys(cleanedFilters).length > 0 ? cleanedFilters : null
      });
      prevFiltersRef.current = activeFilters;
    }
  }, [activeFilters, setLayerState]);
}
