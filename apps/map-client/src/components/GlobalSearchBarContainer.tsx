import { GlobalSearchBar } from '@techtraverse/map-ui-lib';
import { useMapStore } from '../stores/mapStore';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

/**
 * Wires the lib's GlobalSearchBar to the map-client store via useGlobalSearch.
 * Positioning + width are applied by the parent overlay.
 */
export function GlobalSearchBarContainer() {
  const layers = useMapStore((s) => s.layers);
  const globalSearchConfig = useMapStore((s) => s.globalSearchConfig);
  const uiConfig = useMapStore((s) => s.uiConfig);

  const { query, setQuery, results, isLoading, onResultClick } = useGlobalSearch();

  if (uiConfig?.showGlobalSearch !== true || globalSearchConfig?.enabled !== true) {
    return null;
  }

  return (
    <GlobalSearchBar
      config={globalSearchConfig}
      layers={layers}
      value={query}
      onChange={setQuery}
      results={results}
      onResultClick={onResultClick}
      isLoading={isLoading}
      className="mapui:shadow-lg"
    />
  );
}
