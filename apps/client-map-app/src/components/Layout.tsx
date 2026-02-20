import { useState } from 'react';
import proj4 from 'proj4';
import type { UIConfig } from '@ogc-maps/storybook-components/types';
import {
  formatDecimal,
  formatDMS,
  type CoordinateFormatOption,
} from '@ogc-maps/storybook-components';
import { MapContainer } from './MapContainer';
import { MapOverlay } from './MapOverlay';

interface LayoutProps {
  uiConfig: UIConfig;
}

export function Layout({ uiConfig }: LayoutProps) {
  const [mouseCoords, setMouseCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [coordFormat, setCoordFormat] = useState<string>('decimal');

  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
  } | null>(null);

  const [hoveredFeature, setHoveredFeature] = useState<{
    properties: Record<string, unknown>;
    title?: string;
    point: { x: number; y: number };
  } | null>(null);

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
          onMouseMove={(coords) =>
            setMouseCoords({
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          }
          onMouseLeave={() => setMouseCoords(null)}
          onFeatureClick={(info) =>
            setSelectedFeature({
              properties: info.properties,
              title: (info.properties['name'] as string) ?? info.layerId,
            })
          }
          onFeatureHover={(info) =>
            setHoveredFeature(
              info
                ? {
                    properties: info.properties,
                    title: (info.properties['name'] as string) ?? undefined,
                    point: info.point,
                  }
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
        />
      </div>
    </>
  );
}
