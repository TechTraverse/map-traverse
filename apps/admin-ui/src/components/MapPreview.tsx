import { useState, useEffect, useMemo, useCallback } from 'react';
import { Map, Source, Layer, AttributionControl } from 'react-map-gl/maplibre';
import {
  getCql2FilteredVectorTileUrl,
  useOgcFeatures,
  useCsvExport,
  fromStructuredFilters,
  resolvePropertyDisplay,
} from '@ogc-maps/storybook-components/hooks';
import type { CQL2Expression } from '@ogc-maps/storybook-components/hooks';
import {
  Legend,
  LayerPanel,
  BasemapSwitcher,
  SearchPanel,
  CollapsibleControl,
  CoordinateDisplay,
  FeatureDetailPanel,
  FeatureTooltip,
  ExportButton,
  formatDecimal,
  formatDMS,
} from '@ogc-maps/storybook-components';
import type {
  OgcApiSource,
  LayerConfig,
  BasemapConfig,
  ViewConfig,
  UIConfig,
  CoordinateFormatOption,
  ExportableLayer,
} from '@ogc-maps/storybook-components';
import type { SearchFilterValue, SearchFilterValues } from '@ogc-maps/storybook-components/types';
import { LuLayers3, LuMap, LuSearch } from 'react-icons/lu';

const FALLBACK_BASEMAP_URL = 'https://demotiles.maplibre.org/style.json';

const DEFAULT_STYLE = {
  type: 'circle' as const,
  paint: { 'circle-radius': 4, 'circle-color': '#4a90d9', 'circle-opacity': 1 },
};

function getVectorTileSourceKey(layerId: string, cql2Filter?: CQL2Expression | null): string {
  return cql2Filter ? `${layerId}--${JSON.stringify(cql2Filter)}` : layerId;
}

function getBottomLayerId(layer: LayerConfig, cql2Filter?: CQL2Expression | null): string {
  if (layer.dataMode === 'vector-tiles') {
    const sourceKey = getVectorTileSourceKey(layer.id, cql2Filter);
    return layer.style ? sourceKey : `${sourceKey}-fill`;
  }
  return layer.style ? layer.id : `${layer.id}-fill`;
}

function PreviewVectorTileLayer({
  layer,
  sourceUrl,
  tileMatrixSetId,
  cql2Filter,
  beforeId,
}: {
  layer: LayerConfig;
  sourceUrl: string;
  tileMatrixSetId?: string;
  cql2Filter?: CQL2Expression | null;
  beforeId?: string;
}) {
  const tileUrl = getCql2FilteredVectorTileUrl(sourceUrl, layer.collection, cql2Filter, tileMatrixSetId);
  const sourceKey = getVectorTileSourceKey(layer.id, cql2Filter);
  const sourceLayer = layer.collection.replace(/^[^.]+\./, '');
  const layout = { visibility: layer.visible ? 'visible' : 'none' } as const;

  if (!layer.style) {
    return (
      <Source id={sourceKey} key={sourceKey} type="vector" tiles={[tileUrl]}>
        <Layer id={`${sourceKey}-fill`} type="fill" source-layer={sourceLayer}
          paint={{ 'fill-color': '#4a90d9', 'fill-opacity': 0.6, 'fill-outline-color': 'transparent' }} layout={layout} beforeId={beforeId} />
        <Layer id={`${sourceKey}-line`} type="line" source-layer={sourceLayer}
          paint={{ 'line-color': '#4a90d9', 'line-width': 2 }} layout={layout} />
      </Source>
    );
  }

  return (
    <Source id={sourceKey} key={sourceKey} type="vector" tiles={[tileUrl]}>
      <Layer
        id={sourceKey}
        type={layer.style.type}
        source-layer={sourceLayer}
        paint={layer.style.paint as any}
        layout={layout}
        beforeId={beforeId}
      />
    </Source>
  );
}

