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
import { useMeasure } from '@ogc-maps/storybook-components/hooks';
import { useSelection } from '@ogc-maps/storybook-components/hooks';
import { fetchFeatureById } from '@ogc-maps/storybook-components/hooks';
import { resolvePropertyDisplay } from '@ogc-maps/storybook-components/hooks';
import { useMapStore } from '../stores/mapStore';
import { MapContainer } from './MapContainer';
import { MapOverlay } from './MapOverlay';
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
        />
        <ResultsDrawer
          open={resultsOpen}
          features={selection.features.map((f) => ({ properties: f.properties, geometry: f.geometry }))}
          title={`Selected Features${selection.activeLayerId ? ` — ${layers.find((l) => l.id === selection.activeLayerId)?.label ?? ''}` : ''}`}
          onClose={() => setResultsOpen(false)}
          onClearSelection={() => {
            selection.clearFeatures();
            setResultsOpen(false);
          }}
        />
      </div>
    </>
  );
}
