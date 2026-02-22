import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  MapConfig,
  LayerConfig,
  BasemapConfig,
  ViewConfig,
  OgcApiSource,
  UIConfig,
  SearchFilterValues,
} from '@ogc-maps/storybook-components/types';
import type { CQL2Expression } from '@ogc-maps/storybook-components/hooks';

interface MapState {
  viewState: ViewConfig;
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  activeBasemapId: string;
  sources: OgcApiSource[];
  uiConfig: UIConfig;
  /** Form values for the SearchPanel UI and URL serialization. */
  activeFilters: Record<string, SearchFilterValues>;
  /** Derived CQL2 expressions for API calls. Kept in sync with activeFilters. */
  activeCql2Filters: Record<string, CQL2Expression | null>;

  setViewState: (vs: Partial<ViewConfig>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  reorderLayers: (layerIds: string[]) => void;
  setActiveBasemap: (basemapId: string) => void;
  setLayerFilters: (layerId: string, filters: SearchFilterValues) => void;
  setLayerCql2Filter: (layerId: string, cql2: CQL2Expression | null) => void;
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
  uiConfig: {
    showLayerPanel: true,
    showLegend: true,
    showBasemapSwitcher: true,
    showSearchPanel: false,
    showCoordinateDisplay: true,
    showFeatureDetail: true,
    showFeatureTooltip: true,
    showExportButton: true,
  },
  activeFilters: {},
  activeCql2Filters: {},

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

  setLayerCql2Filter: (layerId, cql2) =>
    set((state) => ({
      activeCql2Filters: { ...state.activeCql2Filters, [layerId]: cql2 },
    })),

  clearLayerFilters: (layerId) =>
    set((state) => {
      const { [layerId]: _f, ...restFilters } = state.activeFilters;
      const { [layerId]: _c, ...restCql2 } = state.activeCql2Filters;
      return { activeFilters: restFilters, activeCql2Filters: restCql2 };
    }),

  hydrate: (config) =>
    set({
      viewState: config.initialView,
      layers: config.layers,
      basemaps: config.basemaps,
      activeBasemapId: config.basemaps[0]?.id || '',
      sources: config.sources,
      uiConfig: config.ui,
      activeFilters: {},
      activeCql2Filters: {},
    }),
}));

// Selector helper for active layer IDs
export const useActiveLayerIds = () =>
  useMapStore(
    useShallow((s) => s.layers.filter((l) => l.visible).map((l) => l.id))
  );
