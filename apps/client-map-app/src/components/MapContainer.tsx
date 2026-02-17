import { useMemo } from 'react';
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

interface MapContainerProps {
  onMouseMove?: (coords: { latitude: number; longitude: number }) => void;
  onMouseLeave?: () => void;
}

export function MapContainer({ onMouseMove, onMouseLeave }: MapContainerProps = {}) {
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

  // Split layers by data mode
  const vectorTileLayers = layers.filter((l) => l.dataMode === 'vector-tiles');
  const geojsonLayers = layers.filter((l) => l.dataMode === 'geojson');

  return (
    <Map
      {...viewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onMove={(evt) => setViewState(evt.viewState)}
      onMouseMove={(evt) => {
        if (onMouseMove) {
          onMouseMove({
            latitude: evt.lngLat.lat,
            longitude: evt.lngLat.lng,
          });
        }
      }}
      onMouseOut={() => {
        if (onMouseLeave) {
          onMouseLeave();
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
