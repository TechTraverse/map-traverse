import { useState, useMemo, useCallback } from 'react';
import type { SelectionMode, SelectedFeature } from '../utils/selection';
import { selectedFeatureKey } from '../utils/selection';

export interface UseSelectionResult {
  mode: SelectionMode | null;
  activeLayerId: string | null;
  features: SelectedFeature[];
  highlightData: GeoJSON.FeatureCollection | null;
  setMode: (mode: SelectionMode | null) => void;
  setActiveLayerId: (layerId: string | null) => void;
  addFeatures: (features: SelectedFeature[]) => void;
  removeFeature: (key: string) => void;
  clearFeatures: () => void;
}

const MAX_SELECTED = 1000;

export function useSelection(): UseSelectionResult {
  const [mode, setModeState] = useState<SelectionMode | null>(null);
  const [activeLayerId, setActiveLayerIdState] = useState<string | null>(null);
  const [features, setFeatures] = useState<SelectedFeature[]>([]);

  const highlightData = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (features.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature' as const,
        properties: f.properties,
        geometry: f.geometry as unknown as GeoJSON.Geometry,
      })),
    };
  }, [features]);

  const setMode = useCallback((newMode: SelectionMode | null) => {
    setModeState(newMode);
  }, []);

  const setActiveLayerId = useCallback((layerId: string | null) => {
    setActiveLayerIdState(layerId);
    setFeatures([]);
  }, []);

  const addFeatures = useCallback((newFeatures: SelectedFeature[]) => {
    setFeatures((prev) => {
      const existingKeys = new Set(prev.map(selectedFeatureKey));
      const unique = newFeatures.filter((f) => !existingKeys.has(selectedFeatureKey(f)));
      const combined = [...prev, ...unique];
      return combined.length > MAX_SELECTED ? combined.slice(0, MAX_SELECTED) : combined;
    });
  }, []);

  const removeFeature = useCallback((key: string) => {
    setFeatures((prev) => prev.filter((f) => selectedFeatureKey(f) !== key));
  }, []);

  const clearFeatures = useCallback(() => {
    setFeatures([]);
  }, []);

  return {
    mode,
    activeLayerId,
    features,
    highlightData,
    setMode,
    setActiveLayerId,
    addFeatures,
    removeFeature,
    clearFeatures,
  };
}
