import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  MapConfig,
  LayerConfig,
  ImageryLayerConfig,
  BasemapConfig,
  SpriteSource,
  ViewConfig,
  MapSource,
  UIConfig,
  BrandingConfig,
  SearchFilterValues,
  GlobalSearchConfig,
  InfoConfig,
} from '@ogc-maps/storybook-components/types';
import type { CQL2Expression, BBox } from '@ogc-maps/storybook-components/utils';
import { mergeBaseAndActiveCql2Filters } from '@ogc-maps/storybook-components/utils';
import type { GlobalSearchGroupedResults } from '@ogc-maps/storybook-components';

interface MapState {
  viewState: ViewConfig;
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  activeBasemapId: string;
  sources: MapSource[];
  sprites: SpriteSource[];
  uiConfig: UIConfig;
  branding: BrandingConfig | undefined;
  info: InfoConfig | undefined;
  /** Form values for the SearchPanel UI and URL serialization. */
  activeFilters: Record<string, SearchFilterValues>;
  /** Derived CQL2 expressions for API calls. Kept in sync with activeFilters. */
  activeCql2Filters: Record<string, CQL2Expression | null>;
  imageryLayers: ImageryLayerConfig[];
  pendingFitBounds: BBox | null;
  /** Optional bounds-fit options. Paired with `pendingFitBounds` when present. */
  pendingFitBoundsOptions: { padding?: number; maxZoom?: number } | null;
  pendingFlyTo: { center: [number, number]; zoom?: number } | null;
  pendingBearing: number | null;
  /** A user-dropped pin (e.g. from the coordinate go-to input). Persists until cleared or replaced. */
  droppedPin: { latitude: number; longitude: number } | null;
  /** True while the user is in one-shot pin-drop mode — the next map click drops a pin and exits the mode. */
  pinDropActive: boolean;

  /** Top-level global search config (from MapConfig.globalSearch). */
  globalSearchConfig: GlobalSearchConfig | undefined;
  /** Current query string typed into the global search bar. */
  globalSearchQuery: string;
  /** Latest grouped results for the global search. */
  globalSearchResults: GlobalSearchGroupedResults;
  /** Loading state for the global search. */
  globalSearchIsLoading: boolean;
  /** Cached distinct values for properties with `prefetch: true`. Key: `${layerId}:${property}`. */
  prefetchedDistinctValues: Record<string, string[]>;

