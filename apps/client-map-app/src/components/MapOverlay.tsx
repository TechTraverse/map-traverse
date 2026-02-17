import { useCallback, useState } from 'react';
import {
  LayerPanel,
  Legend,
  BasemapSwitcher,
  SearchPanel,
  CollapsibleControl,
  CoordinateDisplay,
  type CoordinateFormatOption,
} from '@ogc-maps/storybook-components';
import type { UIConfig } from '@ogc-maps/storybook-components/types';
import { useMapStore, useActiveLayerIds } from '../stores/mapStore';
import { LuLayers3, LuMap, LuSearch } from 'react-icons/lu';

interface MapOverlayProps {
  uiConfig: UIConfig;
  mouseCoords: { latitude: number; longitude: number } | null;
  activeCoordFormat: string;
  coordinateFormats: CoordinateFormatOption[];
  onCoordFormatChange: (formatId: string) => void;
}

export function MapOverlay({
  uiConfig,
  mouseCoords,
  activeCoordFormat,
  coordinateFormats,
  onCoordFormatChange,
}: MapOverlayProps) {
  const layers = useMapStore((s) => s.layers);
  const basemaps = useMapStore((s) => s.basemaps);
  const sources = useMapStore((s) => s.sources);
  const activeBasemapId = useMapStore((s) => s.activeBasemapId);
  const activeFilters = useMapStore((s) => s.activeFilters);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);
  const reorderLayers = useMapStore((s) => s.reorderLayers);
  const setActiveBasemap = useMapStore((s) => s.setActiveBasemap);
  const setLayerFilters = useMapStore((s) => s.setLayerFilters);
  const clearLayerFilters = useMapStore((s) => s.clearLayerFilters);
  const activeLayerIds = useActiveLayerIds();

  // Accordion state: track which control is currently open
  const [openControl, setOpenControl] = useState<string | null>(null);

  const handleFilterChange = useCallback(
    (layerId: string, property: string, value: string | number | undefined) => {
      const current = useMapStore.getState().activeFilters[layerId] ?? {};
      setLayerFilters(layerId, { ...current, [property]: value });
    },
    [setLayerFilters],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-right: Legend and controls stacked vertically */}
      <div className="absolute top-4 right-4 flex flex-col gap-4 items-end">
        {uiConfig.showLegend && (
          <div className="pointer-events-auto">
            <Legend layers={layers} visibleLayerIds={activeLayerIds} />
          </div>
        )}

        {uiConfig.showSearchPanel && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuSearch}
              label="Search"
              collapsed={openControl !== 'search'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'search')}
            >
              <SearchPanel
                layers={layers}
                sources={sources}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearLayerFilters}
                className="p-3 max-w-xs"
              />
            </CollapsibleControl>
          </div>
        )}

        {uiConfig.showLayerPanel && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuLayers3}
              label="Layers"
              collapsed={openControl !== 'layers'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'layers')}
            >
              <LayerPanel
                layers={layers}
                activeLayerIds={activeLayerIds}
                onToggleVisibility={toggleLayerVisibility}
                onReorder={reorderLayers}
              />
            </CollapsibleControl>
          </div>
        )}

        {uiConfig.showBasemapSwitcher && (
          <div className="pointer-events-auto">
            <CollapsibleControl
              icon={LuMap}
              label="Basemap"
              collapsed={openControl !== 'basemap'}
              onToggle={(collapsed) => setOpenControl(collapsed ? null : 'basemap')}
            >
              <BasemapSwitcher
                basemaps={basemaps}
                activeBasemapId={activeBasemapId}
                onSelect={setActiveBasemap}
              />
            </CollapsibleControl>
          </div>
        )}
      </div>

      {/* Bottom-center: Coordinate Display */}
      {uiConfig.showCoordinateDisplay && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-auto">
          <CoordinateDisplay
            latitude={mouseCoords?.latitude ?? null}
            longitude={mouseCoords?.longitude ?? null}
            activeFormat={activeCoordFormat}
            formats={coordinateFormats}
            onFormatChange={onCoordFormatChange}
          />
        </div>
      )}
    </div>
  );
}
