import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Map, Source, Layer, AttributionControl, type MapRef } from 'react-map-gl/maplibre';
import { useOgcFeatures, getCql2FilteredVectorTileUrl, resolveStyleWithSprites } from '@ogc-maps/storybook-components/hooks';
import type { CQL2Expression } from '@ogc-maps/storybook-components/hooks';
import type { LayerConfig } from '@ogc-maps/storybook-components/types';
import { useMapStore } from '../stores/mapStore';

function buildGeometryFilter(types: string[]): any {
  return types.length === 1
    ? ['==', ['geometry-type'], types[0]]
    : ['in', ['geometry-type'], ['literal', types]];
}

function getVectorTileSourceKey(layerId: string, cql2Filter?: CQL2Expression | null): string {
  return cql2Filter ? `${layerId}--${JSON.stringify(cql2Filter)}` : layerId;
}

// Inline component for vector tile layers
function VectorTileLayer({
  layer,
  sourceUrl,
  tileMatrixSetId,
  cql2Filter,
}: {
  layer: LayerConfig;
  sourceUrl: string;
  tileMatrixSetId?: string;
  cql2Filter?: CQL2Expression | null;
}) {
  const tileUrl = getCql2FilteredVectorTileUrl(sourceUrl, layer.collection, cql2Filter, tileMatrixSetId);
  const sourceKey = getVectorTileSourceKey(layer.id, cql2Filter);
  const sourceLayer = layer.collection.replace(/^[^.]+\./, '');

  if (!layer.styles?.length) {
    console.warn(`Layer ${layer.id} has no style configuration`);
    return null;
  }

  return (
    <Source id={sourceKey} key={sourceKey} type="vector" tiles={[tileUrl]}>
      {layer.styles.map((style, i) => (
        <Layer
          key={`${style.type}--${i}`}
          id={`${sourceKey}--${style.type}--${i}`}
          type={style.type}
          source-layer={sourceLayer}
          paint={style.paint as any}
          layout={{ ...(style.layout ?? {}), visibility: layer.visible ? 'visible' : 'none' }}
          {...(style.geometryFilter ? { filter: buildGeometryFilter(style.geometryFilter) } : {})}
        />
      ))}
    </Source>
  );
}

// Inline component for GeoJSON layers
function GeoJsonLayer({ layer, sourceUrl, cql2Filter }: { layer: LayerConfig; sourceUrl: string; cql2Filter?: CQL2Expression | null }) {
  const { features, error } = useOgcFeatures(sourceUrl, layer.collection, {
    limit: 10000,
    cql2Filter: cql2Filter ?? undefined,
  });

  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: features || [],
    }),
    [features]
  );

  if (error) {
    console.error(`Error loading GeoJSON for layer ${layer.id}:`, error);
  }

  if (!layer.styles?.length) {
    console.warn(`Layer ${layer.id} has no style configuration`);
    return null;
  }

  return (
    <Source id={layer.id} key={layer.id} type="geojson" data={featureCollection}>
      {layer.styles.map((style, i) => (
        <Layer
          key={`${style.type}--${i}`}
          id={`${layer.id}--${style.type}--${i}`}
          type={style.type}
          paint={style.paint as any}
          layout={{ ...(style.layout ?? {}), visibility: layer.visible ? 'visible' : 'none' }}
          {...(style.geometryFilter ? { filter: buildGeometryFilter(style.geometryFilter) } : {})}
        />
      ))}
    </Source>
  );
}

interface FeatureClickInfo {
  layerId: string;
  properties: Record<string, unknown>;
  lngLat: { lat: number; lng: number };
}

interface FeatureHoverInfo {
  layerId: string;
  properties: Record<string, unknown>;
  point: { x: number; y: number };
}

interface MapContainerProps {
  onMouseMove?: (coords: { latitude: number; longitude: number }) => void;
  onMouseLeave?: () => void;
  onFeatureClick?: (info: FeatureClickInfo) => void;
  onFeatureHover?: (info: FeatureHoverInfo | null) => void;
}

