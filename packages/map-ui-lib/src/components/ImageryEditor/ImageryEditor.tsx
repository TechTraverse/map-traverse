import type { ImageryLayerConfig, OgcApiSource } from '../../types';
import { useOgcCollections } from '../../hooks/useOgcCollections';
import { FormField } from '../admin/FormField';

export interface ImageryEditorProps {
  value: ImageryLayerConfig;
  onChange: (layer: ImageryLayerConfig) => void;
  availableSources?: OgcApiSource[];
  /** Resolved base URL for the selected source — enables collection dropdown */
  sourceUrl?: string;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function ImageryEditor({
  value,
  onChange,
  availableSources = [],
  sourceUrl,
}: ImageryEditorProps) {
  const update = (patch: Partial<ImageryLayerConfig>) => onChange({ ...value, ...patch });

  const isCustomUrl = !!value.tileUrlTemplate;
  const { collections, loading: collectionsLoading } = useOgcCollections(
    !isCustomUrl && sourceUrl ? sourceUrl : null,
  );

  const handleCollectionChange = (collectionId: string) => {
    const col = collections.find((c) => c.id === collectionId);
    const patch: Partial<ImageryLayerConfig> = { collection: collectionId };
    // Auto-set label from collection title if label is still the default or empty
    if (!value.label || value.label === 'New Imagery Layer' || value.label === value.collection) {
      patch.label = col?.title ?? collectionId;
    }
    // Auto-set ID if still empty or matches old collection
    if (!value.id || value.id === `${value.sourceId}-${value.collection}`) {
      patch.id = `${value.sourceId}-${collectionId}`;
    }
    update(patch);
  };

  const toggleCustomUrl = (useCustom: boolean) => {
    if (useCustom) {
      update({ tileUrlTemplate: '', collection: '' });
    } else {
      update({ tileUrlTemplate: undefined });
    }
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="Label">
        <input
          type="text"
          value={value.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="GOES East GeoColor"
          className={`${inputClass} mapui:w-full`}
        />
      </FormField>

      {/* Source selector */}
      <FormField label="Source">
        {availableSources.length > 0 ? (
          <select
            value={value.sourceId}
            onChange={(e) => update({ sourceId: e.target.value })}
            className={`${inputClass} mapui:w-full`}
          >
            <option value="">Select a source...</option>
            {availableSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label ?? s.id}{s.type === 'imagery' ? ' (Imagery)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value.sourceId}
            onChange={(e) => update({ sourceId: e.target.value })}
            placeholder="source-id"
            className={inputClass}
          />
        )}
      </FormField>

      {/* Mode toggle: OGC Collection vs Custom URL */}
      <div className="mapui:flex mapui:gap-4 mapui:text-sm">
        <label className="mapui:flex mapui:items-center mapui:gap-1.5 mapui:cursor-pointer">
          <input
            type="radio"
            checked={!isCustomUrl}
            onChange={() => toggleCustomUrl(false)}
            className="mapui:accent-blue-600"
          />
          <span className="mapui:text-gray-700">OGC Collection</span>
        </label>
        <label className="mapui:flex mapui:items-center mapui:gap-1.5 mapui:cursor-pointer">
          <input
            type="radio"
            checked={isCustomUrl}
            onChange={() => toggleCustomUrl(true)}
            className="mapui:accent-blue-600"
          />
          <span className="mapui:text-gray-700">Custom Tile URL</span>
        </label>
      </div>

      {isCustomUrl ? (
        <FormField label="Tile URL Template" required description="Use {z}, {x}, {y} placeholders.">
          <input
            type="text"
            value={value.tileUrlTemplate ?? ''}
            onChange={(e) => update({ tileUrlTemplate: e.target.value || undefined })}
            placeholder="https://example.com/tiles/{z}/{x}/{y}.png"
            className={`${inputClass} mapui:w-full`}
          />
        </FormField>
      ) : (
        <FormField label="Collection" required>
          {sourceUrl && collections.length > 0 ? (
            <select
              value={value.collection}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className={`${inputClass} mapui:w-full`}
            >
              <option value="">Select a collection...</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title ?? c.id}
                </option>
              ))}
            </select>
          ) : collectionsLoading ? (
            <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:text-sm mapui:text-gray-500 mapui:py-1">
              <span className="mapui:inline-block mapui:h-3 mapui:w-3 mapui:animate-spin mapui:rounded-full mapui:border-2 mapui:border-gray-300 mapui:border-t-blue-600" />
              Loading collections…
            </div>
          ) : (
            <input
              type="text"
              value={value.collection}
              onChange={(e) => update({ collection: e.target.value })}
              placeholder="GOESEastCONUSGeoColor"
              className={`${inputClass} mapui:w-full`}
            />
          )}
        </FormField>
      )}

      <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
        <FormField label="Opacity">
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={value.opacity ?? 1}
              onChange={(e) => update({ opacity: Number(e.target.value) })}
              className="mapui:flex-1 mapui:cursor-pointer mapui:accent-blue-600"
            />
            <span className="mapui:text-xs mapui:text-gray-500 mapui:w-8 mapui:text-right">
              {Math.round((value.opacity ?? 1) * 100)}%
            </span>
          </div>
        </FormField>

        <FormField label="Tile Size">
          <input
            type="number"
            min={64}
            max={1024}
            step={64}
            value={value.tileSize ?? 256}
            onChange={(e) => update({ tileSize: Number(e.target.value) })}
            className={`${inputClass} mapui:w-24`}
          />
        </FormField>
      </div>

      <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
        <FormField label="Min Zoom">
          <input
            type="number"
            min={0}
            max={24}
            value={value.minZoom ?? ''}
            onChange={(e) => update({ minZoom: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0"
            className={`${inputClass} mapui:w-24`}
          />
        </FormField>

        <FormField label="Max Zoom">
          <input
            type="number"
            min={0}
            max={24}
            value={value.maxZoom ?? ''}
            onChange={(e) => update({ maxZoom: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="24"
            className={`${inputClass} mapui:w-24`}
          />
        </FormField>
      </div>

      <div className="mapui:flex mapui:flex-col mapui:gap-3">
        <label className="mapui:flex mapui:items-center mapui:gap-2 mapui:cursor-pointer">
          <input
            type="checkbox"
            checked={value.visible}
            onChange={(e) => update({ visible: e.target.checked })}
            className="mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:accent-blue-600"
          />
          <span className="mapui:text-sm mapui:text-gray-700">Initially visible</span>
        </label>

        <label className="mapui:flex mapui:items-center mapui:gap-2 mapui:cursor-pointer">
          <input
            type="checkbox"
            checked={value.exclusive}
            onChange={(e) => update({ exclusive: e.target.checked })}
            className="mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:accent-blue-600"
          />
          <div className="mapui:flex mapui:flex-col">
            <span className="mapui:text-sm mapui:text-gray-700">Exclusive mode</span>
            <span className="mapui:text-xs mapui:text-gray-400">
              Enabling this layer disables other imagery layers
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
