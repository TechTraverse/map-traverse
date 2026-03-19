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
  ExportModal,
  MeasurePanel,
  SelectionPanel,
  QueryPanel,
  type CoordinateFormatOption,
  type ExportableLayer,
  type ExportFormatOption,
  type ExportRequest,
} from '@ogc-maps/storybook-components';
import type { MeasureMode, MeasureUnit, Measurement, SelectionMode } from '@ogc-maps/storybook-components';
import type { FilterRuleGroup } from '@ogc-maps/storybook-components/types';
import { useExport, fromStructuredFilters, fetchFeatures, eq, bboxFromGeometry } from '@ogc-maps/storybook-components/hooks';
import type { UIConfig, SearchFilterValue, SearchFilterValues } from '@ogc-maps/storybook-components/types';
import { useMapStore, useActiveLayerIds } from '../stores/mapStore';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';
import { exportConverters } from '../utils/exportConverters';
import { LuLayers3, LuMap, LuMousePointer2, LuRuler, LuSearch } from 'react-icons/lu';

const availableFormats: ExportFormatOption[] = [
  { id: 'csv', label: 'CSV', extension: '.csv', description: 'Comma-separated values' },
  { id: 'geojson', label: 'GeoJSON', extension: '.geojson', description: 'GeoJSON format' },
  { id: 'kml', label: 'KML', extension: '.kml', description: 'Google Earth' },
  { id: 'shapefile', label: 'Shapefile', extension: '.zip', description: 'Esri Shapefile' },
  { id: 'flatgeobuf', label: 'FlatGeobuf', extension: '.fgb', description: 'FlatGeobuf' },
  { id: 'geopackage', label: 'GeoPackage', extension: '.gpkg', description: 'OGC GeoPackage' },
];

interface MapOverlayProps {
  uiConfig: UIConfig;
  mouseCoords: { latitude: number; longitude: number } | null;
  activeCoordFormat: string;
  coordinateFormats: CoordinateFormatOption[];
  onCoordFormatChange: (formatId: string) => void;
  selectedFeatures: {
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
  }[];
  onCloseFeatureDetail: (index: number) => void;
  hoveredFeatures: {
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
  }[];
  hoveredPoint: { x: number; y: number } | null;
  measureMode: MeasureMode | null;
  onMeasureModeChange: (mode: MeasureMode | null) => void;
  measurePoints: [number, number][];
  measurement: Measurement | null;
  measureUnit: MeasureUnit;
  onMeasureUnitChange: (unit: MeasureUnit) => void;
  onMeasureClear: () => void;
  selectionMode: SelectionMode | null;
  onSelectionModeChange: (mode: SelectionMode | null) => void;
  selectionActiveLayerId: string | null;
  onSelectionActiveLayerChange: (layerId: string | null) => void;
  selectionCount: number;
  onSelectionClear: () => void;
  onSelectionViewResults: () => void;
  queryFilter?: FilterRuleGroup;
  onRunQuery?: (params: Record<string, unknown>) => void;
  queryLoading?: boolean;
  queryError?: string | null;
  hasSelectionGeometry?: boolean;
}

