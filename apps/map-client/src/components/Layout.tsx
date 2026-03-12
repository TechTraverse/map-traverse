import { useState } from 'react';
import proj4 from 'proj4';
import type { UIConfig } from '@ogc-maps/storybook-components/types';
import {
  formatDecimal,
  formatDMS,
  type CoordinateFormatOption,
} from '@ogc-maps/storybook-components';
import { useMeasure } from '@ogc-maps/storybook-components/hooks';
import { resolvePropertyDisplay } from '@ogc-maps/storybook-components/hooks';
import { useMapStore } from '../stores/mapStore';
import { MapContainer } from './MapContainer';
import { MapOverlay } from './MapOverlay';

interface LayoutProps {
  uiConfig: UIConfig;
}

export function Layout({ uiConfig }: LayoutProps) {
  const layers = useMapStore((s) => s.layers);

  const [mouseCoords, setMouseCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [coordFormat, setCoordFormat] = useState<string>('decimal');

  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
  } | null>(null);

  const [hoveredFeature, setHoveredFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
    fields?: string[];
    labels?: Record<string, string>;
    point: { x: number; y: number };
  } | null>(null);

  // Measure tool state
  const measure = useMeasure();

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
      <header className="bg-slate-800 text-white px-6 py-4 shadow-lg">
        <h1 className="text-lg font-semibold">
          Example Map for OGC APIs with Storybook Components
        </h1>
      </header>
      <div className="relative flex-grow w-full">
        <MapContainer
          measureMode={measure.mode}
          measurePoints={measure.points}
          measureGeometryData={measure.geometryData}
          measurePointsData={measure.pointsData}
          onMeasureClick={measure.addPoint}
          onMouseMove={(coords) =>
            setMouseCoords({
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          }
          onMouseLeave={() => setMouseCoords(null)}
          onFeatureClick={(info) => {
            const layer = layers.find(
              (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
            );
            const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
            setSelectedFeature({
              properties: info.properties,
              title: (info.properties['name'] as string) ?? info.layerId,
              fields: resolved?.fields,
              labels: resolved?.labels,
            });
          }}
          onFeatureHover={(info) =>
            setHoveredFeature(
              info
                ? (() => {
                    const layer = layers.find(
                      (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
                    );
                    const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
                    return {
                      properties: info.properties,
                      title: (info.properties['name'] as string) ?? undefined,
                      fields: resolved?.fields,
                      labels: resolved?.labels,
                      point: info.point,
                    };
                  })()
                : null,
            )
          }
        />
        <MapOverlay
          uiConfig={uiConfig}
          mouseCoords={mouseCoords}
          activeCoordFormat={coordFormat}
          coordinateFormats={coordinateFormats}
          onCoordFormatChange={setCoordFormat}
          selectedFeature={selectedFeature}
          onCloseFeatureDetail={() => setSelectedFeature(null)}
          hoveredFeature={hoveredFeature}
          measureMode={measure.mode}
          onMeasureModeChange={measure.setMode}
          measurePoints={measure.points}
          measurement={measure.measurement}
          measureUnit={measure.unit}
          onMeasureUnitChange={measure.setUnit}
          onMeasureClear={measure.clear}
        />
      </div>
    </>
  );
}
