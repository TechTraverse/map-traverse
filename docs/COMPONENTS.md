# Component API Reference

All components are fully controlled — no internal state for data. Import them individually by sub-path to enable tree-shaking:

```ts
import { LayerPanel }           from '@ogc-maps/storybook-components/components/LayerPanel';
import { Legend }               from '@ogc-maps/storybook-components/components/Legend';
import { BasemapSwitcher }      from '@ogc-maps/storybook-components/components/BasemapSwitcher';
import { CollapsibleControl }   from '@ogc-maps/storybook-components/components/CollapsibleControl';
import { CoordinateDisplay }    from '@ogc-maps/storybook-components/components/CoordinateDisplay';
import { SearchPanel }          from '@ogc-maps/storybook-components/components/SearchPanel';
import { FeatureDetailPanel }   from '@ogc-maps/storybook-components/components/FeatureDetailPanel';
import { FeatureTooltip }       from '@ogc-maps/storybook-components/components/FeatureTooltip';
import { ExportButton }         from '@ogc-maps/storybook-components/components/ExportButton';
```

---

## LayerPanel

A list of layers with visibility checkboxes and optional drag-to-reorder.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers to display |
| `activeLayerIds` | `string[]` | Yes | IDs of currently visible layers |
| `onToggleVisibility` | `(layerId: string) => void` | Yes | Called when a layer checkbox is toggled |
| `onReorder` | `(layerIds: string[]) => void` | No | Called with new layer order after drag-drop. Omit to disable drag handles |
| `className` | `string` | No | Additional CSS classes for the container |

### Behavior

- Each layer renders as a checkbox item.
- When `onReorder` is provided, a drag handle (⠿) appears and items become draggable.
- Drop target highlights with a blue background during drag-over.
- The dragged item fades to 50% opacity.

### Example

```tsx
import { useState } from 'react';
import { LayerPanel } from '@ogc-maps/storybook-components/components/LayerPanel';

function App() {
  const [layers, setLayers] = useState(mapConfig.layers);
  const [visibleIds, setVisibleIds] = useState(['countries', 'cities']);

  const handleToggle = (id: string) =>
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleReorder = (newIds: string[]) =>
    setLayers((prev) => newIds.map((id) => prev.find((l) => l.id === id)!));

  return (
    <LayerPanel
      layers={layers}
      activeLayerIds={visibleIds}
      onToggleVisibility={handleToggle}
      onReorder={handleReorder}
    />
  );
}
```

---

## Legend

Displays a legend for visible layers, auto-derived from layer styles when no explicit `legend` config is set.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers (only visible ones are shown) |
| `visibleLayerIds` | `string[]` | Yes | IDs of layers to include in the legend |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Renders `null` when no visible layers have legend entries or styles.
- For each visible layer, uses `layer.legend.entries` if present; otherwise auto-derives a single entry from `layer.style` (color and shape are inferred from style type).
- Layers with multiple entries render a sub-list under the layer label.

### Style-to-Legend Auto-Derivation

| Style type | Derived shape | Derived color |
|---|---|---|
| `fill` | `square` | `fill-color` |
| `line` | `line` | `line-color` |
| `circle` | `circle` | `circle-color` |

### Example

```tsx
import { Legend } from '@ogc-maps/storybook-components/components/Legend';

<Legend layers={mapConfig.layers} visibleLayerIds={['countries', 'rivers']} />
```

---

## BasemapSwitcher

A button group for selecting the active basemap. Supports optional thumbnail images.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `basemaps` | `BasemapConfig[]` | Yes | Available basemap options |
| `activeBasemapId` | `string` | Yes | ID of the currently selected basemap |
| `onSelect` | `(basemapId: string) => void` | Yes | Called when a basemap button is clicked |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Active basemap button is highlighted in blue; inactive buttons have a gray border.
- When `BasemapConfig.thumbnail` is set, a 64×48px image is shown above the label.
- Uses `aria-pressed` for accessibility.

### Example

```tsx
import { useState } from 'react';
import { BasemapSwitcher } from '@ogc-maps/storybook-components/components/BasemapSwitcher';

function App() {
  const [activeBasemap, setActiveBasemap] = useState('carto-positron');

  return (
    <BasemapSwitcher
      basemaps={mapConfig.basemaps}
      activeBasemapId={activeBasemap}
      onSelect={setActiveBasemap}
    />
  );
}
```

---

## CollapsibleControl

