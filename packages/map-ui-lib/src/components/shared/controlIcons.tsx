import type { IconType } from 'react-icons';
import {
  LuCompass,
  LuDownload,
  LuFileText,
  LuFilter,
  LuGlobe,
  LuImage,
  LuInfo,
  LuLayers,
  LuLayers3,
  LuList,
  LuMap,
  LuMapPin,
  LuMenu,
  LuMousePointer2,
  LuRuler,
  LuSearch,
  LuSettings,
  LuSlidersHorizontal,
  LuSatellite,
  LuStar,
  LuTarget,
} from 'react-icons/lu';

/**
 * Map of icon name → component used by `UIConfigEditor` (icon picker) and
 * `MapOverlay` (icon resolution) so admins can pick a custom icon per control.
 */
export const CONTROL_ICON_MAP: Record<string, IconType> = {
  compass: LuCompass,
  download: LuDownload,
  file: LuFileText,
  filter: LuFilter,
  globe: LuGlobe,
  image: LuImage,
  info: LuInfo,
  layers: LuLayers,
  layers3: LuLayers3,
  list: LuList,
  map: LuMap,
  pin: LuMapPin,
  menu: LuMenu,
  pointer: LuMousePointer2,
  ruler: LuRuler,
  search: LuSearch,
  settings: LuSettings,
  sliders: LuSlidersHorizontal,
  star: LuStar,
  target: LuTarget,
  satellite: LuSatellite,
};

export const CONTROL_ICON_NAMES: string[] = Object.keys(CONTROL_ICON_MAP);

/** Resolve a control icon by name, falling back to `fallback` if not found. */
export function getControlIcon(name: string | undefined, fallback: IconType): IconType {
  if (!name) return fallback;
  return CONTROL_ICON_MAP[name] ?? fallback;
}
