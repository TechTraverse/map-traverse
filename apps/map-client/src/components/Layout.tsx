import { useEffect, useRef, useState } from 'react';
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

interface FeatureInfo {
  properties: Record<string, unknown>;
  title?: string;
  fields?: string[];
  labels?: Record<string, string>;
}

export function Layout({ uiConfig }: LayoutProps) {
  const layers = useMapStore((s) => s.layers);

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
          onFeatureClick={(infos) => {
            setSelectedFeatures(
              infos.map((info) => {
                const layer = layers.find(
                  (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
                );
                const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
                return {
                  properties: info.properties,
                  title: layer?.label ?? (info.properties['name'] as string) ?? info.layerId,
                  fields: resolved?.fields,
                  labels: resolved?.labels,
                };
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
                infos.map((info) => {
                  const layer = layers.find(
                    (l) => info.layerId === l.id || info.layerId.startsWith(l.id + '--'),
                  );
                  const resolved = resolvePropertyDisplay(layer?.propertyDisplay);
                  return {
                    properties: info.properties,
                    title: layer?.label ?? (info.properties['name'] as string),
                    fields: resolved?.fields,
                    labels: resolved?.labels,
                  };
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
        />
      </div>
    </>
  );
}
