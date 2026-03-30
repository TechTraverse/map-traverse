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
│   map-ui-lib     │    │   map-client         │
│                  │    │                      │
│ • UI Components  │───▶│ • Zustand Stores     │
│ • Data Hooks     │    │ • MapLibre GL JS     │
│ • Schemas        │    │ • URL State (nuqs)   │
└──────────────────┘    └──────────────────────┘
```

## Monorepo Structure

```
storybook-components/
├── docker-compose.yml           # PostGIS + tipg + seed + admin-app
├── packages/
│   └── map-ui-lib/              # Reusable component library
│       ├── src/
│       │   ├── components/      # LayerPanel, Legend, BasemapSwitcher, CollapsibleControl,
│       │   │                    # CoordinateDisplay, SearchPanel, FeatureDetailPanel,
│       │   │                    # FeatureTooltip, ExportButton, + admin editor components
│       │   ├── hooks/           # useOgcCollections, useOgcFeatures, useOgcQueryables,
│       │   │                    # useOgcCollectionDetail, useCsvExport
│       │   ├── schemas/         # Zod config schemas
│       │   ├── types/           # TypeScript types
│       │   └── utils/           # OGC API fetch utilities, CQL2 builders
│       └── .storybook/          # Storybook configuration
│
├── apps/
│   ├── map-client/              # Demo map application
│   │   └── src/
│   │       ├── config/          # Map configuration
│   │       ├── stores/          # Zustand state management
│   │       ├── hooks/           # URL sync hooks
│   │       └── components/      # Map containers
│   │
│   └── admin-app/               # Map config admin panel
│       ├── src/                 # React frontend (config wizard, version history)
│       └── server/              # Express API + PostgreSQL backend
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

### Available Services (Docker)

| URL | Service |
|---|---|
| http://localhost | Gateway (all services on one port) |
| http://localhost:3000 | Map client (direct) |
| http://localhost:3001 | Admin app (direct) |
| http://localhost:8000 | tipg OGC API (direct) |

### Available Services (Dev / Vite)

| URL | Service |
|---|---|
| http://localhost:5173 | Map client (Vite) |
| http://localhost:5174 | Admin UI (Vite) |
| http://localhost:6006 | Storybook |
| localhost:5432 | PostGIS |

## Deployment Architecture

A single nginx gateway exposes all services through one port. The map client is public; the admin app requires authentication for write operations.

```
                            Internet
                               |
                          [ Gateway ]
                           nginx :80
                               |
            ┌──────────┬───────┴───────┬──────────┐
            |          |               |          |
        /api/*     /admin/*         /ogc/*        /*
            |          |               |          |
      ┌─────┴─────┐   |          ┌────┴────┐  ┌──┴──────────┐
      | admin-app |   |          |  tipg   |  | map-client  |
      |  Express  |───┘          | OGC API |  |  nginx SPA  |
      |  :3001    |              |  :8000  |  |    :80      |
      └─────┬─────┘              └────┬────┘  └─────────────┘
            |                         |
            └────────┬────────────────┘
                     |
               ┌─────┴─────┐
               |  PostGIS  |
               |   :5432   |
               └───────────┘
```

### Route Map

| Path | Upstream | Auth | Purpose |
|---|---|---|---|
| `/` | map-client | None | Public map viewer SPA |
| `/api/configs` | admin-app | GET: none, POST: session | List / create map configs |
| `/api/configs/:id` | admin-app | GET: none, PUT/DELETE: session | Read / update / delete a config |
| `/api/configs/:id/publish` | admin-app | POST: session | Publish / unpublish a config |
| `/api/sources` | admin-app | GET: none, POST: session | List / create OGC data sources |
| `/api/settings` | admin-app | GET: none, PUT: session | Site branding settings |
| `/api/auth/login` | admin-app | None | Session login |
| `/api/health` | admin-app | None | Health check |
| `/admin/*` | admin-app | Session (UI) | Admin SPA (config editor, source manager) |
| `/ogc/*` | tipg | None | OGC API (tiles, features, collections) |

### Auth Model

Authentication is enforced at the Express API layer — the gateway passes all requests through. The admin-app's `requireAuth` middleware protects all mutating endpoints (POST, PUT, DELETE). All GET endpoints are public so the map client can fetch configurations without credentials.

To enable auth, set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (bcrypt) environment variables on the admin-app service. When unset, auth is disabled (development mode).

Config names `admin`, `api`, and `ogc` are reserved to prevent conflicts with gateway routes.

## Key Features

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
- **SearchPanel**: Full-text and attribute search across collections
- **FeatureDetailPanel**: Click a feature to view its full properties
- **FeatureTooltip**: Hover preview of feature properties
- **ExportButton**: CSV export of visible layer data

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
3. Update example config in `apps/map-client/src/config/`
4. Validation errors show at runtime

## Project Status

All core implementation phases are complete:

- **Phase 1**: ✅ Project scaffolding and Docker infrastructure
- **Phase 2**: ✅ Config schemas and types
- **Phase 3**: ✅ Data hooks
- **Phase 4**: ✅ Core UI components
- **Phase 5**: ✅ Client app integration
- **Phase 6**: ✅ URL state management

## Contributing

This is a demonstration/learning project.

## License

MIT

## Acknowledgments

- **Natural Earth**: Free vector and raster map data
- **tipg**: OGC API implementation by Development Seed
- **MapLibre GL JS**: Open-source map rendering library
