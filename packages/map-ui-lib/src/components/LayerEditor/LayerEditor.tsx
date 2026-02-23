import { useState } from 'react';
import type { LayerConfig, OgcApiSource, StyleConfig } from '../../types';
import { FormField } from '../admin/FormField';
import { StyleEditor } from '../StyleEditor/StyleEditor';
import { LegendEditor } from '../LegendEditor/LegendEditor';
import { SearchFieldList } from '../SearchFieldEditor/SearchFieldList';
import { PropertyDisplayEditor } from '../PropertyDisplayEditor/PropertyDisplayEditor';

export interface LayerEditorProps {
  value: LayerConfig;
  onChange: (layer: LayerConfig) => void;
  availableSources: OgcApiSource[];
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const defaultStyle: StyleConfig = {
  type: 'fill',
  paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 },
};

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mapui:rounded mapui:border mapui:border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mapui:flex mapui:w-full mapui:cursor-pointer mapui:items-center mapui:justify-between mapui:rounded mapui:border-none mapui:bg-gray-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-gray-700 hover:mapui:bg-gray-100"
      >
        <span>{title}</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mapui:p-3">{children}</div>}
    </div>
  );
}

export function LayerEditor({ value, onChange, availableSources }: LayerEditorProps) {
  const update = (patch: Partial<LayerConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
        <FormField label="Layer ID" required>
          <input
            type="text"
            value={value.id}
            onChange={(e) => update({ id: e.target.value })}
            placeholder="my-layer"
            className={inputClass}
          />
        </FormField>
        <FormField label="Label">
          <input
            type="text"
            value={value.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="My Layer"
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Source" required>
        <select
          value={value.sourceId}
          onChange={(e) => update({ sourceId: e.target.value })}
          className={inputClass}
        >
          <option value="">Select a source…</option>
          {availableSources.map((src) => (
            <option key={src.id} value={src.id}>
              {src.label ?? src.id}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Collection" required>
        <input
          type="text"
          value={value.collection}
          onChange={(e) => update({ collection: e.target.value })}
          placeholder="collection-id"
          className={inputClass}
        />
      </FormField>

      <FormField label="Data Mode">
        <div className="mapui:flex mapui:gap-4">
          {(['vector-tiles', 'geojson'] as const).map((mode) => (
            <label key={mode} className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:gap-1.5">
              <input
                type="radio"
                name={`data-mode-${value.id}`}
                value={mode}
                checked={value.dataMode === mode}
                onChange={() => update({ dataMode: mode })}
                className="mapui:accent-blue-600"
              />
              <span className="mapui:text-sm mapui:text-gray-700">{mode}</span>
            </label>
          ))}
        </div>
      </FormField>

      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <input
          type="checkbox"
          id="layer-visible"
          checked={value.visible}
          onChange={(e) => update({ visible: e.target.checked })}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
        <label htmlFor="layer-visible" className="mapui:text-sm mapui:text-gray-700">
          Visible by default
        </label>
      </div>

      <CollapsibleSection title="Style">
        <StyleEditor
          value={value.style ?? defaultStyle}
          onChange={(style) => update({ style })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Legend">
        <LegendEditor
          value={value.legend}
          onChange={(legend) => update({ legend })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Search Fields">
        <SearchFieldList
          fields={value.search?.fields ?? []}
          onChange={(fields) =>
            update({ search: fields.length > 0 ? { fields } : undefined })
          }
        />
      </CollapsibleSection>

      <CollapsibleSection title="Property Display">
        <PropertyDisplayEditor
          value={value.propertyDisplay ?? {}}
          onChange={(propertyDisplay) =>
            update({ propertyDisplay: Object.keys(propertyDisplay).length > 0 ? propertyDisplay : undefined })
          }
        />
      </CollapsibleSection>
    </div>
  );
}