export function MapOverlay({
  uiConfig,
  mouseCoords,
  activeCoordFormat,
  coordinateFormats,
  onCoordFormatChange,
  selectedFeatures,
  onCloseFeatureDetail,
  hoveredFeatures,
  hoveredPoint,
  measureMode,
  onMeasureModeChange,
  measurePoints,
  measurement,
  measureUnit,
  onMeasureUnitChange,
  onMeasureClear,
  selectionMode,
  onSelectionModeChange,
  selectionActiveLayerId,
  onSelectionActiveLayerChange,
  selectionCount,
  onSelectionClear,
  onSelectionViewResults,
  queryFilter,
  onRunQuery,
  queryLoading,
  queryError,
  hasSelectionGeometry,
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

  // Export: use the first source's base URL (all layers in this app share one source)
  const exportBaseUrl = sources[0]?.url ?? '';
  const { runExport, loading: exportLoading, progress: exportProgress, error: exportError } = useExport({
    baseUrl: exportBaseUrl,
    converters: exportConverters,
  });

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const exportableLayers: ExportableLayer[] = layers
    .filter((l) => l.visible)
    .map((l) => ({ id: l.id, label: l.label, collection: l.collection }));

  const handleExportRequest = useCallback(
    (request: ExportRequest) => {
      const cql2Filter = request.filtered ? (activeCql2Filters[request.layer.id] ?? undefined) : undefined;
      const filename = `${request.layer.label}${request.format.extension}`;
      runExport(request.layer.collection, request.format.id, filename, cql2Filter);
    },
    [runExport, activeCql2Filters],
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
      {uiConfig.showFeatureTooltip && hoveredFeatures.length > 0 && hoveredPoint && (
        <div
          className="absolute z-20"
          style={{ left: hoveredPoint.x + 12, top: hoveredPoint.y + 12 }}
        >
          <FeatureTooltip features={hoveredFeatures} />
        </div>
      )}

      {/* Top-left: Feature detail panels */}
      {uiConfig.showFeatureDetail && selectedFeatures.length > 0 && (
        <div className="absolute top-4 left-4 pointer-events-auto z-10 flex flex-col gap-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {selectedFeatures.map((feature, i) => (
            <FeatureDetailPanel
              key={i}
              isOpen
              onClose={() => onCloseFeatureDetail(i)}
              properties={feature.properties}
              title={feature.title ?? 'Feature Properties'}
              fields={feature.fields}
              labels={feature.labels}
              variant="panel"
            />
          ))}
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

        {uiConfig.showMeasureTool && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuRuler}
              label="Measure"
              collapsed={openControl !== 'measure'}
              onToggle={(collapsed) => {
                setOpenControl(collapsed ? null : 'measure');
                if (collapsed) {
                  onMeasureModeChange(null);
                  onMeasureClear();
                }
              }}
            >
              <MeasurePanel
                mode={measureMode}
                onModeChange={onMeasureModeChange}
                points={measurePoints}
                measurement={measurement}
                unit={measureUnit}
                onUnitChange={onMeasureUnitChange}
                onClear={onMeasureClear}
                className="p-3 max-w-xs"
              />
            </CollapsibleControl>
          </div>
        )}

        {uiConfig.showSelectionTool && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuMousePointer2}
              label="Select"
              collapsed={openControl !== 'selection'}
              onToggle={(collapsed) => {
                setOpenControl(collapsed ? null : 'selection');
                if (collapsed) {
                  onSelectionModeChange(null);
                }
              }}
            >
              <SelectionPanel
                mode={selectionMode}
                onModeChange={onSelectionModeChange}
                layers={layers}
                activeLayerId={selectionActiveLayerId}
                onActiveLayerChange={onSelectionActiveLayerChange}
                selectedCount={selectionCount}
                onClear={onSelectionClear}
                onViewResults={onSelectionViewResults}
                queryPanel={queryFilter && onRunQuery ? (
                  <>
                    <QueryPanel
                      cql2Filter={queryFilter}
                      onRun={onRunQuery}
                      loading={queryLoading}
                      hasSelectionGeometry={hasSelectionGeometry}
                    />
                    {queryError && (
                      <p className="m-0 text-xs text-red-600 mt-1">{queryError}</p>
                    )}
                  </>
                ) : undefined}
                className="p-3 max-w-xs"
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
            onExport={() => setExportModalOpen(true)}
            loading={exportLoading}
          />
        </div>
      )}

      {/* Export modal */}
      <div className="pointer-events-auto">
        <ExportModal
        open={exportModalOpen}
        layers={exportableLayers}
        availableFormats={availableFormats}
        hasActiveFilter={(layerId) => activeCql2Filters[layerId] != null}
        loading={exportLoading}
        progress={exportProgress}
        error={exportError?.message}
        onExport={handleExportRequest}
        onClose={() => setExportModalOpen(false)}
        />
      </div>

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