function PreviewGeoJsonLayer({
  layer,
  sourceUrl,
  cql2Filter,
  beforeId,
}: {
  layer: LayerConfig;
  sourceUrl: string;
  cql2Filter?: CQL2Expression | null;
  beforeId?: string;
}) {
  const { features } = useOgcFeatures(sourceUrl, layer.collection, { limit: 10000, cql2Filter: cql2Filter ?? undefined });

  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: features || [],
    }),
    [features],
  );

  const layout = { visibility: layer.visible ? 'visible' : 'none' } as const;

  if (!layer.style) {
    return (
      <Source id={layer.id} key={layer.id} type="geojson" data={featureCollection}>
        <Layer id={`${layer.id}-fill`} type="fill"
          paint={{ 'fill-color': '#4a90d9', 'fill-opacity': 0.6, 'fill-outline-color': 'transparent' }} layout={layout} beforeId={beforeId} />
        <Layer id={`${layer.id}-line`} type="line"
          paint={{ 'line-color': '#4a90d9', 'line-width': 2 }} layout={layout} />
      </Source>
    );
  }

  return (
    <Source id={layer.id} key={layer.id} type="geojson" data={featureCollection}>
      <Layer
        id={layer.id}
        type={layer.style.type}
        paint={layer.style.paint as any}
        layout={layout}
        beforeId={beforeId}
      />
    </Source>
  );
}

export interface MapPreviewProps {
  sources: OgcApiSource[];
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  viewState: ViewConfig;
  onViewStateChange?: (view: ViewConfig) => void;
  onLayersChange?: (layers: LayerConfig[]) => void;
  currentStep: string;
  uiConfig?: UIConfig;
}