A wrapper that collapses any content into a compact icon button. Designed as an overlay control for maps.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `icon` | `React.ComponentType<{ size?: number; className?: string }>` | Yes | Icon shown when collapsed (and in the panel header) |
| `label` | `string` | Yes | Accessible label (tooltip and aria-label) |
| `children` | `React.ReactNode` | Yes | Content rendered when expanded |
| `defaultCollapsed` | `boolean` | No (default `true`) | Initial state in uncontrolled mode |
| `collapsed` | `boolean` | No | Controlled collapsed state |
| `onToggle` | `(collapsed: boolean) => void` | No | Callback for controlled mode |
| `className` | `string` | No | Additional CSS classes for the 40×40px container |

### Controlled vs. Uncontrolled

- **Uncontrolled** (default): Pass only `defaultCollapsed`. State is managed internally.
- **Controlled**: Pass both `collapsed` and `onToggle`. Component syncs to your state.

### Layout

- The container is always 40×40px to prevent layout shift.
- The expanded panel floats to the left (`right: 100%`) with a 2px gap.
- A close (×) button is shown in the panel header.

### Example

```tsx
import { LuLayers3 } from 'react-icons/lu';
import { CollapsibleControl } from '@ogc-maps/storybook-components/components/CollapsibleControl';
import { LayerPanel } from '@ogc-maps/storybook-components/components/LayerPanel';

<CollapsibleControl icon={LuLayers3} label="Layers">
  <LayerPanel
    layers={mapConfig.layers}
    activeLayerIds={visibleIds}
    onToggleVisibility={handleToggle}
  />
</CollapsibleControl>
```

---

## CoordinateDisplay

Shows mouse cursor coordinates with a cycling format selector.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `latitude` | `number \| null` | Yes | Current latitude (null shows `—`) |
| `longitude` | `number \| null` | Yes | Current longitude |
| `formats` | `CoordinateFormatOption[]` | Yes | List of available format options |
| `activeFormat` | `string` | Yes | ID of the currently active format |
| `onFormatChange` | `(formatId: string) => void` | Yes | Called with the next format ID on click |
| `className` | `string` | No | Additional CSS classes |

### CoordinateFormatOption

```ts
interface CoordinateFormatOption {
  id: string;
  label: string;
  format: (lat: number, lng: number) => string;
}
```

### Built-in Formatters

Both formatters are exported from the component module:

```ts
import {
  formatDecimal,
  formatDMS,
} from '@ogc-maps/storybook-components/components/CoordinateDisplay';
```

| Function | Output example |
|---|---|
| `formatDecimal(lat, lng)` | `51.505152, -0.091254` |
| `formatDMS(lat, lng)` | `51°30'18.5"N 0°5'28.5"W` |

### Behavior

- Clicking the format label cycles to the next format in the `formats` array.
- When `latitude` or `longitude` is `null`, coordinates are shown as `—`.

### Example

```tsx
import { useState } from 'react';
import {
  CoordinateDisplay,
  formatDecimal,
  formatDMS,
} from '@ogc-maps/storybook-components/components/CoordinateDisplay';

const formats = [
  { id: 'decimal', label: 'DD',  format: formatDecimal },
  { id: 'dms',     label: 'DMS', format: formatDMS },
];

function App() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFormat, setActiveFormat] = useState('decimal');

  // Wire setCoords to your map's mousemove event

  return (
    <CoordinateDisplay
      latitude={coords?.lat ?? null}
      longitude={coords?.lng ?? null}
      formats={formats}
      activeFormat={activeFormat}
      onFormatChange={setActiveFormat}
    />
  );
}
```

---

## SearchPanel

Renders search/filter fields for all layers that have a `search` config. Automatically fetches queryable properties from the OGC API for `select` fields without static options.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers (only those with `search.fields` are shown) |
| `sources` | `OgcApiSource[]` | No (default `[]`) | Sources needed for dynamic queryables fetching |
| `activeFilters` | `Record<string, SearchFilterValues>` | Yes | Current filter state, keyed by layer ID |
| `onFilterChange` | `(layerId: string, property: string, value: string \| number \| undefined) => void` | Yes | Called on each field change |
| `onClearFilters` | `(layerId: string) => void` | Yes | Called when the "Clear" button is clicked for a layer |
| `className` | `string` | No | Additional CSS classes |

Where `SearchFilterValues = Record<string, string | number | undefined>`.

### Behavior

- Only layers with at least one `search.fields` entry are rendered.
- For `select` fields with no `options` array, the component calls `fetchQueryables` for the layer's source/collection and populates options from the API response.
- A "Clear" button appears per layer when any filter is active.
- Renders a placeholder message when no searchable layers are configured.

### Example

