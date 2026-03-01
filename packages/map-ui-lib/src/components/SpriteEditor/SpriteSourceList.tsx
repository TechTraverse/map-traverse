import { useState } from 'react';
import type { SpriteSource } from '../../types';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { SpriteSourceEditor } from './SpriteSourceEditor';

export interface SpriteSourceListProps {
  sprites: SpriteSource[];
  onChange: (sprites: SpriteSource[]) => void;
}

const defaultSprite = (): SpriteSource => ({ id: '', url: '' });

export function SpriteSourceList({ sprites, onChange }: SpriteSourceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newSprite, setNewSprite] = useState<SpriteSource>(defaultSprite());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUpdate = (updated: SpriteSource) => {
    onChange(sprites.map((s) => (s.id === editingId ? updated : s)));
  };

  const handleSaveNew = () => {
    onChange([...sprites, newSprite]);
    setAddingNew(false);
    setNewSprite(defaultSprite());
  };

  const handleDelete = (id: string) => {
    onChange(sprites.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          Custom Sprite Sheets
        </h3>
        <button
          type="button"
          onClick={() => { setAddingNew(true); setNewSprite(defaultSprite()); }}
          className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
        >
          + Add Sprite Sheet
        </button>
      </div>

      {sprites.length === 0 && !addingNew && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-gray-500">
          No custom sprite sheets. Basemap icons are available automatically.
        </p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {sprites.map((sprite) => (
          <li
            key={sprite.id}
            className="mapui:rounded-lg mapui:border mapui:border-gray-200 mapui:bg-white"
          >
            <div className="mapui:flex mapui:items-center mapui:gap-3 mapui:px-3 mapui:py-2">
              <div className="mapui:flex-1 mapui:overflow-hidden">
                <span className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-800">
                  {sprite.id}
                </span>
                <span className="mapui:block mapui:truncate mapui:font-mono mapui:text-xs mapui:text-gray-500">
                  {sprite.url}
                </span>
              </div>
              <div className="mapui:flex mapui:shrink-0 mapui:gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === sprite.id ? null : sprite.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-gray-600 hover:mapui:bg-gray-50"
                >
                  {editingId === sprite.id ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(sprite.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            {editingId === sprite.id && (
              <div className="mapui:border-t mapui:border-gray-100 mapui:p-3">
                <SpriteSourceEditor value={sprite} onChange={handleUpdate} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {addingNew && (
        <div className="mapui:rounded-lg mapui:border mapui:border-blue-200 mapui:bg-blue-50 mapui:p-3">
          <p className="mapui:m-0 mapui:mb-3 mapui:text-xs mapui:font-semibold mapui:text-blue-700">
            New Sprite Sheet
          </p>
          <SpriteSourceEditor value={newSprite} onChange={setNewSprite} />
          <div className="mapui:mt-3 mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newSprite.id || !newSprite.url}
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
        title="Remove Sprite Sheet"
        description="Are you sure you want to remove this sprite sheet from the configuration?"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
