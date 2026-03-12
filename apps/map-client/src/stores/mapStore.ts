import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  MapConfig,
  LayerConfig,
  BasemapConfig,
  SpriteSource,
  ViewConfig,
  OgcApiSource,
  UIConfig,
  SearchFilterValues,
} from '@ogc-maps/storybook-components/types';
import type { CQL2Expression, BBox } from '@ogc-maps/storybook-components/hooks';

interface MapState {
  viewState: ViewConfig;
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  activeBasemapId: string;
  sources: OgcApiSource[];
  sprites: SpriteSource[];
  uiConfig: UIConfig;
  /** Form values for the SearchPanel UI and URL serialization. */
  activeFilters: Record<string, SearchFilterValues>;
  /** Derived CQL2 expressions for API calls. Kept in sync with activeFilters. */
  activeCql2Filters: Record<string, CQL2Expression | null>;
  pendingFitBounds: BBox | null;

  setViewState: (vs: Partial<ViewConfig>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  reorderLayers: (layerIds: string[]) => void;
  setActiveBasemap: (basemapId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerFilters: (layerId: string, filters: SearchFilterValues) => void;
  setLayerCql2Filter: (layerId: string, cql2: CQL2Expression | null) => void;
  clearLayerFilters: (layerId: string) => void;
  fitBounds: (bbox: BBox) => void;
  clearPendingFitBounds: () => void;
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
  sprites: [],
  uiConfig: {
    showLayerPanel: true,
    showLegend: true,
    showBasemapSwitcher: true,
    showSearchPanel: false,
    showCoordinateDisplay: true,
    showFeatureDetail: true,
    showFeatureTooltip: true,
    showExportButton: true,
    showLegendOpacity: false,
    showMeasureTool: false,
  },
  activeFilters: {},
  activeCql2Filters: {},
  pendingFitBounds: null,

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

  setLayerOpacity: (layerId, opacity) =>
    set((state) => {
      const opacityKeys: Record<string, string> = {
        fill: 'fill-opacity',
        line: 'line-opacity',
        circle: 'circle-opacity',
        symbol: 'icon-opacity',
      };
      return {
        layers: state.layers.map((layer) => {
          if (layer.id !== layerId || !layer.styles?.length) return layer;
          return {
            ...layer,
            styles: layer.styles.map((style) => {
              const key = opacityKeys[style.type];
              if (!key) return style;
              return { ...style, paint: { ...style.paint, [key]: opacity } } as typeof style;
            }),
          };
        }),
      };
    }),

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

  fitBounds: (bbox) => set({ pendingFitBounds: bbox }),
  clearPendingFitBounds: () => set({ pendingFitBounds: null }),

  hydrate: (config) =>
    set({
      viewState: config.initialView,
      layers: config.layers,
      basemaps: config.basemaps,
      activeBasemapId: config.basemaps[0]?.id || '',
      sources: config.sources,
      sprites: config.sprites ?? [],
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
