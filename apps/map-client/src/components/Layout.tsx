import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import proj4 from 'proj4';
import type { MapRef } from 'react-map-gl/maplibre';
import type { UIConfig } from '@ogc-maps/storybook-components/types';
import { DEFAULT_HEADER_COLOR } from '@ogc-maps/storybook-components/schemas';
import {
  formatDecimal,
  formatDMS,
  ResultsDrawer,
  type CoordinateFormatOption,
} from '@ogc-maps/storybook-components';
import type { ResultsDrawerTab } from '@ogc-maps/storybook-components';
import { useMeasure, useSelection } from '@ogc-maps/storybook-components/hooks';
import {
  fetchFeatureById,
  resolvePropertyDisplay,
  buildCql2Query,
  fetchFeatures,
  combineGeometries,
} from '@ogc-maps/storybook-components/utils';
import type { Cql2FilterConfig } from '@ogc-maps/storybook-components/types';
import { useMapStore } from '../stores/mapStore';
import { MapContainer } from './MapContainer';
import { MapOverlay } from './MapOverlay';
import { GlobalSearchBarContainer } from './GlobalSearchBarContainer';
import { useBoxDraw } from '../hooks/useBoxDraw';
import { usePolygonDraw } from '../hooks/usePolygonDraw';

interface LayoutProps {
  uiConfig: UIConfig;
}

interface FeatureInfo {
  properties: Record<string, unknown>;
  title?: string;
  fields?: string[];
  labels?: Record<string, string>;
}

