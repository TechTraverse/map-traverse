import type { Meta, StoryObj } from '@storybook/react';
import { useOgcCollections } from './useOgcCollections';

interface CollectionsDisplayProps {
  baseUrl: string;
}

function CollectionsDisplay({ baseUrl }: CollectionsDisplayProps) {
  const { collections, loading, error } = useOgcCollections(baseUrl);

  if (loading) {
    return <div style={{ padding: 16, color: '#666' }}>Loading collections…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: '#c0392b' }}>
        <strong>Error:</strong> {error.message}
      </div>
    );
  }

  if (collections.length === 0) {
    return <div style={{ padding: 16, color: '#999' }}>No collections found.</div>;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ marginTop: 0 }}>
        Collections ({collections.length})
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {collections.map((c) => (
          <li
            key={c.id}
            style={{
              padding: '8px 12px',
              marginBottom: 4,
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <strong>{c.title ?? c.id}</strong>
            {c.description && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                {c.description}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              ID: <code>{c.id}</code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const meta: Meta<CollectionsDisplayProps> = {
  title: 'Hooks/useOgcCollections',
  component: CollectionsDisplay,
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates the `useOgcCollections` hook, which fetches and displays the list of collections from an OGC API endpoint.',
      },
    },
  },
  argTypes: {
    baseUrl: {
      control: 'text',
      description: 'Base URL of the OGC API server',
    },
  },
};

export default meta;

type Story = StoryObj<CollectionsDisplayProps>;

/** Fetches collections from the local tipg instance. */
export const Default: Story = {
  args: {
    baseUrl: 'http://localhost:8000',
  },
};

/** Demonstrates the error state when the URL is unreachable. */
export const ErrorState: Story = {
  args: {
    baseUrl: 'http://localhost:9999',
  },
};
