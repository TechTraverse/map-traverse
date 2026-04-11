import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import {
  LayerPanel,
  ImageryPanel,
  Legend,
  BasemapSwitcher,
  SearchPanel,
  CollapsibleControl,
  CompassControl,
  CoordinateDisplay,
  FeatureDetailPanel,
  FeatureTooltip,
  ExportButton,
  ExportModal,
  PdfExportDialog,
  type PdfExportOptions,
  InfoControl,
  InfoModal,
  MeasurePanel,
  SelectionPanel,
  QueryPanel,
  ScaleBarControl,
  type CoordinateFormatOption,
  type ExportableLayer,
  type ExportRequest,
} from '@ogc-maps/storybook-components';
import { exportMapAsPdf } from '../utils/exportPdf';
import type { MeasureMode, MeasureUnit, Measurement, SelectedFeature, SelectionMode } from '@ogc-maps/storybook-components';
import type { FilterRuleGroup, FilterRule } from '@ogc-maps/storybook-components/types';
import { useExport } from '@ogc-maps/storybook-components/hooks';
import { DEFAULT_EXPORT_FORMATS, fromStructuredFilters, fromFilterRuleGroup, and, fetchFeatures, eq, exportConverters, zoomToFeature } from '@ogc-maps/storybook-components/utils';
import type { GeoJsonFeature } from '@ogc-maps/storybook-components/utils';
import type { UIConfig, SearchFilterValue, SearchFilterValues, OrderableControlKey, InfoPosition, ControlCorner } from '@ogc-maps/storybook-components/types';
import { groupControlsByCorner } from '@ogc-maps/storybook-components';
import { useMapStore, useActiveLayerIds } from '../stores/mapStore';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';
import { useLayerQueryables } from '../hooks/useLayerQueryables';
import { LuDownload, LuFileText, LuLayers3, LuMap, LuMousePointer2, LuRuler, LuSearch } from 'react-icons/lu';
import { TbSatellite } from 'react-icons/tb';

