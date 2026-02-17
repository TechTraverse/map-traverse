import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  MapConfig,
  LayerConfig,
  BasemapConfig,
  ViewConfig,
  OgcApiSource,
  SearchFilterValues,
} from '@ogc-maps/storybook-components/types';

interface MapState {
  viewState: ViewConfig;
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  activeBasemapId: string;
  sources: OgcApiSource[];
  activeFilters: Record<string, SearchFilterValues>;

  setViewState: (vs: Partial<ViewConfig>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  reorderLayers: (layerIds: string[]) => void;
  setActiveBasemap: (basemapId: string) => void;
  setLayerFilters: (layerId: string, filters: SearchFilterValues) => void;
  clearLayerFilters: (layerId: string) => void;
  hydrate: (config: MapConfig) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewState: {
    latitude: 0,
    longitude: 0,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
  layers: [],
  basemaps: [],
  activeBasemapId: '',
  sources: [],
  activeFilters: {},

  setViewState: (vs) =>
    set((state) => ({
      viewState: { ...state.viewState, ...vs },
    })),

  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      ),
    })),

  setLayerVisibility: (layerId, visible) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      ),
    })),

  reorderLayers: (layerIds) =>
    set((state) => {
      const layerMap = new Map(state.layers.map((l) => [l.id, l]));
      const reordered = layerIds
        .map((id) => layerMap.get(id))
        .filter((l): l is LayerConfig => l !== undefined);
      return { layers: reordered };
    }),

  setActiveBasemap: (basemapId) =>
    set({ activeBasemapId: basemapId }),

  setLayerFilters: (layerId, filters) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, [layerId]: filters },
    })),

  clearLayerFilters: (layerId) =>
    set((state) => {
      const { [layerId]: _, ...rest } = state.activeFilters;
      return { activeFilters: rest };
    }),

  hydrate: (config) =>
    set({
      viewState: config.initialView,
      layers: config.layers,
      basemaps: config.basemaps,
      activeBasemapId: config.basemaps[0]?.id || '',
      sources: config.sources,
      activeFilters: {},
    }),
}));

// Selector helper for active layer IDs
export const useActiveLayerIds = () =>
  useMapStore(
    useShallow((s) => s.layers.filter((l) => l.visible).map((l) => l.id))
  );
