import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type PdfExportOptions,
  InfoControl,
  InfoModal,
  MeasurePanel,
  SelectionPanel,
  QueryPanel,
  ScaleBarControl,
  SideMenuPanel,
  SideMenuToggle,
  type SideMenuPanelItem,
  getControlIcon,
  type CoordinateFormatOption,
  type ExportableLayer,
  type ExportRequest,
} from '@ogc-maps/storybook-components';
import { exportMapAsPdf } from '../utils/exportPdf';
import type { MeasureMode, MeasureUnit, Measurement, SelectedFeature, SelectionMode } from '@ogc-maps/storybook-components';
import type { FilterRuleGroup } from '@ogc-maps/storybook-components/types';
import type { PropertyFilter } from '@ogc-maps/storybook-components/utils';
import { useExport } from '@ogc-maps/storybook-components/hooks';
import { DEFAULT_EXPORT_FORMATS, fromStructuredFilters, propertyFiltersToCql2, and, fetchFeatures, eq, exportConverters, zoomToFeature } from '@ogc-maps/storybook-components/utils';
import type { GeoJsonFeature } from '@ogc-maps/storybook-components/utils';
import type { UIConfig, SearchFilterValue, SearchFilterValues, OrderableControlKey, InfoPosition, ControlCorner } from '@ogc-maps/storybook-components/types';
import { groupControlsByCorner, resolveControlCorner } from '@ogc-maps/storybook-components';
import { useMapStore, useActiveLayerIds } from '../stores/mapStore';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';
import { useLayerQueryables } from '../hooks/useLayerQueryables';
import { LuDownload, LuLayers3, LuMap, LuMousePointer2, LuRuler, LuSearch } from 'react-icons/lu';
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

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const legendContainerRef = useRef<HTMLDivElement>(null);
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
          compassElement: compassContainerRef.current,
        });
        setExportModalOpen(false);
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
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Resolve controlLayout: 'auto' → 'side-menu' below 768px, else 'individual'
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsNarrowViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const effectiveLayout: 'individual' | 'side-menu' =
    uiConfig.controlLayout === 'auto'
      ? isNarrowViewport
        ? 'side-menu'
        : 'individual'
      : uiConfig.controlLayout;

  // Expanded search modal state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [propertyFilters, setPropertyFilters] = useState<PropertyFilter[]>([]);
  const layerQueryables = useLayerQueryables(layers);

  const computeMergedCql2 = useCallback(
    (layerId: string, structured: SearchFilterValues, flatFilters: PropertyFilter[]) => {
      const layer = useMapStore.getState().layers.find((l) => l.id === layerId);
      const fields = layer?.search?.fields ?? [];
      const structuredCql2 = fromStructuredFilters(structured, fields);
      const customCql2 = propertyFiltersToCql2(flatFilters, layerId);
      return and(structuredCql2, customCql2);
    },
    [],
  );

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: SearchFilterValue) => {
      const current = useMapStore.getState().activeFilters[layerId] ?? {};
      const updated: SearchFilterValues = { ...current, [property]: value };
      setLayerFilters(layerId, updated);

      setLayerCql2Filter(layerId, computeMergedCql2(layerId, updated, propertyFilters));
    },
    [setLayerFilters, setLayerCql2Filter, propertyFilters, computeMergedCql2],
  );

  const handlePropertyFiltersChange = useCallback(
    (filters: PropertyFilter[]) => {
      setPropertyFilters(filters);
      // Recompute merged CQL2 for every layer that has (or had) a property
      // filter, so clearing a rule actually drops the layer's filter too.
      const touched = new Set<string>();
      for (const f of filters) touched.add(f.layerId);
      for (const f of propertyFilters) touched.add(f.layerId);
      const storeFilters = useMapStore.getState().activeFilters;
      for (const layerId of touched) {
        const structured = storeFilters[layerId] ?? {};
        setLayerCql2Filter(layerId, computeMergedCql2(layerId, structured, filters));
      }
    },
    [setLayerCql2Filter, propertyFilters, computeMergedCql2],
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
        <div className="absolute top-4 left-4 right-4 sm:right-auto pointer-events-auto z-10 flex flex-col gap-2 max-h-[calc(100vh-4rem)] max-w-sm overflow-y-auto">
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

      {/* Map controls — render per effective layout */}
      {(() => {
        // Inner panel content (no wrapper) reused by both layouts
        const legendInner = uiConfig.showLegend ? (
          <Legend
            layers={layers}
            visibleLayerIds={activeLayerIds}
            legendOrder={uiConfig.legendOrder}
            onOpacityChange={uiConfig.showLegendOpacity ? setLayerOpacity : undefined}
          />
        ) : null;

        // Suppress the expand-to-modal button in side-menu layout: the
        // ModalShell and SideMenuPanel both render at z-50, creating an
        // overlapping-modal trap where the user can't reach the side-menu
        // close controls while the expanded modal is open.
        const searchExpandable = effectiveLayout !== 'side-menu';
        const searchInner = uiConfig.showSearchPanel ? (
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
            expandable={searchExpandable}
            expanded={searchExpandable ? searchExpanded : undefined}
            onExpandedChange={searchExpandable ? setSearchExpanded : undefined}
            availableProperties={layerQueryables}
            propertyFilters={searchExpandable ? propertyFilters : undefined}
            onPropertyFiltersChange={searchExpandable ? handlePropertyFiltersChange : undefined}
          />
        ) : null;

        const layerInner = uiConfig.showLayerPanel ? (
          <LayerPanel
            layers={layers}
            activeLayerIds={activeLayerIds}
            onToggleVisibility={toggleLayerVisibility}
            onReorder={reorderLayers}
            hideTitle
          />
        ) : null;

        const measureInner = uiConfig.showMeasureTool ? (
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
        ) : null;

        const selectionInner = uiConfig.showSelectionTool ? (
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
        ) : null;

        const imageryInner = uiConfig.showImageryPanel && imageryLayers.length > 0 ? (
          <ImageryPanel
            imageryLayers={imageryLayers}
            onToggleVisibility={toggleImageryLayerVisibility}
            onOpacityChange={setImageryLayerOpacity}
            hideTitle
            className="p-3 max-w-xs"
          />
        ) : null;

        const basemapInner = uiConfig.showBasemapSwitcher ? (
          <BasemapSwitcher
            basemaps={basemaps}
            activeBasemapId={activeBasemapId}
            onSelect={setActiveBasemap}
          />
        ) : null;

        const exportInner = uiConfig.showExportButton || uiConfig.showExportPdf ? (
          <ExportButton
            icon={LuDownload}
            onExport={() => setExportModalOpen(true)}
            loading={exportLoading || pdfLoading}
          />
        ) : null;

        const iconFor = (k: OrderableControlKey, fallback: typeof LuSearch) =>
          getControlIcon(uiConfig.controlIcons?.[k], fallback);

        const cornerClasses: Record<ControlCorner, string> = {
          'top-right': 'absolute top-4 right-4 flex flex-col gap-4 items-end',
          'top-left': 'absolute top-4 left-4 flex flex-col gap-4 items-start',
          'bottom-right': 'absolute bottom-4 right-4 flex flex-col gap-4 items-end',
          'bottom-left': 'absolute bottom-4 left-4 flex flex-col gap-4 items-start',
        };

        if (effectiveLayout === 'side-menu') {
          const items: SideMenuPanelItem[] = [];
          if (searchInner) items.push({ key: 'search', label: 'Search', icon: iconFor('showSearchPanel', LuSearch), content: searchInner });
          if (layerInner) items.push({ key: 'layers', label: 'Layers', icon: iconFor('showLayerPanel', LuLayers3), content: layerInner });
          if (measureInner) items.push({ key: 'measure', label: 'Measure', icon: iconFor('showMeasureTool', LuRuler), content: measureInner });
          if (selectionInner) items.push({ key: 'selection', label: 'Select', icon: iconFor('showSelectionTool', LuMousePointer2), content: selectionInner });
          if (imageryInner) items.push({ key: 'imagery', label: 'Imagery', icon: iconFor('showImageryPanel', TbSatellite), content: imageryInner });
          if (basemapInner) items.push({ key: 'basemap', label: 'Basemap', icon: iconFor('showBasemapSwitcher', LuMap), content: basemapInner });
          if (uiConfig.showExportButton || uiConfig.showExportPdf) items.push({ key: 'export', label: 'Export', icon: iconFor('showExportButton', LuDownload), onAction: () => setExportModalOpen(true) });
          return (
            <>
              <div className="absolute top-4 right-4 flex flex-col gap-4 items-end pointer-events-auto">
                <SideMenuToggle onClick={() => setSideMenuOpen(true)} label="Open menu" />
                {uiConfig.showCompass && (
                  <div ref={compassContainerRef}>
                    <CompassControl bearing={bearing} onReset={() => requestBearing(0)} />
                  </div>
                )}
                {info?.enabled && info.position === 'top-right' && (
                  <InfoControl onClick={() => setInfoModalOpen(true)} title={info.title} />
                )}
              </div>
              {legendInner && (
                <div className={`${cornerClasses[resolveControlCorner(uiConfig, 'showLegend')]} pointer-events-auto`} ref={legendContainerRef}>
                  {legendInner}
                </div>
              )}
              <SideMenuPanel
                controls={items}
                isOpen={sideMenuOpen}
                onClose={() => setSideMenuOpen(false)}
              />
            </>
          );
        }

        const controlNodes: Record<OrderableControlKey, React.ReactNode> = {
          showLegend: legendInner ? (
            <div className="pointer-events-auto" ref={legendContainerRef}>
              {legendInner}
            </div>
          ) : null,

          showSearchPanel: searchInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showSearchPanel', LuSearch)}
                label="Search"
                collapsed={openControl !== 'search'}
                onToggle={(collapsed) => setOpenControl(collapsed ? null : 'search')}
              >
                {searchInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showLayerPanel: layerInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showLayerPanel', LuLayers3)}
                label="Layers"
                collapsed={openControl !== 'layers'}
                onToggle={(collapsed) => setOpenControl(collapsed ? null : 'layers')}
              >
                {layerInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showMeasureTool: measureInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showMeasureTool', LuRuler)}
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
                {measureInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showSelectionTool: selectionInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showSelectionTool', LuMousePointer2)}
                label="Select"
                collapsed={openControl !== 'selection'}
                onToggle={(collapsed) => {
                  setOpenControl(collapsed ? null : 'selection');
                  if (collapsed) {
                    onSelectionModeChange(null);
                  }
                }}
              >
                {selectionInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showImageryPanel: imageryInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showImageryPanel', TbSatellite)}
                label="Imagery"
                collapsed={openControl !== 'imagery'}
                onToggle={(collapsed) => setOpenControl(collapsed ? null : 'imagery')}
              >
                {imageryInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showBasemapSwitcher: basemapInner ? (
            <div className="pointer-events-auto">
              <CollapsibleControl
                icon={iconFor('showBasemapSwitcher', LuMap)}
                label="Basemap"
                collapsed={openControl !== 'basemap'}
                onToggle={(collapsed) => setOpenControl(collapsed ? null : 'basemap')}
              >
                {basemapInner}
              </CollapsibleControl>
            </div>
          ) : null,

          showExportButton: exportInner ? (
            <div className="pointer-events-auto">{exportInner}</div>
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
        onClose={() => {
          setExportModalOpen(false);
          setPdfError(null);
        }}
        pdfAvailable={uiConfig.showExportPdf}
        onPdfExport={handlePdfExport}
        pdfLoading={pdfLoading}
        pdfProgress={pdfProgress}
        pdfError={pdfError}
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

      {/* Bottom-left: Scale Bar (raised above MapLibre attribution line) */}
      {uiConfig.showScaleBar && (
        <div className="absolute bottom-6 left-2 pointer-events-auto">
          <ScaleBarControl zoom={mapZoom} latitude={mapCenterLat} />
        </div>
      )}

      {/* Bottom-center: Coordinate Display */}
      {uiConfig.showCoordinateDisplay && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-auto max-w-[calc(100vw-2rem)]">
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
