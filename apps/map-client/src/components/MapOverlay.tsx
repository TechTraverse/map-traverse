import { useCallback, useState } from 'react';
import {
  LayerPanel,
  Legend,
  BasemapSwitcher,
  SearchPanel,
  CollapsibleControl,
  CoordinateDisplay,
  FeatureDetailPanel,
  FeatureTooltip,
  ExportButton,
  type CoordinateFormatOption,
  type ExportableLayer,
} from '@ogc-maps/storybook-components';
import { useCsvExport, fromStructuredFilters, fetchFeatures, eq, bboxFromGeometry } from '@ogc-maps/storybook-components/hooks';
import type { UIConfig, SearchFilterValue, SearchFilterValues } from '@ogc-maps/storybook-components/types';
import { useMapStore, useActiveLayerIds } from '../stores/mapStore';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';
import { LuLayers3, LuMap, LuSearch } from 'react-icons/lu';

interface MapOverlayProps {
  uiConfig: UIConfig;
  mouseCoords: { latitude: number; longitude: number } | null;
  activeCoordFormat: string;
  coordinateFormats: CoordinateFormatOption[];
  onCoordFormatChange: (formatId: string) => void;
  selectedFeature: {
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
  } | null;
  onCloseFeatureDetail: () => void;
  hoveredFeature: {
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
    point: { x: number; y: number };
  } | null;
}

export function MapOverlay({
  uiConfig,
  mouseCoords,
  activeCoordFormat,
  coordinateFormats,
  onCoordFormatChange,
  selectedFeature,
  onCloseFeatureDetail,
  hoveredFeature,
}: MapOverlayProps) {
  const layers = useMapStore((s) => s.layers);
  const basemaps = useMapStore((s) => s.basemaps);
  const sources = useMapStore((s) => s.sources);
  const activeBasemapId = useMapStore((s) => s.activeBasemapId);
  const activeFilters = useMapStore((s) => s.activeFilters);
  const activeCql2Filters = useMapStore((s) => s.activeCql2Filters);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);
  const reorderLayers = useMapStore((s) => s.reorderLayers);
  const setActiveBasemap = useMapStore((s) => s.setActiveBasemap);
  const setLayerFilters = useMapStore((s) => s.setLayerFilters);
  const setLayerCql2Filter = useMapStore((s) => s.setLayerCql2Filter);
  const setLayerOpacity = useMapStore((s) => s.setLayerOpacity);
  const clearLayerFilters = useMapStore((s) => s.clearLayerFilters);
  const activeLayerIds = useActiveLayerIds();

  const { autocompleteSuggestions, fetchSuggestions } = useAutocompleteSuggestions();

  // CSV export: use the first source's base URL (all layers in this app share one source)
  const exportBaseUrl = sources[0]?.url ?? '';
  const { exportCsv, loading: exportLoading } = useCsvExport({ baseUrl: exportBaseUrl });

  const exportableLayers: ExportableLayer[] = layers
    .filter((l) => l.visible)
    .map((l) => ({ id: l.id, label: l.label, collection: l.collection }));

  const handleExport = useCallback(
    (layer: ExportableLayer) => {
      const cql2Filter = activeCql2Filters[layer.id] ?? undefined;
      exportCsv(layer.collection, `${layer.label}.csv`, cql2Filter);
    },
    [exportCsv, activeCql2Filters],
  );

  const handleZoomToFeature = useCallback(
    async (layerId: string, property: string, value: string) => {
      const layer = useMapStore.getState().layers.find((l) => l.id === layerId);
      if (!layer) return;
      const source = useMapStore.getState().sources.find((s) => s.id === layer.sourceId);
      if (!source) return;

      const cql2Filter = eq(property, value);
      const data = await fetchFeatures(source.url, layer.collection, { cql2Filter, limit: 1 });
      if (!data.features.length) return;

      const bbox = bboxFromGeometry(data.features[0].geometry as Record<string, unknown>);
      if (bbox) useMapStore.getState().fitBounds(bbox);
    },
    [],
  );

  // Accordion state: track which control is currently open
  const [openControl, setOpenControl] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: SearchFilterValue) => {
      const current = useMapStore.getState().activeFilters[layerId] ?? {};
      const updated: SearchFilterValues = { ...current, [property]: value };
      setLayerFilters(layerId, updated);

      const layer = useMapStore.getState().layers.find((l) => l.id === layerId);
      const fields = layer?.search?.fields ?? [];
      setLayerCql2Filter(layerId, fromStructuredFilters(updated, fields));
    },
    [setLayerFilters, setLayerCql2Filter],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Tooltip: follows cursor, pointer-events-none so it doesn't block map */}
      {uiConfig.showFeatureTooltip && hoveredFeature && (
        <div
          className="absolute z-20"
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
        <div className="absolute top-4 left-4 pointer-events-auto z-10">
          <FeatureDetailPanel
            isOpen={selectedFeature !== null}
            onClose={onCloseFeatureDetail}
            properties={selectedFeature?.properties ?? null}
            title={selectedFeature?.title ?? 'Feature Properties'}
            fields={selectedFeature?.fields}
            labels={selectedFeature?.labels}
            variant="panel"
          />
        </div>
      )}

      {/* Top-right: Legend and controls stacked vertically */}
      <div className="absolute top-4 right-4 flex flex-col gap-4 items-end">
        {uiConfig.showLegend && (
          <div className="pointer-events-auto">
            <Legend layers={layers} visibleLayerIds={activeLayerIds} onOpacityChange={uiConfig.showLegendOpacity ? setLayerOpacity : undefined} />
          </div>
        )}

        {uiConfig.showSearchPanel && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuSearch}
              label="Search"
              collapsed={openControl !== 'search'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'search')}
            >
              <SearchPanel
                layers={layers}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearLayerFilters}
                autocompleteSuggestions={autocompleteSuggestions}
                onFetchSuggestions={fetchSuggestions}
                onZoomToFeature={handleZoomToFeature}
                className="p-3 max-w-xs"
                hideTitle
              />
            </CollapsibleControl>
          </div>
        )}

        {uiConfig.showLayerPanel && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuLayers3}
              label="Layers"
              collapsed={openControl !== 'layers'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'layers')}
            >
              <LayerPanel
                layers={layers}
                activeLayerIds={activeLayerIds}
                onToggleVisibility={toggleLayerVisibility}
                onReorder={reorderLayers}
                hideTitle
              />
            </CollapsibleControl>
          </div>
        )}

        {uiConfig.showBasemapSwitcher && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuMap}
              label="Basemap"
              collapsed={openControl !== 'basemap'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'basemap')}
            >
              <BasemapSwitcher
                basemaps={basemaps}
                activeBasemapId={activeBasemapId}
                onSelect={setActiveBasemap}
              />
            </CollapsibleControl>
          </div>
        )}
      </div>

      {/* Bottom-right: Export button */}
      {uiConfig.showExportButton && (
        <div className="absolute bottom-8 right-4 pointer-events-auto">
          <ExportButton
            layers={exportableLayers}
            onExport={handleExport}
            loading={exportLoading}
          />
        </div>
      )}

      {/* Bottom-center: Coordinate Display */}
      {uiConfig.showCoordinateDisplay && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-auto">
          <CoordinateDisplay
            latitude={mouseCoords?.latitude ?? null}
            longitude={mouseCoords?.longitude ?? null}
            activeFormat={activeCoordFormat}
            formats={coordinateFormats}
            onFormatChange={onCoordFormatChange}
          />
        </div>
      )}
    </div>
  );
}
