import { useState, useCallback } from 'react';
import type { LayerConfig } from '../../types';

export interface LayerPanelProps {
  layers: LayerConfig[];
  activeLayerIds: string[];
  onToggleVisibility: (layerId: string) => void;
  onReorder?: (layerIds: string[]) => void;
  className?: string;
}

export function LayerPanel({
  layers,
  activeLayerIds,
  onToggleVisibility,
  onReorder,
  className = '',
}: LayerPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
      setDraggedId(layerId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', layerId);
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverId(layerId);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);
      setDraggedId(null);

      if (!onReorder || !draggedId || draggedId === targetId) return;

      const ids = layers.map((l) => l.id);
      const fromIndex = ids.indexOf(draggedId);
      const toIndex = ids.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const newIds = [...ids];
      newIds.splice(fromIndex, 1);
      newIds.splice(toIndex, 0, draggedId);
      onReorder(newIds);
    },
    [draggedId, layers, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-1 ${className}`.trim()}>
      <h3 className="mapui:m-0 mapui:mb-2 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
        Layers
      </h3>
      <ul className="mapui:m-0 mapui:list-none mapui:p-0">
        {layers.map((layer) => {
          const isActive = activeLayerIds.includes(layer.id);
          const isDragged = draggedId === layer.id;
          const isDragOver = dragOverId === layer.id;

          return (
            <li
              key={layer.id}
              draggable={!!onReorder}
              onDragStart={onReorder ? (e) => handleDragStart(e, layer.id) : undefined}
              onDragOver={onReorder ? (e) => handleDragOver(e, layer.id) : undefined}
              onDragLeave={onReorder ? handleDragLeave : undefined}
              onDrop={onReorder ? (e) => handleDrop(e, layer.id) : undefined}
              onDragEnd={onReorder ? handleDragEnd : undefined}
              className={[
                'mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:px-2 mapui:py-1.5',
                'mapui:select-none mapui:transition-colors',
                isDragOver
                  ? 'mapui:bg-blue-100'
                  : 'mapui:bg-transparent hover:mapui:bg-gray-100',
                isDragged ? 'mapui:opacity-50' : 'mapui:opacity-100',
              ].join(' ')}
            >
              {onReorder && (
                <span
                  className="mapui:cursor-grab mapui:text-gray-400 active:mapui:cursor-grabbing"
                  aria-hidden="true"
                >
                  ⠿
                </span>
              )}
              <label className="mapui:flex mapui:flex-1 mapui:cursor-pointer mapui:items-center mapui:gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggleVisibility(layer.id)}
                  className="mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:accent-blue-600"
                />
                <span className="mapui:text-sm mapui:text-gray-800">{layer.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
