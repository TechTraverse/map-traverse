import { useState } from 'react';
import type { ImageryLayerConfig, OgcApiSource } from '../../types';
import { ImageryEditor } from './ImageryEditor';
import { ConfirmDialog } from '../admin/ConfirmDialog';

export interface ImageryListProps {
  imageryLayers: ImageryLayerConfig[];
  onChange: (layers: ImageryLayerConfig[]) => void;
  availableSources?: OgcApiSource[];
}

const DEFAULT_IMAGERY_LAYER: ImageryLayerConfig = {
  id: '',
  sourceId: '',
  collection: '',
  label: 'New Imagery Layer',
  visible: false,
  opacity: 1,
  exclusive: false,
  tileSize: 256,
};

export function ImageryList({
  imageryLayers,
  onChange,
  availableSources = [],
}: ImageryListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newLayers = [...imageryLayers, { ...DEFAULT_IMAGERY_LAYER }];
    onChange(newLayers);
    setEditingIndex(newLayers.length - 1);
  };

  const handleUpdate = (index: number, updated: ImageryLayerConfig) => {
    onChange(imageryLayers.map((l, i) => (i === index ? updated : l)));
  };

  const handleDelete = () => {
    if (confirmDeleteIndex === null) return;
    onChange(imageryLayers.filter((_, i) => i !== confirmDeleteIndex));
    if (editingIndex === confirmDeleteIndex) setEditingIndex(null);
    setConfirmDeleteIndex(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      {imageryLayers.length === 0 ? (
        <p className="mapui:text-sm mapui:text-gray-500">
          No imagery layers configured.
        </p>
      ) : (
        <ul className="mapui:m-0 mapui:list-none mapui:p-0 mapui:flex mapui:flex-col mapui:gap-2">
          {imageryLayers.map((layer, index) => (
            <li
              key={index}
              className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white"
            >
              <div className="mapui:flex mapui:items-center mapui:justify-between mapui:px-3 mapui:py-2">
                <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:min-w-0">
                  <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800 mapui:truncate">
                    {layer.label || layer.id || 'Untitled'}
                  </span>
                  {layer.exclusive && (
                    <span className="mapui:text-xs mapui:rounded-full mapui:bg-amber-100 mapui:text-amber-700 mapui:px-1.5 mapui:py-0.5">
                      exclusive
                    </span>
                  )}
                  {layer.tileUrlTemplate ? (
                    <span className="mapui:text-xs mapui:text-gray-400 mapui:truncate">
                      Custom URL
                    </span>
                  ) : layer.sourceId && (
                    <span className="mapui:text-xs mapui:text-gray-400 mapui:truncate">
                      {layer.sourceId}/{layer.collection}
                    </span>
                  )}
                </div>
                <div className="mapui:flex mapui:gap-1 mapui:shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingIndex(editingIndex === index ? null : index)
                    }
                    className="mapui:text-blue-600 mapui:text-sm hover:mapui:text-blue-800"
                  >
                    {editingIndex === index ? 'Collapse' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIndex(index)}
                    className="mapui:text-red-600 mapui:text-sm hover:mapui:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingIndex === index && (
                <div className="mapui:border-t mapui:border-gray-200 mapui:px-3 mapui:py-3">
                  <ImageryEditor
                    value={layer}
                    onChange={(updated) => handleUpdate(index, updated)}
                    availableSources={availableSources}
                    sourceUrl={availableSources.find((s) => s.id === layer.sourceId)?.url}
                    sourceAuth={availableSources.find((s) => s.id === layer.sourceId)?.auth}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="mapui:self-start mapui:rounded mapui:border mapui:border-dashed mapui:border-gray-300 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-gray-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
      >
        + Add Imagery Layer
      </button>

      <ConfirmDialog
        open={confirmDeleteIndex !== null}
        title="Delete Imagery Layer"
        description={`Delete "${imageryLayers[confirmDeleteIndex ?? 0]?.label ?? 'this layer'}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteIndex(null)}
      />
    </div>
  );
}