```tsx
import { useState } from 'react';
import { SearchPanel } from '@ogc-maps/storybook-components/components/SearchPanel';
import type { SearchFilterValues } from '@ogc-maps/storybook-components/types';

function App() {
  const [filters, setFilters] = useState<Record<string, SearchFilterValues>>({});

  const handleChange = (layerId: string, property: string, value: string | number | undefined) =>
    setFilters((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], [property]: value },
    }));

  const handleClear = (layerId: string) =>
    setFilters((prev) => ({ ...prev, [layerId]: {} }));

  return (
    <SearchPanel
      layers={mapConfig.layers}
      sources={mapConfig.sources}
      activeFilters={filters}
      onFilterChange={handleChange}
      onClearFilters={handleClear}
    />
  );
}
```

---

## FeatureDetailPanel

Displays properties for a selected map feature. Supports an inline panel variant and a full-screen modal variant.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | Whether the panel/modal is visible |
| `onClose` | `() => void` | Yes | Called when the close button (or modal backdrop) is clicked |
| `properties` | `Record<string, unknown> \| null` | Yes | Feature properties to display |
| `title` | `string` | No (default `'Feature Properties'`) | Panel header text |
| `fields` | `string[]` | No | Subset of property keys to display; shows all keys if omitted |
| `variant` | `'panel' \| 'modal'` | No (default `'panel'`) | Inline panel or full-screen modal |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Returns `null` when `isOpen` is `false`.
- **Panel variant**: inline container, `w-72`, scrollable up to `calc(100vh - 4rem)`.
- **Modal variant**: full-screen backdrop (`bg-black/40`); clicking the backdrop calls `onClose`; clicking inside the panel stops propagation.
- Uses `PropertyList` internally to render key–value pairs.
- Shows "No properties available." when `properties` is `null` or empty.

### Example

```tsx
import { useState } from 'react';
import { FeatureDetailPanel } from '@ogc-maps/storybook-components/components/FeatureDetailPanel';

function App() {
  const [selectedFeature, setSelectedFeature] = useState<Record<string, unknown> | null>(null);

  return (
    <FeatureDetailPanel
      isOpen={selectedFeature !== null}
      onClose={() => setSelectedFeature(null)}
      properties={selectedFeature}
      title="Feature Properties"
      variant="panel"
    />
  );
}
```

---

## FeatureTooltip

A compact tooltip that shows a preview of feature properties. The caller is responsible for positioning.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | No | Optional title shown above the property list |
| `properties` | `Record<string, unknown> \| null` | Yes | Feature properties to display |
| `fields` | `string[]` | No | Subset of property keys to display; shows all keys if omitted |
| `maxItems` | `number` | No (default `4`) | Max number of properties shown before truncation |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Shows "No data" when `properties` is `null`.
- Truncates to `maxItems` fields with a "+N more" indicator when there are additional properties.
- Uses compact density for the property list.
- No internal positioning — place it absolutely relative to cursor or map feature using CSS.

### Example

```tsx
import { FeatureTooltip } from '@ogc-maps/storybook-components/components/FeatureTooltip';

function MapTooltip({ x, y, feature }) {
  return (
    <div style={{ position: 'absolute', left: x + 12, top: y - 8, pointerEvents: 'none' }}>
      <FeatureTooltip
        title={feature.properties?.name}
        properties={feature.properties}
        maxItems={4}
      />
    </div>
  );
}
```

---

## ExportButton

A button (or dropdown for multiple layers) that triggers CSV export of layer data.

### ExportableLayer

```ts
interface ExportableLayer {
  id: string;
  label: string;
  collection: string;
}
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `ExportableLayer[]` | Yes | Layers available for export |
| `onExport` | `(layer: ExportableLayer) => void` | Yes | Called when a layer is selected for export |
| `loading` | `boolean` | No (default `false`) | Shows "Exporting..." and disables the button |
| `disabled` | `boolean` | No (default `false`) | Disables the button |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- **Single layer**: renders a simple button labeled "Export {label}".
- **Multiple layers**: renders a dropdown with a layer list. Click outside closes the dropdown.
- Disabled when `disabled || loading || layers.length === 0`.
- While `loading`, the button text changes to "Exporting..." and the button becomes non-interactive.

### Example

```tsx
import { ExportButton } from '@ogc-maps/storybook-components/components/ExportButton';
import { useCsvExport } from '@ogc-maps/storybook-components/hooks';

function App() {
  const { exportCsv, loading } = useCsvExport({ baseUrl: 'http://localhost:8000' });

  const exportableLayers = [
    { id: 'countries', label: 'Countries', collection: 'public.ne_110m_admin_0_countries' },
    { id: 'cities',    label: 'Cities',    collection: 'public.ne_110m_populated_places' },
  ];

  return (
    <ExportButton
      layers={exportableLayers}
      onExport={(layer) => exportCsv(layer.collection, `${layer.label}.csv`)}
      loading={loading}
    />
  );
}
```
