import { useMemo, useState } from 'react';
import { Map, Source, Layer, AttributionControl } from 'react-map-gl/maplibre';
import { useOgcFeatures, getFilteredVectorTileUrl } from '@ogc-maps/storybook-components/hooks';
import type { LayerConfig, SearchFilterValues } from '@ogc-maps/storybook-components/types';
import { useMapStore } from '../stores/mapStore';

/** Strip undefined/empty-string values from filters to produce a clean Record. */
function cleanFilters(
  filters?: SearchFilterValues,
): Record<string, string | number> | undefined {
  if (!filters) return undefined;
  const cleaned: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

// Inline component for vector tile layers
function VectorTileLayer({
  layer,
  sourceUrl,
  tileMatrixSetId,
  filter
}: {
  layer: LayerConfig;
  sourceUrl: string;
  tileMatrixSetId?: string;
  filter?: Record<string, string | number>;
}) {
  const tileUrl = getFilteredVectorTileUrl(sourceUrl, layer.collection, filter, tileMatrixSetId);

  if (!layer.style) {
    console.warn(`Layer ${layer.id} has no style configuration`);
    return null;
  }

  return (
    <Source id={layer.id} key={layer.id} type="vector" tiles={[tileUrl]}>
      <Layer
        id={layer.id}
        type={layer.style.type}
        source-layer={layer.collection.replace(/^[^.]+\./, '')}
        paint={layer.style.paint as any}
        layout={{ visibility: layer.visible ? 'visible' : 'none' }}
      />
    </Source>
  );
}

// Inline component for GeoJSON layers
function GeoJsonLayer({ layer, sourceUrl, filter }: { layer: LayerConfig; sourceUrl: string; filter?: Record<string, string | number> }) {
  const { features, error } = useOgcFeatures(sourceUrl, layer.collection, {
    limit: 10000,
    filter,
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

  if (!layer.style) {
    console.warn(`Layer ${layer.id} has no style configuration`);
    return null;
  }

  return (
    <Source id={layer.id} key={layer.id} type="geojson" data={featureCollection}>
      <Layer
        id={layer.id}
        type={layer.style.type}
        paint={layer.style.paint as any}
        layout={{ visibility: layer.visible ? 'visible' : 'none' }}
      />
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
  const activeFilters = useMapStore((s) => s.activeFilters);
  const setViewState = useMapStore((s) => s.setViewState);

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
  const mapStyle = activeBasemap?.url || basemaps[0]?.url;

  const [cursor, setCursor] = useState<string>('auto');

  // Split layers by data mode
  const vectorTileLayers = layers.filter((l) => l.dataMode === 'vector-tiles');
  const geojsonLayers = layers.filter((l) => l.dataMode === 'geojson');

  // IDs of visible layers for feature querying
  const interactiveLayerIds = useMemo(
    () => layers.filter((l) => l.visible).map((l) => l.id),
    [layers],
  );

  return (
    <Map
      {...viewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      cursor={cursor}
      interactiveLayerIds={interactiveLayerIds}
      onMove={(evt) => setViewState(evt.viewState)}
      onClick={(evt) => {
        const feature = evt.features?.[0];
        if (feature && onFeatureClick) {
          onFeatureClick({
            layerId: feature.layer.id,
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
              layerId: feature.layer.id,
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
            key={layer.id}
            layer={layer}
            sourceUrl={sourceInfo.url}
            tileMatrixSetId={sourceInfo.tileMatrixSetId}
            filter={cleanFilters(activeFilters[layer.id])}
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
        return <GeoJsonLayer key={layer.id} layer={layer} sourceUrl={sourceInfo.url} filter={cleanFilters(activeFilters[layer.id])} />;
      })}
    </Map>
  );
}
