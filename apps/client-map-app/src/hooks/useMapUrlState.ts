import { z } from 'zod';
import {
  useQueryStates,
  parseAsFloat,
  parseAsString,
  parseAsArrayOf,
  parseAsJson,
} from 'nuqs';

// Viewport params: debounced, replace history
const viewportParsers = {
  lat: parseAsFloat,
  lng: parseAsFloat,
  zoom: parseAsFloat,
  pitch: parseAsFloat,
  bearing: parseAsFloat,
};

// Layer/basemap params: push history
const stateParsers = {
  layers: parseAsArrayOf(parseAsString),
  basemap: parseAsString,
  filters: parseAsJson(
    z.record(z.record(z.union([z.string(), z.number()])))
  ),
};

export function useMapUrlState() {
  const [viewportState, setViewportState] = useQueryStates(viewportParsers, {
    history: 'replace',
    // Debounce viewport changes to avoid spamming history
    throttleMs: 300,
  });

  const [layerState, setLayerState] = useQueryStates(stateParsers, {
    history: 'push',
  });

  return {
    // Viewport
    viewportState,
    setViewportState,

    // Layers/basemap
    layerState,
    setLayerState,
  };
}
