import { useOgcCollections } from '../../hooks/useOgcCollections';

export interface CollectionBrowserProps {
  sourceUrl: string;
  selectedCollectionIds: string[];
  onSelect: (collectionId: string) => void;
  onDeselect: (collectionId: string) => void;
}

export function CollectionBrowser({
  sourceUrl,
  selectedCollectionIds,
  onSelect,
  onDeselect,
}: CollectionBrowserProps) {
  const { collections, loading, error } = useOgcCollections(sourceUrl || null);

  if (loading) {
    return (
      <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:py-4 mapui:text-sm mapui:text-gray-500">
        <span className="mapui:inline-block mapui:h-4 mapui:w-4 mapui:animate-spin mapui:rounded-full mapui:border-2 mapui:border-gray-300 mapui:border-t-blue-600" />
        Loading collections…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mapui:rounded mapui:bg-red-50 mapui:p-3 mapui:text-sm mapui:text-red-700">
        Failed to load collections: {error.message}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <p className="mapui:m-0 mapui:text-sm mapui:text-gray-500">
        No collections found at this source.
      </p>
    );
  }

  return (
    <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1 mapui:p-0">
      {collections.map((collection) => {
        const isSelected = selectedCollectionIds.includes(collection.id);
        return (
          <li
            key={collection.id}
            className="mapui:flex mapui:items-start mapui:gap-3 mapui:rounded mapui:border mapui:border-gray-200 mapui:p-2 hover:mapui:bg-gray-50"
          >
            <input
              type="checkbox"
              id={`collection-${collection.id}`}
              checked={isSelected}
              onChange={() => (isSelected ? onDeselect(collection.id) : onSelect(collection.id))}
              className="mapui:mt-0.5 mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:accent-blue-600"
            />
            <label
              htmlFor={`collection-${collection.id}`}
              className="mapui:flex mapui:cursor-pointer mapui:flex-col mapui:gap-0.5"
            >
              <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">
                {collection.title ?? collection.id}
              </span>
              <span className="mapui:font-mono mapui:text-xs mapui:text-gray-500">
                {collection.id}
              </span>
              {collection.description && (
                <span className="mapui:text-xs mapui:text-gray-400 mapui:line-clamp-2">
                  {collection.description}
                </span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
