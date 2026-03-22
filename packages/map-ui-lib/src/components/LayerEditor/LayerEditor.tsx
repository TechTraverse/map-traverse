import { useState, useEffect, useRef } from 'react';
import type { LayerConfig, OgcApiSource, AvailableProperty, StyleConfig } from '../../types';
import { FormField } from '../admin/FormField';
import { CollapsibleSection } from '../admin/CollapsibleSection';
import { StyleEditor, defaultFill, defaultCircle } from '../StyleEditor/StyleEditor';
import { LegendEditor } from '../LegendEditor/LegendEditor';
import { SearchFieldList } from '../SearchFieldEditor/SearchFieldList';
import { PropertyDisplayEditor } from '../PropertyDisplayEditor/PropertyDisplayEditor';

import { useOgcCollections } from '../../hooks/useOgcCollections';
import { useOgcQueryables } from '../../hooks/useOgcQueryables';
import { fetchFeatures, fetchDistinctValues } from '../../utils/ogcApi';
import {
  detectGeometryStyleTypesFromQueryables,
  detectGeometryTypesFromFeatures,
  buildDefaultStylesForGeometryTypes,
  geometryTypeToStyleTypes,
  toAvailableProperties,
} from '../../utils/queryableHelpers';

function replaceAt<T>(arr: T[] | undefined, index: number, value: T): T[] {
  const next = [...(arr ?? [])];
  next[index] = value;
  return next;
}

function removeAt<T>(arr: T[] | undefined, index: number): T[] {
  return (arr ?? []).filter((_, i) => i !== index);
}

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

  // Detect suggested styles from queryables; fall back to fetching features
  const [suggestedStyles, setSuggestedStyles] = useState<StyleConfig[]>([]);
  // All suitable style types for the detected geometry (e.g. ['circle', 'symbol'] for Point)
  const [suitableStyleTypes, setSuitableStyleTypes] = useState<StyleConfig['type'][]>([]);

  useEffect(() => {
    if (!queryables) {
      setSuggestedStyles([]);
      setSuitableStyleTypes([]);
      return;
    }

    const applyGeomTypes = (geomTypes: string[], styleTypes: StyleConfig['type'][]) => {
      const styles = buildDefaultStylesForGeometryTypes(geomTypes);
      setSuggestedStyles(styles);
      setSuitableStyleTypes(styleTypes);
      if (styles.length > 0 && !valueRef.current.styles?.length) {
        onChangeRef.current({ ...valueRef.current, styles });
      }
    };

    const fromQueryables = detectGeometryStyleTypesFromQueryables(queryables);
    if (fromQueryables.length > 0) {
      // Map style type names back to geometry type families for buildDefaultStylesForGeometryTypes
      const geomTypes: string[] = [];
      for (const st of fromQueryables) {
        if (st === 'fill') geomTypes.push('Polygon');
        else if (st === 'line') geomTypes.push('LineString');
        else if (st === 'circle' || st === 'symbol') geomTypes.push('Point');
      }
      applyGeomTypes(geomTypes, fromQueryables);
      return;
    }

    // Fallback: inspect geometry types from fetched features
    if (!baseUrl || !collection) {
      setSuggestedStyles([]);
      setSuitableStyleTypes([]);
      return;
    }

    let cancelled = false;
    fetchFeatures(baseUrl, collection, { limit: 20 })
      .then((fc) => {
        if (cancelled) return;
        const geomTypes = detectGeometryTypesFromFeatures(fc.features);
        if (geomTypes.length > 0) {
          const allTypes = new Set<StyleConfig['type']>();
          for (const gt of geomTypes) {
            for (const st of geometryTypeToStyleTypes(gt)) allTypes.add(st);
          }
          applyGeomTypes(geomTypes, Array.from(allTypes));
        } else {
          setSuggestedStyles([]);
          setSuitableStyleTypes([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestedStyles([]);
          setSuitableStyleTypes([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryables, baseUrl, collection]);

  // Reset suggested styles when source/collection changes
  useEffect(() => {
    setSuggestedStyles([]);
    setSuitableStyleTypes([]);
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

      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <input
          type="checkbox"
          id={`layer-tooltip-${value.id}`}
          checked={value.showTooltip ?? true}
          onChange={(e) => update({ showTooltip: e.target.checked })}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
        <label htmlFor={`layer-tooltip-${value.id}`} className="mapui:text-sm mapui:text-gray-700">
          Show tooltip on hover
        </label>
      </div>

      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <input
          type="checkbox"
          id={`layer-detail-${value.id}`}
          checked={value.showDetailPanel ?? true}
          onChange={(e) => update({ showDetailPanel: e.target.checked })}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
        <label htmlFor={`layer-detail-${value.id}`} className="mapui:text-sm mapui:text-gray-700">
          Show detail panel on click
        </label>
      </div>

      <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
        <FormField label="Min Zoom">
          <input
            type="number"
            min={0}
            max={24}
            step={1}
            value={value.minZoom ?? ''}
            onChange={(e) => { const v = e.target.valueAsNumber; update({ minZoom: isNaN(v) ? undefined : v }); }}
            placeholder="0"
            className={inputClass}
          />
        </FormField>
        <FormField label="Max Zoom">
          <input
            type="number"
            min={0}
            max={24}
            step={1}
            value={value.maxZoom ?? ''}
            onChange={(e) => { const v = e.target.valueAsNumber; update({ maxZoom: isNaN(v) ? undefined : v }); }}
            placeholder="24"
            className={inputClass}
          />
        </FormField>
      </div>

      <CollapsibleSection title="Style">
        <div className="mapui:flex mapui:flex-col mapui:gap-4">
          {(value.styles ?? [defaultFill]).map((style, i) => (
            <div key={i} className="mapui:flex mapui:flex-col mapui:gap-2">
              {style.geometryFilter && style.geometryFilter.length > 0 && (
                <div className="mapui:flex mapui:flex-wrap mapui:gap-1">
                  {style.geometryFilter.map((g) => (
                    <span
                      key={g}
                      className="mapui:rounded mapui:bg-indigo-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-indigo-700"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <StyleEditor
                value={style}
                onChange={(s) => update({ styles: replaceAt(value.styles, i, s) })}
                suggestedTypes={suitableStyleTypes}
                availableIcons={availableIcons}
                availableProperties={availableProperties}
                onFetchDistinctValues={
                  baseUrl && collection
                    ? (property) => fetchDistinctValues(baseUrl, collection, property, { fetchAll: true })
                    : undefined
                }
              />
              {(value.styles?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => update({ styles: removeAt(value.styles, i) })}
                  className="mapui:cursor-pointer mapui:self-start mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                >
                  Remove style
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ styles: [...(value.styles ?? [defaultFill]), defaultCircle] })}
            className="mapui:cursor-pointer mapui:self-start mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-gray-700 hover:mapui:bg-gray-50"
          >
            + Add style
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Legend">
        <LegendEditor
          value={value.legend}
          onChange={(legend) => update({ legend })}
          styles={value.styles}
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
