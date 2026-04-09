import { GlobalSearchBar } from '@ogc-maps/storybook-components';
import { useMapStore } from '../stores/mapStore';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

/**
 * Thin wrapper that wires the lib's GlobalSearchBar to the map-client store
 * via the useGlobalSearch hook. Renders nothing when global search is disabled
 * by either uiConfig.showGlobalSearch or globalSearchConfig.enabled.
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
    <div className="w-full border-b border-gray-200 bg-white px-4 py-2">
      <GlobalSearchBar
        config={globalSearchConfig}
        layers={layers}
        value={query}
        onChange={setQuery}
        results={results}
        onResultClick={onResultClick}
        isLoading={isLoading}
      />
    </div>
  );
}