  toggleImageryLayerVisibility: (layerId: string) => void;
  setImageryLayerOpacity: (layerId: string, opacity: number) => void;
  setViewState: (vs: Partial<ViewConfig>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  reorderLayers: (layerIds: string[]) => void;
  setActiveBasemap: (basemapId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerFilters: (layerId: string, filters: SearchFilterValues) => void;
  setLayerCql2Filter: (layerId: string, cql2: CQL2Expression | null) => void;
  clearLayerFilters: (layerId: string) => void;
  fitBounds: (bbox: BBox, options?: { padding?: number; maxZoom?: number }) => void;
  clearPendingFitBounds: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  clearPendingFlyTo: () => void;
  requestBearing: (bearing: number) => void;
  clearPendingBearing: () => void;
  setDroppedPin: (latitude: number, longitude: number) => void;
  clearDroppedPin: () => void;
  setPinDropActive: (active: boolean) => void;
  togglePinDropActive: () => void;
  /** One-shot "go to and pin" action: flies to (lat, lng), drops a pin, and exits pin-drop mode. */
  dropPinAt: (latitude: number, longitude: number) => void;

  setGlobalSearchQuery: (q: string) => void;
  setGlobalSearchResults: (r: GlobalSearchGroupedResults) => void;
  setGlobalSearchIsLoading: (loading: boolean) => void;
  cacheDistinctValues: (key: string, values: string[]) => void;
  clearGlobalSearch: () => void;

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
    showExportPdf: false,
    showLegendOpacity: false,
    showMeasureTool: false,
    showSelectionTool: false,
    showImageryPanel: false,
    showCompass: true,
    showGlobalSearch: false,
    showScaleBar: false,
    coordinateFormat: 'decimal-degrees',
    controlLayout: 'individual',
    sideMenuToggleCorner: 'top-right',
  },
  branding: undefined,
  info: undefined,
  imageryLayers: [],
  activeFilters: {},
  activeCql2Filters: {},
  pendingFitBounds: null,
  pendingFitBoundsOptions: null,
  pendingFlyTo: null,
  pendingBearing: null,
  droppedPin: null,
  pinDropActive: false,

  globalSearchConfig: undefined,
  globalSearchQuery: '',
  globalSearchResults: {},
  globalSearchIsLoading: false,
  prefetchedDistinctValues: {},

  toggleImageryLayerVisibility: (layerId) =>
    set((state) => {
      const target = state.imageryLayers.find((l) => l.id === layerId);
      if (!target) return state;
      const newVisible = !target.visible;
      return {
        imageryLayers: state.imageryLayers.map((l) => {
          if (l.id === layerId) return { ...l, visible: newVisible };
          if (!newVisible) return l;
          if (target.exclusive) return { ...l, visible: false };
          if (l.exclusive && l.visible) return { ...l, visible: false };
          return l;
        }),
      };
    }),

  setImageryLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      imageryLayers: state.imageryLayers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      ),
    })),

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

  fitBounds: (bbox, options) =>
    set({ pendingFitBounds: bbox, pendingFitBoundsOptions: options ?? null }),
  clearPendingFitBounds: () =>
    set({ pendingFitBounds: null, pendingFitBoundsOptions: null }),

  flyTo: (center, zoom) => set({ pendingFlyTo: { center, zoom } }),
  clearPendingFlyTo: () => set({ pendingFlyTo: null }),

  requestBearing: (bearing) => set({ pendingBearing: bearing }),
  clearPendingBearing: () => set({ pendingBearing: null }),

  setDroppedPin: (latitude, longitude) => set({ droppedPin: { latitude, longitude } }),
  clearDroppedPin: () => set({ droppedPin: null }),
  setPinDropActive: (active) => set({ pinDropActive: active }),
  togglePinDropActive: () => set((s) => ({ pinDropActive: !s.pinDropActive })),
  dropPinAt: (latitude, longitude) =>
    set({
      droppedPin: { latitude, longitude },
      pendingFlyTo: { center: [longitude, latitude], zoom: 17 },
      pinDropActive: false,
    }),

  setGlobalSearchQuery: (q) =>
    set((s) => (s.globalSearchQuery === q ? s : { globalSearchQuery: q })),
  setGlobalSearchResults: (r) =>
    set((s) => {
      if (s.globalSearchResults === r) return s;
      // Treat any two empty result sets as equal so sub-min-length keystrokes
      // don't republish a fresh `{}` and re-render every subscriber.
      if (Object.keys(r).length === 0 && Object.keys(s.globalSearchResults).length === 0) {
        return s;
      }
      return { globalSearchResults: r };
    }),
  setGlobalSearchIsLoading: (loading) =>
    set((s) => (s.globalSearchIsLoading === loading ? s : { globalSearchIsLoading: loading })),
  cacheDistinctValues: (key, values) =>
    set((state) => ({
      prefetchedDistinctValues: { ...state.prefetchedDistinctValues, [key]: values },
    })),
  clearGlobalSearch: () =>
    set({
      globalSearchQuery: '',
      globalSearchResults: {},
      globalSearchIsLoading: false,
    }),

  hydrate: (config) =>
    set({
      viewState: config.initialView,
      layers: config.layers,
      imageryLayers: config.imageryLayers ?? [],
      basemaps: config.basemaps,
      activeBasemapId: config.basemaps[0]?.id || '',
      sources: config.sources,
      sprites: config.sprites ?? [],
      uiConfig: config.ui,
      branding: config.branding,
      info: config.info,
      activeFilters: {},
      activeCql2Filters: {},
      globalSearchConfig: config.globalSearch,
      globalSearchQuery: '',
      globalSearchResults: {},
      globalSearchIsLoading: false,
      prefetchedDistinctValues: {},
      droppedPin: null,
      pinDropActive: false,
    }),
}));

// Selector helper for active layer IDs
export const useActiveLayerIds = () =>
  useMapStore(
    useShallow((s) => s.layers.filter((l) => l.visible).map((l) => l.id))
  );

/**
 * Per-layer effective CQL2 filter map: AND-merge of each layer's saved
 * `cql2Filter` (the permanent base filter from MapConfig) with the
 * SearchPanel-derived `activeCql2Filters[layerId]`. Use this in place of
 * `activeCql2Filters` at every consumer (vector tile URL, source key,
 * fetchFeatures, useCsvExport, hasActiveFilter, etc.) so saved base filters
 * apply on first render and across reloads, not just after the user touches
 * a search field.
 *
 * Implemented with `useMemo` rather than `useShallow` because
 * `mergeBaseAndActiveCql2Filters` constructs fresh objects (e.g.
 * `{ op: 'and', args: [...] }` from `and()`) every call. `useShallow`'s
 * shallow comparison would see the per-layer values as new references on
 * every read and report the snapshot as unstable — which trips React's
 * `useSyncExternalStore` infinite-loop guard (#185) and white-screens the
 * app. Selecting the two stable inputs and memoizing avoids that.
 */
export function useEffectiveCql2Filters() {
  const layers = useMapStore((s) => s.layers);
  const activeCql2Filters = useMapStore((s) => s.activeCql2Filters);
  return useMemo(
    () => mergeBaseAndActiveCql2Filters(layers, activeCql2Filters),
    [layers, activeCql2Filters],
  );
}
