import type { SpriteSource } from '../../types';
import { FormField } from '../admin/FormField';

export interface SpriteSourceEditorProps {
  value: SpriteSource;
  onChange: (sprite: SpriteSource) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function SpriteSourceEditor({ value, onChange }: SpriteSourceEditorProps) {
  const update = (patch: Partial<SpriteSource>) => onChange({ ...value, ...patch });

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="ID" required>
        <input
          type="text"
          value={value.id}
          onChange={(e) => update({ id: e.target.value })}
          placeholder="my-sprites"
          className={inputClass}
        />
      </FormField>

      <FormField label="Sprite URL" required>
        <input
          type="url"
          value={value.url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="https://example.com/sprites/sprite"
          className={inputClass}
        />
        <p className="mapui:mt-1 mapui:text-xs mapui:text-gray-400">
          Base URL without extension. MapLibre will append <code>.json</code> and <code>.png</code>.
        </p>
      </FormField>
    </div>
  );
}
