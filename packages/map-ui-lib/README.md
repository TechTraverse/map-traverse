# @ogc-maps/storybook-components

A reusable, config-driven map component library built on OGC API standards. Designed for building interactive web maps with React, MapLibre GL JS, and `tipg`.

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

Peer dependencies: `react`, `react-dom`, `react-icons`

## Quick Start

```tsx
// 1. Import styles in your entry point
import '@ogc-maps/storybook-components/dist/style.css';

// 2. Define and validate your config
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';

const result = safeValidateMapConfig(myConfig);
if (!result.success) throw new Error('Invalid config');

// 3. Render components with your state
import { LayerPanel } from '@ogc-maps/storybook-components/components/LayerPanel';
import { Legend }     from '@ogc-maps/storybook-components/components/Legend';

function MapUI({ layers, visibleIds, onToggle }) {
  return (
    <>
      <LayerPanel layers={layers} activeLayerIds={visibleIds} onToggleVisibility={onToggle} />
      <Legend layers={layers} visibleLayerIds={visibleIds} />
    </>
  );
}
```

## Documentation

- [Getting Started](../../docs/GETTING-STARTED.md) — Installation, minimal config, first render
- [Configuration](../../docs/CONFIGURATION.md) — Full `MapConfig` schema reference
- [Components](../../docs/COMPONENTS.md) — All 6 component APIs with props tables and examples
- [Hooks & Utilities](../../docs/HOOKS.md) — OGC API hooks and utility functions
- [Publishing](../../docs/PUBLISHING.md) — Versioning and release guide

## License

MIT
