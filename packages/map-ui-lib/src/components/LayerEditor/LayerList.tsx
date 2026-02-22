import { useState } from 'react';
import type { LayerConfig, OgcApiSource } from '../../types';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { LayerEditor } from './LayerEditor';

export interface LayerListProps {
  layers: LayerConfig[];
  onChange: (layers: LayerConfig[]) => void;
  availableSources: OgcApiSource[];
}

const defaultLayer = (): LayerConfig => ({
  id: '',
  sourceId: '',
  collection: '',
  label: 'New Layer',
  visible: true,
  dataMode: 'vector-tiles',
});

export function LayerList({ layers, onChange, availableSources }: LayerListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newLayer, setNewLayer] = useState<LayerConfig>(defaultLayer());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSaveNew = () => {
    onChange([...layers, newLayer]);
    setAddingNew(false);
    setNewLayer(defaultLayer());
  };

  const handleUpdate = (updated: LayerConfig) => {
    onChange(layers.map((l) => (l.id === editingId ? updated : l)));
  };

  const handleDelete = (id: string) => {
    onChange(layers.filter((l) => l.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          Layers
        </h3>
        <button
          type="button"
          onClick={() => { setAddingNew(true); setNewLayer(defaultLayer()); }}
          className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
        >
          + Add Layer
        </button>
      </div>

      {layers.length === 0 && !addingNew && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-gray-500">No layers configured.</p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {layers.map((layer) => (
          <li
            key={layer.id}
            className="mapui:rounded-lg mapui:border mapui:border-gray-200 mapui:bg-white"
          >
            <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-2 mapui:px-3 mapui:py-2">
              <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">
                  {layer.label || layer.id}
                </span>
                <span className="mapui:font-mono mapui:text-xs mapui:text-gray-500">
                  {layer.collection}
                </span>
              </div>
              <div className="mapui:flex mapui:shrink-0 mapui:gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === layer.id ? null : layer.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-50"
                >
                  {editingId === layer.id ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(layer.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            {editingId === layer.id && (
              <div className="mapui:border-t mapui:border-gray-100 mapui:p-3">
                <LayerEditor
                  value={layer}
                  onChange={handleUpdate}
                  availableSources={availableSources}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {addingNew && (
        <div className="mapui:rounded-lg mapui:border mapui:border-blue-200 mapui:bg-blue-50 mapui:p-3">
          <p className="mapui:m-0 mapui:mb-3 mapui:text-xs mapui:font-semibold mapui:text-blue-700">
            New Layer
          </p>
          <LayerEditor
            value={newLayer}
            onChange={setNewLayer}
            availableSources={availableSources}
          />
          <div className="mapui:mt-3 mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newLayer.id || !newLayer.sourceId || !newLayer.collection}
              className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAddingNew(false)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remove Layer"
        description="Are you sure you want to remove this layer from the configuration?"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
