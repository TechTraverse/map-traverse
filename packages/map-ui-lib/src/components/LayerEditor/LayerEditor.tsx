import { useState, useEffect, useRef } from 'react';
import type { LayerConfig, OgcApiSource, AvailableProperty } from '../../types';
import { FormField } from '../admin/FormField';
import { CollapsibleSection } from '../admin/CollapsibleSection';
import { StyleEditor, defaultFill, defaultLine, defaultCircle, defaultSymbol } from '../StyleEditor/StyleEditor';
import { LegendEditor } from '../LegendEditor/LegendEditor';
import { SearchFieldList } from '../SearchFieldEditor/SearchFieldList';
import { PropertyDisplayEditor } from '../PropertyDisplayEditor/PropertyDisplayEditor';
import { useOgcCollections } from '../../hooks/useOgcCollections';
import { useOgcQueryables } from '../../hooks/useOgcQueryables';
import { fetchFeatures } from '../../utils/ogcApi';
import {
  detectGeometryStyleTypesFromQueryables,
  geometryTypeToStyleTypes,
  toAvailableProperties,
} from '../../utils/queryableHelpers';

export interface LayerEditorProps {
  value: LayerConfig;
  onChange: (layer: LayerConfig) => void;
  availableSources: OgcApiSource[];
  availableIcons?: string[];
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function LayerEditor({ value, onChange, availableSources, availableIcons }: LayerEditorProps) {
  const update = (patch: Partial<LayerConfig>) => onChange({ ...value, ...patch });

  // Refs to always have latest value/onChange in async callbacks (avoid stale closures)
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Resolve baseUrl from the selected source
  const source = availableSources.find((s) => s.id === value.sourceId);
  const baseUrl = source?.url ?? null;
  const collection = value.collection || null;

  // Fetch collections for the dropdown
  const { collections, loading: collectionsLoading } = useOgcCollections(baseUrl);

  // Fetch queryables when a collection is selected
  const { queryables, loading: queryablesLoading } = useOgcQueryables(baseUrl, collection);

  // Derive available non-geometry properties
  const availableProperties: AvailableProperty[] = queryables
    ? toAvailableProperties(queryables)
    : [];

  // Detect suggested style types from queryables; fall back to fetching one feature
  const [suggestedStyleTypes, setSuggestedStyleTypes] = useState<('fill' | 'line' | 'circle' | 'symbol')[]>([]);

  useEffect(() => {
    if (!queryables) {
      setSuggestedStyleTypes([]);
      return;
    }

    const applyStyleTypes = (styleTypes: ('fill' | 'line' | 'circle' | 'symbol')[]) => {
      setSuggestedStyleTypes(styleTypes);
      const defaultType = styleTypes[0];
      if (defaultType && !valueRef.current.style) {
        const style =
          defaultType === 'fill' ? defaultFill
          : defaultType === 'line' ? defaultLine
          : defaultType === 'symbol' ? defaultSymbol
          : defaultCircle;
        onChangeRef.current({ ...valueRef.current, style });
      }
    };

    const fromQueryables = detectGeometryStyleTypesFromQueryables(queryables);
    if (fromQueryables.length > 0) {
      applyStyleTypes(fromQueryables);
      return;
    }

    // Fallback: inspect geometry.type from a single fetched feature
    if (!baseUrl || !collection) {
      setSuggestedStyleTypes([]);
      return;
    }

    let cancelled = false;
    fetchFeatures(baseUrl, collection, { limit: 1 })
      .then((fc) => {
        if (cancelled) return;
        const geomType = fc.features[0]?.geometry?.type;
        if (typeof geomType === 'string') {
          applyStyleTypes(geometryTypeToStyleTypes(geomType));
        } else {
          applyStyleTypes([]);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestedStyleTypes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [queryables, baseUrl, collection]);

  // Reset suggested types when source/collection changes
  useEffect(() => {
    setSuggestedStyleTypes([]);
  }, [baseUrl, collection]);

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
        {collections.length > 0 ? (
          <select
            value={value.collection}
            onChange={(e) => update({ collection: e.target.value })}
            className={inputClass}
          >
            <option value="">Select a collection…</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title ?? c.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value.collection}
            onChange={(e) => update({ collection: e.target.value })}
            placeholder={collectionsLoading ? 'Loading collections…' : 'collection-id'}
            className={inputClass}
          />
        )}
        {queryablesLoading && (
          <span className="mapui:mt-0.5 mapui:block mapui:text-xs mapui:text-gray-400">
            Loading properties…
          </span>
        )}
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
          value={value.style ?? defaultFill}
          onChange={(style) => update({ style })}
          suggestedTypes={suggestedStyleTypes}
          availableIcons={availableIcons}
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
          availableProperties={availableProperties}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Property Display">
        <PropertyDisplayEditor
          value={value.propertyDisplay ?? {}}
          onChange={(propertyDisplay) =>
            update({ propertyDisplay: Object.keys(propertyDisplay).length > 0 ? propertyDisplay : undefined })
          }
          availableProperties={availableProperties}
        />
      </CollapsibleSection>
    </div>
  );
}