export function Layout({ uiConfig }: LayoutProps) {
  const layers = useMapStore((s) => s.layers);
  const branding = useMapStore((s) => s.branding);

  const [mouseCoords, setMouseCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [coordFormat, setCoordFormat] = useState<string>('decimal');

  const [selectedFeatures, setSelectedFeatures] = useState<FeatureInfo[]>([]);

  const [hoveredFeatures, setHoveredFeatures] = useState<FeatureInfo[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  // Measure tool state
  const measure = useMeasure();

  // Selection tool state
  const selection = useSelection();
  const [resultsOpen, setResultsOpen] = useState(false);
  const mapRefForBoxDraw = useRef<MapRef>(null);

  const activeCql2Filters = useMapStore((s) => s.activeCql2Filters);
  const sources = useMapStore((s) => s.sources);

  // Query state
  const [queryResults, setQueryResults] = useState<Array<{ properties: Record<string, unknown>; geometry?: Record<string, unknown> }> | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultsActiveTab, setResultsActiveTab] = useState<string>('selected');

  // Active layer for query support
  const activeLayer = useMemo(
    () => layers.find((l) => l.id === selection.activeLayerId),
    [layers, selection.activeLayerId],
  );

  // Clear query results when layer changes
  useEffect(() => { setQueryResults(null); }, [selection.activeLayerId]);

  const handleRunQuery = useCallback(async (params: Record<string, unknown>) => {
    if (!activeLayer?.cql2Filter) return;
    const source = sources.find((s) => s.id === activeLayer.sourceId);
    if (!source) return;

    const selectionGeometry = combineGeometries(selection.features.map((f) => f.geometry));
    setQueryLoading(true);
    setQueryError(null);
    try {
      const query = buildCql2Query(activeLayer.cql2Filter as Cql2FilterConfig, params, selectionGeometry as any);
      const data = await fetchFeatures(source.url, activeLayer.collection, {
        cql2Filter: query.filter ?? undefined,
        limit: query.limit,
        sortby: query.sortby,
      });
      setQueryResults(data.features.map((f) => ({ properties: (f.properties ?? {}) as Record<string, unknown>, geometry: f.geometry as Record<string, unknown> | undefined })));
      setResultsActiveTab('query');
      setResultsOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setQueryError(message);
      console.error('Query failed:', err);
    } finally {
      setQueryLoading(false);
    }
  }, [activeLayer, sources, selection.features]);

  // Build tabs for ResultsDrawer
  const resultsTabs = useMemo((): ResultsDrawerTab[] => {
    const tabs: ResultsDrawerTab[] = [{
      id: 'selected',
      label: 'Selected Features',
      features: selection.features.map((f) => ({ properties: f.properties, geometry: f.geometry })),
      onClear: () => { selection.clearFeatures(); if (!queryResults) setResultsOpen(false); },
    }];
    if (queryResults) {
      tabs.push({
        id: 'query',
        label: 'Query Results',
        features: queryResults,
        onClear: () => { setQueryResults(null); setResultsActiveTab('selected'); },
        onExport: () => {
          const rows = queryResults;
          if (!rows.length) return;
          const cols = Object.keys(rows[0].properties);
          const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => {
            const v = r.properties[c];
            const s = v == null ? '' : String(v);
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(','))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `query-results.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
      });
    }
    return tabs;
  }, [selection.features, queryResults]);

  // Query results highlight data for the map
  const queryHighlightData = useMemo(() => {
    if (!queryResults?.length) return null;
    return {
      type: 'FeatureCollection' as const,
      features: queryResults.filter((f) => f.geometry).map((f, i) => ({
        type: 'Feature' as const,
        id: i,
        properties: {},
        geometry: f.geometry!,
      })),
    };
  }, [queryResults]);

  const selectionQueryLayerIds = useMemo(() => {
    if (!selection.activeLayerId) return [];
    const layer = layers.find((l) => l.id === selection.activeLayerId);
    if (!layer) return [];
    const sourceKey = layer.dataMode === 'vector-tiles'
      ? (activeCql2Filters[layer.id] ? `${layer.id}--${JSON.stringify(activeCql2Filters[layer.id])}` : layer.id)
      : layer.id;
    return (layer.styles ?? []).map((s, i) => `${sourceKey}--${s.type}--${i}`);
  }, [selection.activeLayerId, layers, activeCql2Filters]);

  const handleSpatialSelectionComplete = useCallback(
    (features: Array<{ id?: string | number; properties: Record<string, unknown>; geometry: Record<string, unknown> }>) => {
      if (!selection.activeLayerId) return;
      selection.addFeatures(
        features.map((f) => ({
          id: f.id,
          layerId: selection.activeLayerId!,
          properties: f.properties,
          geometry: f.geometry,
        })),
      );
    },
    [selection.activeLayerId, selection.addFeatures],
  );

  const { boxDrawData } = useBoxDraw({
    mapRef: mapRefForBoxDraw,
    enabled: selection.mode === 'box' && selection.activeLayerId != null,
    queryLayerIds: selectionQueryLayerIds,
    onComplete: handleSpatialSelectionComplete,
  });

  const polygonDraw = usePolygonDraw({
    mapRef: mapRefForBoxDraw,
    enabled: selection.mode === 'polygon' && selection.activeLayerId != null,
    queryLayerIds: selectionQueryLayerIds,
    onComplete: handleSpatialSelectionComplete,
  });

  // Define coordinate formats including projected CRS
  const coordinateFormats: CoordinateFormatOption[] = [
    { id: 'decimal', label: 'Decimal', format: formatDecimal },
    { id: 'dms', label: 'DMS', format: formatDMS },
    {
      id: 'epsg3857',
      label: 'EPSG:3857',
      format: (lat: number, lng: number) => {
        const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [lng, lat]);
        return `${x.toFixed(2)}, ${y.toFixed(2)}`;
      },
    },
  ];

  return (
    <>
      <header
        className="relative z-10 overflow-visible text-white px-6 shadow-lg"
        style={{ backgroundColor: branding?.headerColor ?? DEFAULT_HEADER_COLOR, height: 56 }}
      >
        <div className="flex h-full items-center gap-3">
          {branding?.logoDataUrl && (
            <img
              src={branding.logoDataUrl}
              alt=""
              className="w-auto self-start"
              style={{ height: branding?.logoHeight ?? 32 }}
            />
          )}
          <h1 className="text-lg font-semibold">
            {branding?.headerTitle ?? 'Map'}
          </h1>
        </div>
      </header>
      <GlobalSearchBarContainer />
      <div className="relative flex-grow w-full">
        <MapContainer
          externalMapRef={mapRefForBoxDraw}
          measureMode={measure.mode}
          measurePoints={measure.points}
          measureGeometryData={measure.geometryData}
          measurePointsData={measure.pointsData}
          onMeasureClick={measure.addPoint}
          selectionMode={selection.mode}
          selectionLayerId={selection.activeLayerId}
          selectionHighlightData={selection.highlightData}
          queryHighlightData={queryHighlightData as unknown as GeoJSON.FeatureCollection | null}
          boxDrawData={boxDrawData}
          polygonDrawData={polygonDraw.polygonDrawData}
          polygonDrawPointsData={polygonDraw.polygonDrawPointsData}
          onPolygonDrawClick={polygonDraw.addPoint}
          onPolygonDrawComplete={polygonDraw.complete}
          onSelectionClick={(features) => {
            if (!selection.activeLayerId) return;
            const layer = layers.find((l) => l.id === selection.activeLayerId);
            const source = layer ? useMapStore.getState().sources.find((s) => s.id === layer.sourceId) : null;
            if (layer && source && layer.dataMode === 'vector-tiles') {
              // Fetch full geometry from OGC API for vector tile features
              const tileFeatures = features.map((f) => ({
                id: f.id,
                layerId: selection.activeLayerId!,
                properties: f.properties,
                geometry: f.geometry,
              }));
              Promise.allSettled(
                features.map(async (f) => {
                  const featureId = f.properties?.gid ?? f.id;
                  if (featureId != null) {
                    const full = await fetchFeatureById(source.url, layer.collection, featureId as string | number);
                    if (full) {
                      return { id: f.id, layerId: selection.activeLayerId!, properties: (full.properties ?? {}) as Record<string, unknown>, geometry: full.geometry as unknown as Record<string, unknown> };
                    }
                  }
                  return { id: f.id, layerId: selection.activeLayerId!, properties: f.properties, geometry: f.geometry };
                }),
              ).then((results) => {
                const resolved = results.map((r, i) => r.status === 'fulfilled' ? r.value : tileFeatures[i]);
                selection.addFeatures(resolved);
              });
            } else {
              selection.addFeatures(
                features.map((f) => ({
                  id: f.id,
                  layerId: selection.activeLayerId!,
                  properties: f.properties,
                  geometry: f.geometry,
                })),
              );
            }
          }}
          onMouseMove={(coords) =>
            setMouseCoords({
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          }
          onMouseLeave={() => setMouseCoords(null)}
          onFeatureClick={(infos) => {
            setSelectedFeatures(
              infos.flatMap((info) => {
                const layer = layers.find(
                  (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
                );
                if (layer?.showDetailPanel === false) return [];
                const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
                return [{
                  properties: info.properties,
                  title: layer?.label ?? (info.properties['name'] as string) ?? info.layerId,
                  fields: resolved?.fields,
                  labels: resolved?.labels,
                }];
              }),
            );
          }}
          onFeatureHover={(infos) => {
            clearTimeout(hoverTimerRef.current);
            if (!infos) {
              setHoveredFeatures([]);
              setHoveredPoint(null);
              return;
            }
            hoverTimerRef.current = setTimeout(() => {
              setHoveredPoint(infos[0]?.point ?? null);
              setHoveredFeatures(
                infos.flatMap((info) => {
                  const layer = layers.find(
                    (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
                  );
                  if (layer?.showTooltip === false) return [];
                  const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
                  return [{
                    properties: info.properties,
                    title: layer?.label ?? (info.properties['name'] as string),
                    fields: resolved?.fields,
                    labels: resolved?.labels,
                  }];
                }),
              );
            }, 1000);
          }}
        />
        <MapOverlay
          uiConfig={uiConfig}
          mouseCoords={mouseCoords}
          activeCoordFormat={coordFormat}
          coordinateFormats={coordinateFormats}
          onCoordFormatChange={setCoordFormat}
          selectedFeatures={selectedFeatures}
          onCloseFeatureDetail={(index) =>
            setSelectedFeatures((prev) => prev.filter((_, i) => i !== index))
          }
          hoveredFeatures={hoveredFeatures}
          hoveredPoint={hoveredPoint}
          measureMode={measure.mode}
          onMeasureModeChange={measure.setMode}
          measurePoints={measure.points}
          measurement={measure.measurement}
          measureUnit={measure.unit}
          onMeasureUnitChange={measure.setUnit}
          onMeasureClear={measure.clear}
          selectionMode={selection.mode}
          onSelectionModeChange={selection.setMode}
          selectionActiveLayerId={selection.activeLayerId}
          onSelectionActiveLayerChange={selection.setActiveLayerId}
          selectionCount={selection.features.length}
          onSelectionClear={selection.clearFeatures}
          onSelectionViewResults={() => setResultsOpen(true)}
          queryFilter={activeLayer?.cql2Filter as Cql2FilterConfig | undefined}
          onRunQuery={handleRunQuery}
          queryLoading={queryLoading}
          queryError={queryError}
          hasSelectionGeometry={selection.features.length > 0}
        />
        <ResultsDrawer
          open={resultsOpen}
          tabs={resultsTabs}
          activeTabId={resultsActiveTab}
          onTabChange={setResultsActiveTab}
          onClose={() => setResultsOpen(false)}
        />
      </div>
    </>
  );
}
