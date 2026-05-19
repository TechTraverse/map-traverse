import { GlobalSearchBar } from '@ogc-maps/storybook-components';
import { useMapStore } from '../stores/mapStore';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

/**
 * Thin wrapper that wires the lib's GlobalSearchBar to the map-client store
 * via the useGlobalSearch hook. Renders nothing when global search is disabled.
 * Positioning + width come from the parent overlay; this component only owns
 * wiring and the bar itself.
 */
export function GlobalSearchBarContainer({ className = '' }: { className?: string }) {
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
      className={`mapui:shadow-lg ${className}`.trim()}
    />
  );
}
