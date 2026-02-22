import { useState, useEffect, useMemo } from 'react';
import { Map, Source, Layer, AttributionControl } from 'react-map-gl/maplibre';
import {
  getVectorTileUrl,
  useOgcFeatures,
} from '@ogc-maps/storybook-components/hooks';
import type {
  OgcApiSource,
  LayerConfig,
  BasemapConfig,
  ViewConfig,
} from '@ogc-maps/storybook-components';

const FALLBACK_BASEMAP_URL = 'https://demotiles.maplibre.org/style.json';

function PreviewVectorTileLayer({
  layer,
  sourceUrl,
  tileMatrixSetId,
}: {
  layer: LayerConfig;
  sourceUrl: string;
  tileMatrixSetId?: string;
}) {
  if (!layer.style) return null;

  const tileUrl = getVectorTileUrl(sourceUrl, layer.collection, tileMatrixSetId);

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

function PreviewGeoJsonLayer({
  layer,
  sourceUrl,
}: {
  layer: LayerConfig;
  sourceUrl: string;
}) {
  const { features } = useOgcFeatures(sourceUrl, layer.collection, { limit: 10000 });

  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: features || [],
    }),
    [features],
  );

  if (!layer.style) return null;

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

export interface MapPreviewProps {
  sources: OgcApiSource[];
  layers: LayerConfig[];
  basemaps: BasemapConfig[];
  viewState: ViewConfig;
  onViewStateChange?: (view: ViewConfig) => void;
  currentStep: string;
}

export function MapPreview({
  sources,
  layers,
  basemaps,
  viewState,
  onViewStateChange,
  currentStep,
}: MapPreviewProps) {
  const [internalViewState, setInternalViewState] = useState<ViewConfig>(viewState);

  // Reset viewport when entering the view step or when the prop changes while on that step
  useEffect(() => {
    if (onViewStateChange) {
      setInternalViewState(viewState);
    }
  }, [onViewStateChange, viewState]);

  const sourceUrlMap = useMemo(() => {
    const map: Record<string, { url: string; tileMatrixSetId?: string }> = {};
    sources.forEach((source) => {
      map[source.id] = { url: source.url, tileMatrixSetId: source.tileMatrixSetId };
    });
    return map;
  }, [sources]);

  const mapStyle = basemaps[0]?.url ?? FALLBACK_BASEMAP_URL;

  const vectorTileLayers = layers.filter((l) => l.dataMode === 'vector-tiles');
  const geojsonLayers = layers.filter((l) => l.dataMode === 'geojson');

  const showEmptyState = currentStep === 'metadata' || (sources.length === 0 && layers.length === 0);

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
        onMove={handleMove}
        attributionControl={false}
      >
        <AttributionControl position="bottom-left" />

        {!showEmptyState && vectorTileLayers.map((layer) => {
          const sourceInfo = sourceUrlMap[layer.sourceId];
          if (!sourceInfo) return null;
          return (
            <PreviewVectorTileLayer
              key={layer.id}
              layer={layer}
              sourceUrl={sourceInfo.url}
              tileMatrixSetId={sourceInfo.tileMatrixSetId}
            />
          );
        })}

        {!showEmptyState && geojsonLayers.map((layer) => {
          const sourceInfo = sourceUrlMap[layer.sourceId];
          if (!sourceInfo) return null;
          return (
            <PreviewGeoJsonLayer
              key={layer.id}
              layer={layer}
              sourceUrl={sourceInfo.url}
            />
          );
        })}
      </Map>

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
