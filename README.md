# Storybook Maps

A reusable, config-driven map component ecosystem built on OGC API standards (tipg). This monorepo provides a React component library for building interactive web maps backed by PostGIS and vector tile services.

## Project Goals

### Core Objectives

1. **Config-Driven Architecture**: Define map behavior, layers, and UI through declarative JSON configuration validated with Zod schemas
2. **Separation of Concerns**: Keep the component library framework-agnostic and MapLibre-independent for maximum reusability
3. **OGC API Standards**: Use tipg (OGC API Features/Tiles server) as the primary data backend
4. **Shareable State**: Enable shareable URLs via query parameters using nuqs
5. **Developer Experience**: Provide excellent TypeScript support with comprehensive type inference

### Technical Principles

- **Component Library** (`@ogc-maps/storybook-components`): Pure UI components with no MapLibre dependencies
- **Controlled Components**: All components are fully controlled via props and callbacks
- **Tree-shakeable**: Multiple entry points for optimal bundle sizes
- **Storybook-First**: All components developed with interactive Storybook stories
- **Type-Safe**: End-to-end type safety from config validation to component props

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     JSON Config                             │
│                   (map-config.ts)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Zod Validation (map-ui-lib)                    │
│         • MapConfig, LayerConfig, BasemapConfig             │
│         • Runtime validation + TypeScript inference         │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────────┐
│   map-ui-lib     │    │   client-map-app     │
│                  │    │                      │
│ • UI Components  │───▶│ • Zustand Stores     │
│ • Data Hooks     │    │ • MapLibre GL JS     │
│ • Schemas        │    │ • URL State (nuqs)   │
└──────────────────┘    └──────────────────────┘
```

## Monorepo Structure

```
storybook-components/
├── docker-compose.yml           # PostGIS + tipg + seed
├── packages/
│   └── map-ui-lib/              # Reusable component library
│       ├── src/
│       │   ├── components/      # LayerPanel, Legend, BasemapSwitcher
│       │   ├── hooks/           # useOgcCollections, useOgcFeatures
│       │   ├── schemas/         # Zod config schemas
│       │   ├── types/           # TypeScript types
│       │   └── utils/           # OGC API fetch utilities
│       └── .storybook/          # Storybook configuration
│
├── apps/
│   └── client-map-app/          # Demo map application
│       └── src/
│           ├── config/          # Map configuration
│           ├── stores/          # Zustand state management
│           ├── hooks/           # URL sync hooks
│           └── components/      # Map containers
│
└── docker/                      # Development infrastructure
    └── seed/                    # Natural Earth sample data
```

## Technology Stack

### Component Library
- **React 18**: UI framework (peer dependency)
- **Zod**: Schema validation and type inference
- **TailwindCSS v4**: Styling with `mapui:` prefix to prevent conflicts
- **Vite**: Build tool with library mode
- **Storybook 8**: Component development environment

### Client Application
- **React 18**: UI framework
- **MapLibre GL JS**: Map rendering engine (via react-map-gl)
- **Zustand**: Lightweight state management
- **nuqs**: Type-safe URL state synchronization
- **TailwindCSS v4**: Styling

### Backend Infrastructure
- **PostGIS**: Spatial database
- **tipg**: OGC API Features/Tiles server
- **Natural Earth**: Sample geographic data (110m scale)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10
- Docker and Docker Compose

### Installation

```bash
# Install dependencies
pnpm install

# Start backend services (PostGIS + tipg)
docker compose up -d

# Wait for seed to complete (~30 seconds)
docker logs -f storybook-components-seed

# Verify tipg is serving data
curl http://localhost:8000/collections
```

### Development

```bash
# Run Storybook (component library)
pnpm storybook

# Run client app
pnpm dev:app

# Build library
pnpm build:lib

# Build client app
pnpm build:app
```

### Available Services

- **Client App**: http://localhost:5173
- **Storybook**: http://localhost:6006
- **tipg API**: http://localhost:8000
- **PostGIS**: localhost:5432

## Key Features (Planned)

### Map Configuration
- Declarative layer definitions with style specifications
- Multiple basemap support
- Initial view state (center, zoom, pitch, bearing)
- UI component visibility toggles

### Data Sources
- **Vector Tiles**: Efficient streaming from tipg MVT endpoints
- **GeoJSON**: Client-side rendering via OGC API Features
- **Dynamic Filtering**: Queryable attributes per collection
- **Pagination**: Cursor-based navigation for large datasets

### UI Components
- **LayerPanel**: Toggle visibility, reorder layers, adjust opacity
- **Legend**: Auto-generated or custom legend entries
- **BasemapSwitcher**: Thumbnail-based basemap selection
- **Search** (future): Full-text search across collections

### State Management
- **URL Synchronization**: Shareable links with view state and filters
- **Browser History**: Back/forward navigation through map states
- **Debounced Updates**: Smooth viewport changes without URL spam

## Data Flow

1. **Configuration**: JSON config defines sources, layers, basemaps, UI
2. **Validation**: Zod schemas validate config at runtime
3. **Hydration**: Config populates Zustand stores in client app
4. **Data Fetching**: Hooks fetch from tipg endpoints
5. **Rendering**: MapLibre renders vector tiles; React components render UI
6. **URL Sync**: nuqs keeps URL in sync with Zustand state
7. **User Interaction**: Changes flow back through stores to URL

## Development Workflow

### Adding a New Component

1. Create component in `packages/map-ui-lib/src/components/`
2. Use `mapui:` prefixed Tailwind classes
3. Create Storybook story (`.stories.tsx`)
4. Export from component index and main entry point
5. Add Vite entry point for tree-shaking
6. Build and verify in Storybook

### Updating Config Schema

1. Modify Zod schema in `schemas/config.ts`
2. TypeScript types auto-infer from schema
3. Update example config in `apps/client-map-app/src/config/`
4. Validation errors show at runtime

## Project Status

All core implementation phases are complete. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for details.

## Contributing

This is a demonstration/learning project. The implementation plan follows a phased approach:

- **Phase 1**: ✅ Project scaffolding and Docker infrastructure
- **Phase 2**: ✅ Config schemas and types
- **Phase 3**: ✅ Data hooks
- **Phase 4**: ✅ Core UI components
- **Phase 5**: ✅ Client app integration
- **Phase 6**: ✅ URL state management

## License

MIT

## Acknowledgments

- **Natural Earth**: Free vector and raster map data
- **tipg**: OGC API implementation by Development Seed
- **MapLibre GL JS**: Open-source map rendering library
