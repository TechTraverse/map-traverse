# @ogc-maps/storybook-components

A reuseable, config-driven map component library built on OGC API standards. Designed for building interactive web maps with React, MapLibre GL JS, and `tipg`.

## Features

- **Framework Agnostic**: Pure React UI components with no direct MapLibre dependencies.
- **Config-Driven**: Define map structure and behavior via strongly-typed JSON configuration.
- **OGC Standards**: Native support for OGC API Features and Tiles (e.g., via `tipg`).
- **Controlled Components**: Fully controlled UI components for seamless state management.
- **TypeScript**: Comprehensive type definitions inferred from Zod schemas.

## Installation

```bash
pnpm add @ogc-maps/storybook-components
# or
npm install @ogc-maps/storybook-components
# or
yarn add @ogc-maps/storybook-components
```

## Usage

### 1. Import Styles

Import the library's CSS in your main entry point (e.g., `main.tsx` or `App.tsx`):

```tsx
import '@ogc-maps/storybook-components/dist/style.css';
```

### 2. Use Components

Components are exported as named exports. Example using the `LayerPanel`:

```tsx
import { LayerPanel } from '@ogc-maps/storybook-components/components/LayerPanel';

function MyMapUI() {
  const [activeLayers, setActiveLayers] = useState<string[]>(['my-layer-1']);

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded shadow">
      <LayerPanel 
        layers={myLayerConfig}
        activeLayerIds={activeLayers}
        onToggleVisibility={(layerId) => {
          // toggle logic
        }}
      />
    </div>
  );
}
```

### 3. Use Hooks

Data fetching hooks for OGC API endpoints:

```tsx
import { useOgcFeatures } from '@ogc-maps/storybook-components/hooks';

function FeatureList() {
  const { data, loading } = useOgcFeatures({
    collectionId: 'public.my_collection',
    limit: 10
  });

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {data.features.map(f => (
        <li key={f.id}>{f.properties.name}</li>
      ))}
    </ul>
  );
}
```

## Documentation

Full documentation and component playground available at:
[https://<YOUR_GITHUB_USERNAME>.github.io/ogc-maps](https://<YOUR_GITHUB_USERNAME>.github.io/ogc-maps) (Replace with actual URL once deployed)

## License

MIT