export function MapContainer({ onMouseMove, onMouseLeave, onFeatureClick, onFeatureHover }: MapContainerProps = {}) {
  const viewState = useMapStore((s) => s.viewState);
  const layers = useMapStore((s) => s.layers);
  const sources = useMapStore((s) => s.sources);
  const basemaps = useMapStore((s) => s.basemaps);
  const activeBasemapId = useMapStore((s) => s.activeBasemapId);
  const sprites = useMapStore((s) => s.sprites);
  const activeCql2Filters = useMapStore((s) => s.activeCql2Filters);
  const pendingFitBounds = useMapStore((s) => s.pendingFitBounds);
  const clearPendingFitBounds = useMapStore((s) => s.clearPendingFitBounds);
  const setViewState = useMapStore((s) => s.setViewState);

  const [mapInstance, setMapInstance] = useState<ReturnType<MapRef['getMap']> | null>(null);
  const mapRef = useRef<MapRef>(null);
  const [resolvedStyle, setResolvedStyle] = useState<string | object | undefined>(undefined);

  const handleMapLoad = useCallback(() => {
    setMapInstance(mapRef.current?.getMap() ?? null);
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const handler = (e: { id: string }) => {
      console.warn(
        `Missing sprite image: "${e.id}". ` +
        'Ensure a sprite source containing this image is configured in the Basemaps step.'
      );
    };
    mapInstance.on('styleimagemissing', handler);
    return () => { mapInstance.off('styleimagemissing', handler); };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;
    for (const layer of layers) {
      if (!layer.styles?.length) continue;
      const sourceKey =
        layer.dataMode === 'vector-tiles'
          ? getVectorTileSourceKey(layer.id, activeCql2Filters[layer.id])
          : layer.id;
      layer.styles.forEach((style, i) => {
        const subLayerId = `${sourceKey}--${style.type}--${i}`;
        if (!mapInstance.getLayer(subLayerId)) return;
        for (const [prop, value] of Object.entries(style.paint)) {
          try {
            mapInstance.setPaintProperty(subLayerId, prop, value);
          } catch {
            // Layer may not be added yet
          }
        }
      });
    }
  }, [mapInstance, layers, activeCql2Filters]);

  // Zoom to pending fit bounds
  useEffect(() => {
    if (!pendingFitBounds || !mapRef.current) return;
    mapRef.current.fitBounds(pendingFitBounds, { padding: 50, maxZoom: 12 });
    clearPendingFitBounds();
  }, [pendingFitBounds, clearPendingFitBounds]);

  // Build source URL lookup map with tileMatrixSetId
  const sourceUrlMap = useMemo(() => {
    const urlMap: Record<string, { url: string; tileMatrixSetId?: string }> = {};
    sources.forEach((source) => {
      urlMap[source.id] = {
        url: source.url,
        tileMatrixSetId: source.tileMatrixSetId,
      };
    });
    return urlMap;
  }, [sources]);

  // Get active basemap URL
  const activeBasemap = basemaps.find((b) => b.id === activeBasemapId);
  const mapStyleUrl = activeBasemap?.url || basemaps[0]?.url;

  useEffect(() => {
    if (!mapStyleUrl) return;
    if (!sprites.length) {
      setResolvedStyle(mapStyleUrl);
      return;
    }
    resolveStyleWithSprites(mapStyleUrl, sprites)
      .then(setResolvedStyle)
      .catch((err) => {
        console.warn('Failed to resolve sprite style, using basemap URL:', err);
        setResolvedStyle(mapStyleUrl);
      });
  }, [mapStyleUrl, sprites]);

  const [cursor, setCursor] = useState<string>('auto');

  // Split layers by data mode
  const vectorTileLayers = layers.filter((l) => l.dataMode === 'vector-tiles');
  const geojsonLayers = layers.filter((l) => l.dataMode === 'geojson');

  // IDs of visible layers for feature querying (one per sub-layer)
  const interactiveLayerIds = useMemo(
    () =>
      layers.filter((l) => l.visible).flatMap((l) => {
        const sourceKey =
          l.dataMode === 'vector-tiles'
            ? getVectorTileSourceKey(l.id, activeCql2Filters[l.id])
            : l.id;
        return (l.styles ?? []).map((s, i) => `${sourceKey}--${s.type}--${i}`);
      }),
    [layers, activeCql2Filters],
  );

  // Map from sub-layer ID → parent layer ID for click/hover handlers
  const subLayerToLayerId = useMemo(() => {
    const map: Record<string, string> = {};
    layers.forEach((l) => {
      const sourceKey =
        l.dataMode === 'vector-tiles'
          ? getVectorTileSourceKey(l.id, activeCql2Filters[l.id])
          : l.id;
      (l.styles ?? []).forEach((s, i) => {
        map[`${sourceKey}--${s.type}--${i}`] = l.id;
      });
    });
    return map;
  }, [layers, activeCql2Filters]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={resolvedStyle as any}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      onLoad={handleMapLoad}
      onMove={(evt) => setViewState(evt.viewState)}
      onClick={(evt) => {
        const feature = evt.features?.[0];
        if (feature && onFeatureClick) {
          onFeatureClick({
            layerId: subLayerToLayerId[feature.layer.id] ?? feature.layer.id,
            properties: (feature.properties ?? {}) as Record<string, unknown>,
            lngLat: { lat: evt.lngLat.lat, lng: evt.lngLat.lng },
          });
        }
      }}
      onMouseMove={(evt) => {
        if (onMouseMove) {
          onMouseMove({
            latitude: evt.lngLat.lat,
            longitude: evt.lngLat.lng,
          });
        }
        const feature = evt.features?.[0];
        if (feature) {
          setCursor('pointer');
          if (onFeatureHover) {
            onFeatureHover({
              layerId: subLayerToLayerId[feature.layer.id] ?? feature.layer.id,
              properties: (feature.properties ?? {}) as Record<string, unknown>,
              point: { x: evt.point.x, y: evt.point.y },
            });
          }
        } else {
          setCursor('auto');
          if (onFeatureHover) {
            onFeatureHover(null);
          }
        }
      }}
      onMouseOut={() => {
        setCursor('auto');
        if (onMouseLeave) {
          onMouseLeave();
        }
        if (onFeatureHover) {
          onFeatureHover(null);
        }
      }}
      attributionControl={false}
    >
      <AttributionControl position="bottom-left" />

      {/* Render vector tile layers */}
      {vectorTileLayers.map((layer) => {
        const sourceInfo = sourceUrlMap[layer.sourceId];
        if (!sourceInfo) {
          console.warn(`Source URL not found for layer ${layer.id}`);
          return null;
        }
        return (
          <VectorTileLayer
            key={`${getVectorTileSourceKey(layer.id, activeCql2Filters[layer.id])}--${layer.styles?.length ?? 0}`}
            layer={layer}
            sourceUrl={sourceInfo.url}
            tileMatrixSetId={sourceInfo.tileMatrixSetId}
            cql2Filter={activeCql2Filters[layer.id]}
          />
        );
      })}

      {/* Render GeoJSON layers */}
      {geojsonLayers.map((layer) => {
        const sourceInfo = sourceUrlMap[layer.sourceId];
        if (!sourceInfo) {
          console.warn(`Source URL not found for layer ${layer.id}`);
          return null;
        }
        return <GeoJsonLayer key={`${layer.id}--${layer.styles?.length ?? 0}`} layer={layer} sourceUrl={sourceInfo.url} cql2Filter={activeCql2Filters[layer.id]} />;
      })}
    </Map>
  );
}
