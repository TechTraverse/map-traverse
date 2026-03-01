import { useState } from 'react';
import type { LayerConfig, OgcApiSource } from '../../types';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { LayerEditor } from './LayerEditor';

export interface LayerListProps {
  layers: LayerConfig[];
  onChange: (layers: LayerConfig[]) => void;
  availableSources: OgcApiSource[];
  availableIcons?: string[];
}

const defaultLayer = (): LayerConfig => ({
  id: '',
  sourceId: '',
  collection: '',
  label: 'New Layer',
  visible: true,
  dataMode: 'vector-tiles',
});

export function LayerList({ layers, onChange, availableSources, availableIcons }: LayerListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newLayer, setNewLayer] = useState<LayerConfig>(defaultLayer());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...layers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === layers.length - 1) return;
    const updated = [...layers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
    setDraggedId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(layerId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    const fromId = draggedId;
    setDraggedId(null);

    if (!fromId || fromId === targetId) return;

    const fromIndex = layers.findIndex((l) => l.id === fromId);
    const toIndex = layers.findIndex((l) => l.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...layers];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, layers[fromIndex]);
    onChange(reordered);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
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
        {layers.map((layer, index) => {
          const isDragged = draggedId === layer.id;
          const isDragOver = dragOverId === layer.id;
          const isExpanded = editingId === layer.id;

          return (
            <li
              key={layer.id}
              draggable={!isExpanded}
              onDragStart={!isExpanded ? (e) => handleDragStart(e, layer.id) : undefined}
              onDragOver={(e) => handleDragOver(e, layer.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragEnd={handleDragEnd}
              className={[
                'mapui:rounded-lg mapui:border mapui:bg-white mapui:transition-colors',
                isDragOver ? 'mapui:border-blue-400 mapui:bg-blue-50' : 'mapui:border-gray-200',
                isDragged ? 'mapui:opacity-50' : 'mapui:opacity-100',
              ].join(' ')}
            >
              <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-2 mapui:px-3 mapui:py-2">
                <div className="mapui:flex mapui:min-w-0 mapui:items-center mapui:gap-2">
                  <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label="Move layer up"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === layers.length - 1}
                      aria-label="Move layer down"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-gray-400 hover:mapui:text-gray-600 disabled:mapui:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <span
                    className="mapui:shrink-0 mapui:cursor-grab mapui:text-gray-400 active:mapui:cursor-grabbing"
                    aria-hidden="true"
                  >
                    ⠿
                  </span>
                  <div className="mapui:flex mapui:min-w-0 mapui:flex-col mapui:gap-0.5">
                    <span className="mapui:text-sm mapui:font-medium mapui:text-gray-800">
                      {layer.label || layer.id}
                    </span>
                    <span className="mapui:font-mono mapui:text-xs mapui:text-gray-500">
                      {layer.collection}
                    </span>
                    <div className="mapui:mt-1 mapui:flex mapui:flex-wrap mapui:gap-1">
                      <span className="mapui:rounded mapui:bg-slate-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-slate-700">
                        {layer.dataMode}
                      </span>
                      {layer.style && (
                        <span className="mapui:rounded mapui:bg-purple-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-purple-700">
                          {layer.style.type}
                        </span>
                      )}
                      {layer.visible === false && (
                        <span className="mapui:rounded mapui:bg-amber-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-amber-700">
                          hidden
                        </span>
                      )}
                      {(layer.search?.fields?.length ?? 0) > 0 && (
                        <span className="mapui:rounded mapui:bg-blue-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-blue-700">
                          {layer.search!.fields.length} search fields
                        </span>
                      )}
                      {(layer.legend?.entries?.length ?? 0) > 0 && (
                        <span className="mapui:rounded mapui:bg-green-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-green-700">
                          {layer.legend!.entries.length} legend entries
                        </span>
                      )}
                    </div>
                  </div>
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
                    availableIcons={availableIcons}
                  />
                </div>
              )}
            </li>
          );
        })}
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
            availableIcons={availableIcons}
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