const INFO_CORNER_CLASSES: Record<InfoPosition, string> = {
  'top-right': 'absolute top-4 right-4 pointer-events-auto',
  'top-left': 'absolute top-4 left-4 pointer-events-auto',
  'bottom-right': 'absolute bottom-4 right-4 pointer-events-auto',
  'bottom-left': 'absolute bottom-4 left-4 pointer-events-auto',
};

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
  selectionFeatures: SelectedFeature[];
  onSelectionClear: () => void;
  onSelectionViewResults: () => void;
  queryFilter?: FilterRuleGroup;
  onRunQuery?: (params: Record<string, unknown>) => void;
  queryLoading?: boolean;
  queryError?: string | null;
  hasSelectionGeometry?: boolean;
  mapRef?: React.RefObject<MapRef | null>;
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
  selectionFeatures,
  onSelectionClear,
  onSelectionViewResults,
  queryFilter,
  onRunQuery,
  queryLoading,
  queryError,
  hasSelectionGeometry,
  mapRef,
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
  const bearing = useMapStore((s) => s.viewState.bearing);
  const mapZoom = useMapStore((s) => s.viewState.zoom);
  const mapCenterLat = useMapStore((s) => s.viewState.latitude);
  const requestBearing = useMapStore((s) => s.requestBearing);
  const clearLayerFilters = useMapStore((s) => s.clearLayerFilters);
  const imageryLayers = useMapStore((s) => s.imageryLayers);
  const info = useMapStore((s) => s.info);
  const toggleImageryLayerVisibility = useMapStore((s) => s.toggleImageryLayerVisibility);
  const setImageryLayerOpacity = useMapStore((s) => s.setImageryLayerOpacity);
  const activeLayerIds = useActiveLayerIds();

  const { autocompleteSuggestions, fetchSuggestions } = useAutocompleteSuggestions();

  const {
    runExport,
    exportFeatures: runExportFromFeatures,
    loading: exportLoading,
    progress: exportProgress,
    error: exportError,
  } = useExport({
    converters: exportConverters,
  });

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const legendContainerRef = useRef<HTMLDivElement>(null);
  const scaleBarContainerRef = useRef<HTMLDivElement>(null);
  const compassContainerRef = useRef<HTMLDivElement>(null);

  const handlePdfExport = useCallback(
    async (options: PdfExportOptions) => {
      const map = mapRef?.current?.getMap();
      if (!map) {
        setPdfError('Map is not ready.');
        return;
      }
      setPdfLoading(true);
      setPdfError(null);
      setPdfProgress('Rendering map...');
      try {
        await exportMapAsPdf({
          map,
          options,
          legendElement: legendContainerRef.current,
          scaleBarElement: scaleBarContainerRef.current,
          compassElement: compassContainerRef.current,
        });
        setPdfDialogOpen(false);
      } catch (err) {
        setPdfError(err instanceof Error ? err.message : 'PDF export failed.');
      } finally {
        setPdfLoading(false);
        setPdfProgress(null);
      }
    },
    [mapRef],
  );

  const exportableLayers: ExportableLayer[] = useMemo(
    () => layers.filter((l) => l.visible).map((l) => ({ id: l.id, label: l.label, collection: l.collection })),
    [layers],
  );

  const handleExportRequest = useCallback(
    (request: ExportRequest) => {
      const filename = `${request.layer.label}${request.format.extension}`;
      if (request.mode === 'selected') {
        const features: GeoJsonFeature[] = selectionFeatures
          .filter((f) => f.layerId === request.layer.id)
          .map((f) => ({
            type: 'Feature',
            id: f.id,
            properties: f.properties,
            geometry: f.geometry as GeoJsonFeature['geometry'],
          }));
        if (features.length === 0) return;
        runExportFromFeatures(features, request.layer.collection, request.format.id, filename);
        return;
      }
      const cql2Filter = request.filtered ? (activeCql2Filters[request.layer.id] ?? undefined) : undefined;
      const layer = useMapStore.getState().layers.find((l) => l.id === request.layer.id);
      const source = sources.find((s) => s.id === layer?.sourceId);
      const baseUrl = source?.url ?? '';
      runExport(request.layer.collection, request.format.id, filename, cql2Filter, baseUrl);
    },
    [runExport, runExportFromFeatures, activeCql2Filters, sources, selectionFeatures],
  );

  const handleZoomToFeature = useCallback(
    async (layerId: string, property: string, value: string) => {
      const state = useMapStore.getState();
      const layer = state.layers.find((l) => l.id === layerId);
      if (!layer) return;
      const source = state.sources.find((s) => s.id === layer.sourceId);
      if (!source) return;

      const cql2Filter = eq(property, value);
      const data = await fetchFeatures(source.url, layer.collection, { cql2Filter, limit: 1 });
      if (!data.features.length) return;

      const instruction = zoomToFeature(
        data.features[0].geometry as Record<string, unknown>,
        {
          layerMinZoom: layer.minZoom,
          layerMaxZoom: layer.maxZoom,
          pointZoom: layer.zoomToLevel,
        },
      );
      if (!instruction) return;

      if (instruction.type === 'flyTo') {
        useMapStore.getState().flyTo(instruction.center, instruction.zoom);
      } else {
        useMapStore.getState().fitBounds(instruction.bbox, {
          padding: instruction.padding,
          maxZoom: instruction.maxZoom,
        });
      }
    },
    [],
  );

  // Accordion state: track which control is currently open
  const [openControl, setOpenControl] = useState<string | null>(null);

  // Expanded search modal state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [customFilterRules, setCustomFilterRules] = useState<Record<string, FilterRule[]>>({});
  const layerQueryables = useLayerQueryables(layers);

  const computeMergedCql2 = useCallback(
    (layerId: string, structured: SearchFilterValues, customs: FilterRule[]) => {
      const layer = useMapStore.getState().layers.find((l) => l.id === layerId);
      const fields = layer?.search?.fields ?? [];
      const structuredCql2 = fromStructuredFilters(structured, fields);
      const customCql2 = customs.length > 0
        ? fromFilterRuleGroup({ id: `${layerId}-custom`, combinator: 'and', rules: customs })
        : null;
      return and(structuredCql2, customCql2);
    },
    [],
  );

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: SearchFilterValue) => {
      const current = useMapStore.getState().activeFilters[layerId] ?? {};
      const updated: SearchFilterValues = { ...current, [property]: value };
      setLayerFilters(layerId, updated);

      const customs = customFilterRules[layerId] ?? [];
      setLayerCql2Filter(layerId, computeMergedCql2(layerId, updated, customs));
    },
    [setLayerFilters, setLayerCql2Filter, customFilterRules, computeMergedCql2],
  );

  const handleCustomRulesChange = useCallback(
    (layerId: string, rules: FilterRule[]) => {
      setCustomFilterRules((prev) => ({ ...prev, [layerId]: rules }));
      const structured = useMapStore.getState().activeFilters[layerId] ?? {};
      setLayerCql2Filter(layerId, computeMergedCql2(layerId, structured, rules));
    },
    [setLayerCql2Filter, computeMergedCql2],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Tooltip: follows cursor, pointer-events-none so it doesn't block map.
          Suppressed when a feature detail panel is open so the two don't overlap. */}
      {uiConfig.showFeatureTooltip && hoveredFeatures.length > 0 && hoveredPoint && selectedFeatures.length === 0 && (
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

      {/* Map controls stacked in their configured corner, order driven by config */}
      {(() => {
        const controlNodes: Record<OrderableControlKey, React.ReactNode> = {
            showLegend: uiConfig.showLegend ? (
              <div className="pointer-events-auto" ref={legendContainerRef}>
                <Legend
                  layers={layers}
                  visibleLayerIds={activeLayerIds}
                  legendOrder={uiConfig.legendOrder}
                  onOpacityChange={uiConfig.showLegendOpacity ? setLayerOpacity : undefined}
                />
              </div>
            ) : null,

            showSearchPanel: uiConfig.showSearchPanel ? (
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
                    expandable
                    expanded={searchExpanded}
                    onExpandedChange={setSearchExpanded}
                    availableProperties={layerQueryables}
                    customRules={customFilterRules}
                    onCustomRulesChange={handleCustomRulesChange}
                  />
                </CollapsibleControl>
              </div>
            ) : null,

            showLayerPanel: uiConfig.showLayerPanel ? (
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
            ) : null,

            showMeasureTool: uiConfig.showMeasureTool ? (
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
            ) : null,

            showSelectionTool: uiConfig.showSelectionTool ? (
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
            ) : null,

            showImageryPanel: uiConfig.showImageryPanel && imageryLayers.length > 0 ? (
              <div className="pointer-events-auto">
                <CollapsibleControl
                  icon={TbSatellite}
                  label="Imagery"
                  collapsed={openControl !== 'imagery'}
                  onToggle={(collapsed) => setOpenControl(collapsed ? null : 'imagery')}
                >
                  <ImageryPanel
                    imageryLayers={imageryLayers}
                    onToggleVisibility={toggleImageryLayerVisibility}
                    onOpacityChange={setImageryLayerOpacity}
                    hideTitle
                    className="p-3 max-w-xs"
                  />
                </CollapsibleControl>
              </div>
            ) : null,

            showBasemapSwitcher: uiConfig.showBasemapSwitcher ? (
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
            ) : null,

            showExportButton: uiConfig.showExportButton || uiConfig.showExportPdf ? (
              <div className="pointer-events-auto mapui:flex mapui:flex-col mapui:gap-2">
                {uiConfig.showExportButton && (
                  <ExportButton
                    icon={LuDownload}
                    onExport={() => setExportModalOpen(true)}
                    loading={exportLoading}
                  />
                )}
                {uiConfig.showExportPdf && (
                  <ExportButton
                    icon={LuFileText}
                    label="Export as PDF"
                    onExport={() => setPdfDialogOpen(true)}
                    loading={pdfLoading}
                  />
                )}
              </div>
            ) : null,

            showCompass: uiConfig.showCompass ? (
              <div className="pointer-events-auto" ref={compassContainerRef}>
                <CompassControl bearing={bearing} onReset={() => requestBearing(0)} />
              </div>
            ) : null,

            showInfoControl: info?.enabled && info.position === 'top-right' ? (
              <div className="pointer-events-auto">
                <InfoControl onClick={() => setInfoModalOpen(true)} title={info.title} />
              </div>
            ) : null,
          };

          const cornerClasses: Record<ControlCorner, string> = {
            'top-right': 'absolute top-4 right-4 flex flex-col gap-4 items-end',
            'top-left': 'absolute top-4 left-4 flex flex-col gap-4 items-start',
            'bottom-right': 'absolute bottom-4 right-4 flex flex-col gap-4 items-end',
            'bottom-left': 'absolute bottom-4 left-4 flex flex-col gap-4 items-start',
          };

          const grouped = groupControlsByCorner(uiConfig);
          return (Object.keys(cornerClasses) as ControlCorner[]).map((corner) => {
            const keys = grouped[corner];
            const rendered = keys
              .map((key) => controlNodes[key])
              .filter((node): node is React.ReactNode => node != null);
            if (rendered.length === 0) return null;
            return (
              <div key={corner} className={cornerClasses[corner]}>
                {keys.map((key) => {
                  const node = controlNodes[key];
                  return node ? <Fragment key={key}>{node}</Fragment> : null;
                })}
              </div>
            );
          });
        })()}

      {/* Export modal */}
      <div className="pointer-events-auto">
        <ExportModal
        open={exportModalOpen}
        layers={exportableLayers}
        availableFormats={DEFAULT_EXPORT_FORMATS}
        hasActiveFilter={(layerId) => activeCql2Filters[layerId] != null}
        selectionCount={selectionCount}
        selectionLayerId={selectionActiveLayerId}
        loading={exportLoading}
        progress={exportProgress}
        error={exportError?.message}
        onExport={handleExportRequest}
        onClose={() => setExportModalOpen(false)}
        />
      </div>

      {/* PDF export dialog */}
      <div className="pointer-events-auto">
        <PdfExportDialog
          open={pdfDialogOpen}
          loading={pdfLoading}
          progress={pdfProgress}
          error={pdfError}
          onExport={handlePdfExport}
          onClose={() => {
            setPdfDialogOpen(false);
            setPdfError(null);
          }}
        />
      </div>

      {info?.enabled && info.position !== 'top-right' && (
        <div className={INFO_CORNER_CLASSES[info.position]}>
          <InfoControl onClick={() => setInfoModalOpen(true)} title={info.title} />
        </div>
      )}

      {info?.enabled && (
        <InfoModal
          open={infoModalOpen}
          title={info.title}
          markdown={info.markdown ?? ''}
          onClose={() => setInfoModalOpen(false)}
        />
      )}

      {/* Bottom-left: Scale Bar */}
      {uiConfig.showScaleBar && (
        <div className="absolute bottom-2 left-2 pointer-events-auto" ref={scaleBarContainerRef}>
          <ScaleBarControl zoom={mapZoom} latitude={mapCenterLat} />
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
            onNavigate={(lat, lng) => useMapStore.getState().flyTo([lng, lat], 14)}
          />
        </div>
      )}
    </div>
  );
}
