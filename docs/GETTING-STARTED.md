# Getting Started

This guide walks you through defining a minimal config and rendering your first components from `@techtraverse/map-ui-lib`.

## Using the library

`@techtraverse/map-ui-lib` is an **internal workspace package** — it is not published to npm. It is consumed by the apps in this monorepo (`apps/map-client`, `apps/admin-app`) via a `workspace:*` reference in their `package.json`. No install step is needed; running `pnpm install` at the repo root wires everything up automatically.

To import from the lib within the monorepo:

```ts
import { LayerPanel } from '@techtraverse/map-ui-lib/components/LayerPanel';
import type { MapConfig } from '@techtraverse/map-ui-lib/types';
import { safeValidateMapConfig } from '@techtraverse/map-ui-lib/schemas';
```

The lib's compiled CSS must be imported in the consuming app's entry point (e.g., `main.tsx`):

```tsx
import '@techtraverse/map-ui-lib/style.css';
```

The library uses TailwindCSS v4 with a `mapui:` prefix — all styles are scoped and self-contained.

## Define a Minimal Config

Create a config object that satisfies `MapConfig`. At minimum you need one source, one basemap, and an `initialView`:

```ts
import type { MapConfig } from '@techtraverse/map-ui-lib/types';

export const mapConfig: MapConfig = {
  sources: [
    {
      id: 'my-api',
      url: 'https://my-ogc-api.example.com',
      label: 'My OGC API',
    },
  ],
  layers: [
    {
      id: 'countries',
      sourceId: 'my-api',
      collection: 'public.countries',
      label: 'Countries',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'fill',
        paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 },
      },
    },
  ],
  basemaps: [
    {
      id: 'carto-positron',
      label: 'CARTO Positron',
      url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    },
  ],
  initialView: {
    latitude: 0,
    longitude: 0,
    zoom: 2,
  },
};
```

## Validate the Config

Use `safeValidateMapConfig` to validate without throwing:

```ts
import { safeValidateMapConfig } from '@techtraverse/map-ui-lib/schemas';

const result = safeValidateMapConfig(mapConfig);

if (!result.success) {
  console.error('Invalid config:', result.error.issues);
} else {
  const validConfig = result.data; // fully typed MapConfig
}
```

Or use `validateMapConfig` if you prefer exceptions:

```ts
import { validateMapConfig } from '@techtraverse/map-ui-lib/schemas';

const validConfig = validateMapConfig(mapConfig); // throws ZodError if invalid
```

## Render Components

All components are fully controlled — you manage state and pass it down via props.

### LayerPanel + Legend

```tsx
import { useState } from 'react';
import { LayerPanel } from '@techtraverse/map-ui-lib/components/LayerPanel';
import { Legend } from '@techtraverse/map-ui-lib/components/Legend';
import { mapConfig } from './mapConfig';

function MapUI() {
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>(
    mapConfig.layers.filter((l) => l.visible).map((l) => l.id)
  );

  const handleToggle = (layerId: string) => {
    setVisibleLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  return (
    <div style={{ position: 'absolute', top: 16, right: 16 }}>
      <LayerPanel
        layers={mapConfig.layers}
        activeLayerIds={visibleLayerIds}
        onToggleVisibility={handleToggle}
      />
      <Legend layers={mapConfig.layers} visibleLayerIds={visibleLayerIds} />
    </div>
  );
}
```

## Next Steps

- **[CONFIGURATION.md](./CONFIGURATION.md)** — Full `MapConfig` schema reference
- **[COMPONENTS.md](./COMPONENTS.md)** — All component APIs
- **[HOOKS.md](./HOOKS.md)** — OGC API hooks and utility functions
- **[PUBLISHING.md](./PUBLISHING.md)** — Publishing and versioning guide