export function MapPreview({
  sources,
  layers,
  basemaps,
  viewState,
  onViewStateChange,
  onLayersChange,
  currentStep,
  uiConfig,
}: MapPreviewProps) {
  const [internalViewState, setInternalViewState] = useState<ViewConfig>(viewState);
  const [activeBasemapId, setActiveBasemapId] = useState<string | undefined>(basemaps[0]?.id);
  const [activeFilters, setActiveFilters] = useState<Record<string, SearchFilterValues>>({});
  const [activeCql2Filters, setActiveCql2Filters] = useState<Record<string, CQL2Expression | undefined>>({});
  const [mouseCoords, setMouseCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [coordFormat, setCoordFormat] = useState<string>('decimal');
  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
  } | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
    point: { x: number; y: number };
  } | null>(null);
  const [openControl, setOpenControl] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>('auto');

  // Reset viewport when entering the view step or when the prop changes while on that step
  useEffect(() => {
    if (onViewStateChange) {
      setInternalViewState(viewState);
    }
  }, [onViewStateChange, viewState]);

  // Sync activeBasemapId when basemaps change
  useEffect(() => {
    setActiveBasemapId(prev => {
      if (basemaps.find(b => b.id === prev)) return prev;
      return basemaps[0]?.id;
    });
  }, [basemaps]);

  const sourceUrlMap = useMemo(() => {
    const map: Record<string, { url: string; tileMatrixSetId?: string }> = {};
    sources.forEach((source) => {
      map[source.id] = { url: source.url, tileMatrixSetId: source.tileMatrixSetId };
    });
    return map;
  }, [sources]);

  // Apply a fallback style to layers that have none, so Legend/LayerPanel can render them
  const layersWithDefaults = useMemo(
    () => layers.map(l => l.style ? l : { ...l, style: DEFAULT_STYLE }),
    [layers],
  );

  const activeBasemap = basemaps.find(b => b.id === activeBasemapId);
  const mapStyle = activeBasemap?.url ?? basemaps[0]?.url ?? FALLBACK_BASEMAP_URL;


  const showEmptyState = sources.length === 0 && layers.length === 0;

  const visibleLayerIds = layers.filter(l => l.visible).map(l => l.id);

  const coordinateFormats: CoordinateFormatOption[] = [
    { id: 'decimal', label: 'Decimal', format: formatDecimal },
    { id: 'dms', label: 'DMS', format: formatDMS },
  ];

  const featureInteractionEnabled = uiConfig && (uiConfig.showFeatureDetail || uiConfig.showFeatureTooltip);

  const interactiveLayerIds = useMemo(() => {
    if (!featureInteractionEnabled) return undefined;
    return layers.filter(l => l.visible).map(l => {
      const sourceKey = l.dataMode === 'vector-tiles'
        ? getVectorTileSourceKey(l.id, activeCql2Filters[l.id])
        : l.id;
      return l.style ? sourceKey : `${sourceKey}-fill`;
    });
  }, [featureInteractionEnabled, layers, activeCql2Filters]);

  // CSV export
  const exportBaseUrl = sources[0]?.url ?? '';
  const { exportCsv, loading: exportLoading } = useCsvExport({ baseUrl: exportBaseUrl });

  const exportableLayers: ExportableLayer[] = layers
    .filter(l => l.visible)
    .map(l => ({ id: l.id, label: l.label, collection: l.collection }));

  const handleExport = useCallback(
    (layer: ExportableLayer) => {
      exportCsv(layer.collection, `${layer.label}.csv`, activeCql2Filters[layer.id] ?? undefined);
    },
    [exportCsv, activeCql2Filters],
  );

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: SearchFilterValue) => {
      setActiveFilters(prev => {
        const current = prev[layerId] ?? {};
        const updated: SearchFilterValues = { ...current, [property]: value };
        const layer = layers.find(l => l.id === layerId);
        const fields = layer?.search?.fields ?? [];
        const newCql2 = fromStructuredFilters(updated, fields);
        setActiveCql2Filters(cql2Prev => ({ ...cql2Prev, [layerId]: newCql2 ?? undefined }));
        return { ...prev, [layerId]: updated };
      });
    },
    [layers],
  );

  const handleClearLayerFilters = useCallback((layerId: string) => {
    setActiveFilters(prev => { const next = { ...prev }; delete next[layerId]; return next; });
    setActiveCql2Filters(prev => { const next = { ...prev }; delete next[layerId]; return next; });
  }, []);

  const findLayerForFeature = useCallback((featureLayerId: string) => {
    return layers.find(l => {
      const sourceKey = l.dataMode === 'vector-tiles'
        ? getVectorTileSourceKey(l.id, activeCql2Filters[l.id])
        : l.id;
      return featureLayerId === sourceKey ||
        featureLayerId === `${sourceKey}-fill` ||
        featureLayerId === `${sourceKey}-line`;
    });
  }, [layers, activeCql2Filters]);

  const handleMove = (evt: { viewState: { latitude: number; longitude: number; zoom: number; pitch: number; bearing: number } }) => {
    const next: ViewConfig = {
      latitude: evt.viewState.latitude,
      longitude: evt.viewState.longitude,
      zoom: evt.viewState.zoom,
      pitch: evt.viewState.pitch,
      bearing: evt.viewState.bearing,
    };
    if (onViewStateChange) {
      onViewStateChange(next);
    } else {
      setInternalViewState(next);
    }
  };

  return (
    <div className="mapui:relative mapui:w-full mapui:h-full">
      <Map
        latitude={internalViewState.latitude}
        longitude={internalViewState.longitude}
        zoom={internalViewState.zoom}
        pitch={internalViewState.pitch}
        bearing={internalViewState.bearing}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        cursor={cursor}
        interactiveLayerIds={interactiveLayerIds}
        onMove={handleMove}
        onClick={(evt) => {
          if (!featureInteractionEnabled) return;
          const feature = evt.features?.[0];
          if (feature) {
            const layer = findLayerForFeature(feature.layer.id);
            const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
            setSelectedFeature({
              properties: (feature.properties ?? {}) as Record<string, unknown>,
              title: (feature.properties?.['name'] as string) ?? feature.layer.id,
              fields: resolved?.fields,
              labels: resolved?.labels,
            });
          }
        }}
        onMouseMove={(evt) => {
          setMouseCoords({ latitude: evt.lngLat.lat, longitude: evt.lngLat.lng });
          if (!featureInteractionEnabled) return;
          const feature = evt.features?.[0];
          if (feature) {
            setCursor('pointer');
            const layer = findLayerForFeature(feature.layer.id);
            const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
            setHoveredFeature({
              properties: (feature.properties ?? {}) as Record<string, unknown>,
              title: (feature.properties?.['name'] as string) ?? undefined,
              fields: resolved?.fields,
              labels: resolved?.labels,
              point: { x: evt.point.x, y: evt.point.y },
            });
          } else {
            setCursor('auto');
            setHoveredFeature(null);
          }
        }}
        onMouseOut={() => {
          setCursor('auto');
          setMouseCoords(null);
          setHoveredFeature(null);
        }}
        attributionControl={false}
      >
        <AttributionControl position="bottom-left" />

        {!showEmptyState && layers.map((layer, index) => {
          const sourceInfo = sourceUrlMap[layer.sourceId];
          if (!sourceInfo) return null;

          let beforeId: string | undefined;
          for (let j = index + 1; j < layers.length; j++) {
            if (sourceUrlMap[layers[j].sourceId]) {
              beforeId = getBottomLayerId(layers[j], activeCql2Filters[layers[j].id]);
              break;
            }
          }

          if (layer.dataMode === 'geojson') {
            return (
              <PreviewGeoJsonLayer
                key={layer.id}
                layer={layer}
                sourceUrl={sourceInfo.url}
                cql2Filter={activeCql2Filters[layer.id]}
                beforeId={beforeId}
              />
            );
          }

          return (
            <PreviewVectorTileLayer
              key={getVectorTileSourceKey(layer.id, activeCql2Filters[layer.id])}
              layer={layer}
              sourceUrl={sourceInfo.url}
              tileMatrixSetId={sourceInfo.tileMatrixSetId}
              cql2Filter={activeCql2Filters[layer.id]}
              beforeId={beforeId}
            />
          );
        })}
      </Map>

      {/* Full overlay when uiConfig is provided */}
      {!showEmptyState && uiConfig && (
        <div className="mapui:absolute mapui:inset-0 mapui:pointer-events-none">
          {/* Tooltip: follows cursor */}
          {uiConfig.showFeatureTooltip && hoveredFeature && (
            <div
              className="mapui:absolute mapui:z-20"
              style={{ left: hoveredFeature.point.x + 12, top: hoveredFeature.point.y + 12 }}
            >
              <FeatureTooltip
                title={hoveredFeature.title}
                properties={hoveredFeature.properties}
                fields={hoveredFeature.fields}
                labels={hoveredFeature.labels}
              />
            </div>
          )}

          {/* Top-left: Feature detail panel */}
          {uiConfig.showFeatureDetail && (
            <div className="mapui:absolute mapui:top-4 mapui:left-4 mapui:pointer-events-auto mapui:z-10">
              <FeatureDetailPanel
                isOpen={selectedFeature !== null}
                onClose={() => setSelectedFeature(null)}
                properties={selectedFeature?.properties ?? null}
                title={selectedFeature?.title ?? 'Feature Properties'}
                fields={selectedFeature?.fields}
                labels={selectedFeature?.labels}
                variant="panel"
              />
            </div>
          )}

          {/* Top-right: Legend and controls stacked vertically */}
          <div className="mapui:absolute mapui:top-4 mapui:right-4 mapui:flex mapui:flex-col mapui:gap-4 mapui:items-end">
            {uiConfig.showLegend && (
              <div className="mapui:pointer-events-auto">
                <Legend layers={layersWithDefaults} visibleLayerIds={visibleLayerIds} />
              </div>
            )}

            {uiConfig.showSearchPanel && (
              <div className="mapui:pointer-events-auto">
                <CollapsibleControl
                  icon={LuSearch}
                  label="Search"
                  collapsed={openControl !== 'search'}
                  onToggle={(collapsed) => setOpenControl(collapsed ? null : 'search')}
                >
                  <SearchPanel
                    layers={layersWithDefaults}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearLayerFilters}
                    autocompleteSuggestions={{}}
                    onFetchSuggestions={() => {}}
                    className="p-3 max-w-xs"
                    hideTitle
                  />
                </CollapsibleControl>
              </div>
            )}

            {uiConfig.showLayerPanel && (
              <div className="mapui:pointer-events-auto">
                <CollapsibleControl
                  icon={LuLayers3}
                  label="Layers"
                  collapsed={openControl !== 'layers'}
                  onToggle={(collapsed) => setOpenControl(collapsed ? null : 'layers')}
                >
                  <LayerPanel
                    layers={layersWithDefaults}
                    activeLayerIds={visibleLayerIds}
                    onToggleVisibility={(layerId) => {
                      onLayersChange?.(layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
                    }}
                    hideTitle
                  />
                </CollapsibleControl>
              </div>
            )}

            {uiConfig.showBasemapSwitcher && (
              <div className="mapui:pointer-events-auto">
                <CollapsibleControl
                  icon={LuMap}
                  label="Basemap"
                  collapsed={openControl !== 'basemap'}
                  onToggle={(collapsed) => setOpenControl(collapsed ? null : 'basemap')}
                >
                  <BasemapSwitcher
                    basemaps={basemaps}
                    activeBasemapId={activeBasemapId ?? ''}
                    onSelect={setActiveBasemapId}
                  />
                </CollapsibleControl>
              </div>
            )}
          </div>

          {/* Bottom-right: Export button */}
          {uiConfig.showExportButton && (
            <div className="mapui:absolute mapui:bottom-8 mapui:right-4 mapui:pointer-events-auto">
              <ExportButton
                layers={exportableLayers}
                onExport={handleExport}
                loading={exportLoading}
              />
            </div>
          )}

          {/* Bottom-center: Coordinate display */}
          {uiConfig.showCoordinateDisplay && (
            <div className="mapui:absolute mapui:bottom-0 mapui:left-1/2 mapui:-translate-x-1/2 mapui:pointer-events-auto">
              <CoordinateDisplay
                latitude={mouseCoords?.latitude ?? null}
                longitude={mouseCoords?.longitude ?? null}
                activeFormat={coordFormat}
                formats={coordinateFormats}
                onFormatChange={setCoordFormat}
              />
            </div>
          )}
        </div>
      )}

      {/* Legacy overlay when uiConfig is not provided */}
      {!showEmptyState && !uiConfig && (
        <div className="mapui:absolute mapui:top-2 mapui:right-2 mapui:flex mapui:flex-col mapui:gap-2 mapui:max-w-[280px]">
          <Legend
            layers={layersWithDefaults}
            visibleLayerIds={visibleLayerIds}
          />
          <div className="mapui:rounded-lg mapui:bg-white mapui:p-3 mapui:shadow-md mapui:text-sm">
            <LayerPanel
              layers={layersWithDefaults}
              activeLayerIds={visibleLayerIds}
              onToggleVisibility={(layerId) => {
                onLayersChange?.(layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
              }}
              hideTitle
            />
          </div>
        </div>
      )}

      {showEmptyState && (
        <div className="mapui:absolute mapui:inset-0 mapui:flex mapui:items-center mapui:justify-center mapui:pointer-events-none">
          <div className="mapui:bg-white/80 mapui:backdrop-blur-sm mapui:rounded-lg mapui:px-4 mapui:py-3 mapui:text-sm mapui:text-gray-600 mapui:shadow mapui:text-center mapui:max-w-[200px]">
            Configure sources and layers to see a preview
          </div>
        </div>
      )}

      {currentStep === 'view' && (
        <div className="mapui:absolute mapui:top-2 mapui:left-1/2 mapui:-translate-x-1/2 mapui:pointer-events-none">
          <div className="mapui:bg-blue-600/90 mapui:text-white mapui:text-xs mapui:rounded-full mapui:px-3 mapui:py-1 mapui:shadow">
            Pan and zoom to set the initial viewport
          </div>
        </div>
      )}
    </div>
  );
}
