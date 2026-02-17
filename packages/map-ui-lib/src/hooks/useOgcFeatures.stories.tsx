import type { Meta, StoryObj } from '@storybook/react';
import { useOgcFeatures } from './useOgcFeatures';

interface FeaturesDisplayProps {
  baseUrl: string;
  collection: string;
  limit: number;
  bboxEnabled: boolean;
  bboxWest: number;
  bboxSouth: number;
  bboxEast: number;
  bboxNorth: number;
}

function FeaturesDisplay({
  baseUrl,
  collection,
  limit,
  bboxEnabled,
  bboxWest,
  bboxSouth,
  bboxEast,
  bboxNorth,
}: FeaturesDisplayProps) {
  const bbox: [number, number, number, number] | undefined = bboxEnabled
    ? [bboxWest, bboxSouth, bboxEast, bboxNorth]
    : undefined;

  const { features, loading, error, hasMore } = useOgcFeatures(baseUrl, collection, {
    limit,
    bbox,
  });

  if (loading) {
    return <div style={{ padding: 16, color: '#666' }}>Loading features…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: '#c0392b' }}>
        <strong>Error:</strong> {error.message}
      </div>
    );
  }

  if (features.length === 0) {
    return <div style={{ padding: 16, color: '#999' }}>No features found.</div>;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ marginTop: 0 }}>
        Features ({features.length}){hasMore && ' — more available'}
      </h3>
      <details>
        <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
          GeoJSON Preview
        </summary>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(
            { type: 'FeatureCollection', features },
            null,
            2,
          )}
        </pre>
      </details>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          marginTop: 8,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>ID</th>
            <th style={{ padding: '6px 8px' }}>Geometry</th>
            <th style={{ padding: '6px 8px' }}>Properties</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => (
            <tr key={f.id ?? i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 8px' }}>
                <code>{f.id ?? '—'}</code>
              </td>
              <td style={{ padding: '6px 8px' }}>
                {(f.geometry as { type?: string })?.type ?? 'null'}
              </td>
              <td style={{ padding: '6px 8px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <code style={{ fontSize: 11 }}>
                  {JSON.stringify(f.properties)}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const meta: Meta<FeaturesDisplayProps> = {
  title: 'Hooks/useOgcFeatures',
  component: FeaturesDisplay,
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates the `useOgcFeatures` hook with interactive controls for collection name, limit, and bounding box.',
      },
    },
  },
  argTypes: {
    baseUrl: {
      control: 'text',
      description: 'Base URL of the OGC API server',
    },
    collection: {
      control: 'select',
      options: [
        'public.ne_110m_admin_0_countries',
        'public.ne_110m_populated_places',
        'public.ne_110m_rivers_lake_centerlines',
      ],
      description: 'OGC API collection ID',
    },
    limit: {
      control: { type: 'range', min: 1, max: 100, step: 1 },
      description: 'Maximum number of features to fetch',
    },
    bboxEnabled: {
      control: 'boolean',
      description: 'Enable bounding box filter',
    },
    bboxWest: {
      control: { type: 'number', min: -180, max: 180 },
      description: 'Bounding box west (min longitude)',
      if: { arg: 'bboxEnabled' },
    },
    bboxSouth: {
      control: { type: 'number', min: -90, max: 90 },
      description: 'Bounding box south (min latitude)',
      if: { arg: 'bboxEnabled' },
    },
    bboxEast: {
      control: { type: 'number', min: -180, max: 180 },
      description: 'Bounding box east (max longitude)',
      if: { arg: 'bboxEnabled' },
    },
    bboxNorth: {
      control: { type: 'number', min: -90, max: 90 },
      description: 'Bounding box north (max latitude)',
      if: { arg: 'bboxEnabled' },
    },
  },
};

export default meta;

type Story = StoryObj<FeaturesDisplayProps>;

/** Fetches populated places (points) from the local tipg instance. */
export const PopulatedPlaces: Story = {
  args: {
    baseUrl: 'http://localhost:8001',
    collection: 'public.ne_110m_populated_places',
    limit: 10,
    bboxEnabled: false,
    bboxWest: -180,
    bboxSouth: -90,
    bboxEast: 180,
    bboxNorth: 90,
  },
};

/** Fetches country polygons. */
export const Countries: Story = {
  args: {
    baseUrl: 'http://localhost:8001',
    collection: 'public.ne_110m_admin_0_countries',
    limit: 5,
    bboxEnabled: false,
    bboxWest: -180,
    bboxSouth: -90,
    bboxEast: 180,
    bboxNorth: 90,
  },
};

/** Fetches rivers filtered by a European bounding box. */
export const RiversWithBbox: Story = {
  args: {
    baseUrl: 'http://localhost:8001',
    collection: 'public.ne_110m_rivers_lake_centerlines',
    limit: 20,
    bboxEnabled: true,
    bboxWest: -10,
    bboxSouth: 35,
    bboxEast: 40,
    bboxNorth: 70,
  },
};

/** Demonstrates the error state when the collection does not exist. */
export const ErrorState: Story = {
  args: {
    baseUrl: 'http://localhost:8001',
    collection: 'nonexistent_collection',
    limit: 10,
    bboxEnabled: false,
    bboxWest: -180,
    bboxSouth: -90,
    bboxEast: 180,
    bboxNorth: 90,
  },
};
