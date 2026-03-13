import { Fragment, useEffect, useState } from 'react';
import { SourceEditor, ConfirmDialog } from '@ogc-maps/storybook-components';
import type { OgcApiSource } from '@ogc-maps/storybook-components';
import { SourceMetadataPanel } from '../components/SourceMetadataPanel';
import type { InspectionResult } from '../components/SourceMetadataPanel';
import { inspectSourceClientSide } from '../utils/inspectSource';

interface SavedSource {
  id: string;
  source_id: string;
  url: string;
  label: string | null;
  tile_matrix_set_id: string;
  metadata: InspectionResult | null;
  metadata_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

function toOgcApiSource(s: SavedSource): OgcApiSource {
  return {
    id: s.source_id,
    url: s.url,
    label: s.label ?? undefined,
    tileMatrixSetId: s.tile_matrix_set_id,
  };
}

function DismissibleAlert({ message, variant, onDismiss }: { message: string; variant: 'error' | 'success'; onDismiss: () => void }) {
  const color = variant === 'error' ? 'red' : 'green';
  return (
    <div className={`mapui:mb-4 mapui:rounded mapui:bg-${color}-50 mapui:border mapui:border-${color}-200 mapui:px-4 mapui:py-3 mapui:flex mapui:items-center mapui:justify-between`}>
      <span className={`mapui:text-sm mapui:text-${color}-700`}>{message}</span>
      <button onClick={onDismiss} className={`mapui:text-${color}-500 mapui:hover:text-${color}-700 mapui:text-lg mapui:leading-none`}>×</button>
    </div>
  );
}

export function SourcesPage() {
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create/edit state
  const [addingNew, setAddingNew] = useState(false);
  const [newSource, setNewSource] = useState<OgcApiSource>({ id: '', url: '', tileMatrixSetId: 'WebMercatorQuad' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<OgcApiSource | null>(null);
  const [saving, setSaving] = useState(false);

  // Connection test state
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<{ id: string; name: string }[]>([]);

  // Expand/collapse and refresh state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchSources = async () => {
    const res = await fetch('/api/sources');
    setSources(await res.json() as SavedSource[]);
  };

  useEffect(() => {
    setLoading(true);
    fetchSources()
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleTestConnection = async (key: string, url: string) => {
    setTestStatus(prev => ({ ...prev, [key]: 'loading' }));
    const normalizedUrl = url.trim().replace(/\/$/, '');
    const testUrl = /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `http://${normalizedUrl}`;

    // Try client-side first (browser fetches directly)
    try {
      const res = await fetch(`${testUrl}/conformance?f=json`, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setTestStatus(prev => ({ ...prev, [key]: 'success' }));
        return;
      }
    } catch {
      // Client-side failed (CORS/network) — fall through to server-side
    }

    // Server-side fallback
    try {
      const res = await fetch('/api/sources/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTestStatus(prev => ({ ...prev, [key]: 'success' }));
      } else {
        setTestStatus(prev => ({ ...prev, [key]: 'error' }));
        setTestError(prev => ({ ...prev, [key]: data.error ?? 'Connection failed' }));
      }
    } catch (err) {
      setTestStatus(prev => ({ ...prev, [key]: 'error' }));
      setTestError(prev => ({ ...prev, [key]: err instanceof Error ? err.message : 'Network error' }));
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setActionError(null);
    try {
      // Try client-side inspection first
      let clientMetadata: InspectionResult | undefined;
      try {
        clientMetadata = await inspectSourceClientSide(newSource.url);
      } catch {
        // Client-side inspection failed (CORS/network) — server will auto-inspect
      }

      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source_id: newSource.id,
          url: newSource.url,
          label: newSource.label || null,
          tile_matrix_set_id: newSource.tileMatrixSetId || 'WebMercatorQuad',
          ...(clientMetadata ? { metadata: clientMetadata } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        setActionError(data.error);
        return;
      }
      const created = await res.json() as SavedSource;
      setAddingNew(false);
      setNewSource({ id: '', url: '', tileMatrixSetId: 'WebMercatorQuad' });
      await fetchSources();
      // Auto-expand the new source to show its metadata
      setExpandedIds(prev => new Set(prev).add(created.id));
    } catch (err) {
      setActionError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editingSource) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/sources/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source_id: editingSource.id,
          url: editingSource.url,
          label: editingSource.label || null,
          tile_matrix_set_id: editingSource.tileMatrixSetId || 'WebMercatorQuad',
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        setActionError(data.error);
        return;
      }
      setEditingId(null);
      setEditingSource(null);
      await fetchSources();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (source: SavedSource) => {
    try {
      const res = await fetch(`/api/sources/${source.id}/usage`);
      const data = await res.json() as { configs: { id: string; name: string }[] };
      setDeleteUsage(data.configs ?? []);
    } catch {
      setDeleteUsage([]);
    }
    setConfirmDeleteId(source.id);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/sources/${confirmDeleteId}?force=true`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setActionError(`Delete failed: ${await res.text()}`);
        return;
      }
      setSources(prev => prev.filter(s => s.id !== confirmDeleteId));
    } catch (err) {
      setActionError(String(err));
    } finally {
      setConfirmDeleteId(null);
      setDeleteUsage([]);
    }
  };

  const handleImport = async () => {
    setActionError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/sources/import', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setActionError(`Import failed: ${await res.text()}`);
        return;
      }
      const data = await res.json() as { imported: number; total: number };
      setSuccessMessage(`Imported ${data.imported} source(s) from existing configs (${data.total} unique found).`);
      await fetchSources();
    } catch (err) {
      setActionError(String(err));
    }
  };

  const handleRefreshMetadata = async (source: SavedSource) => {
    setRefreshingIds(prev => new Set(prev).add(source.id));
    try {
      // Try client-side inspection first
      let succeeded = false;
      try {
        const metadata = await inspectSourceClientSide(source.url);
        const res = await fetch(`/api/sources/${source.id}/metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ metadata }),
        });
        if (res.ok) {
          const updated = await res.json() as SavedSource;
          setSources(prev => prev.map(s => s.id === source.id ? updated : s));
          succeeded = true;
        }
      } catch {
        // Client-side failed — fall through to server-side
      }

      if (!succeeded) {
        // Server-side fallback
        const res = await fetch(`/api/sources/${source.id}/inspect`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const updated = await res.json() as SavedSource;
          setSources(prev => prev.map(s => s.id === source.id ? updated : s));
        } else {
          setActionError(`Inspect failed: ${await res.text()}`);
        }
      }
    } catch (err) {
      setActionError(String(err));
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(source.id);
        return next;
      });
    }
  };

  if (loading) return <div className="mapui:p-8 mapui:text-center mapui:text-gray-500">Loading...</div>;

  return (
    <div className="mapui:p-8">
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:mb-6">
        <h1 className="mapui:text-2xl mapui:font-bold mapui:text-gray-900">OGC API Sources</h1>
        <div className="mapui:flex mapui:gap-2">
          <button
            onClick={handleImport}
            className="mapui:border mapui:border-gray-300 mapui:text-gray-700 mapui:px-4 mapui:py-2 mapui:rounded mapui:hover:bg-gray-50 mapui:text-sm"
          >
            Import from Configs
          </button>
          <button
            onClick={() => { setAddingNew(true); setNewSource({ id: '', url: '', tileMatrixSetId: 'WebMercatorQuad' }); }}
            className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:hover:bg-blue-700 mapui:text-sm"
          >
            Create New Source
          </button>
        </div>
      </div>

      {error && <DismissibleAlert message={error} variant="error" onDismiss={() => setError(null)} />}
      {actionError && <DismissibleAlert message={actionError} variant="error" onDismiss={() => setActionError(null)} />}
      {successMessage && <DismissibleAlert message={successMessage} variant="success" onDismiss={() => setSuccessMessage(null)} />}

      {/* Create new source form */}
      {addingNew && (
        <div className="mapui:mb-6 mapui:bg-white mapui:rounded-lg mapui:shadow mapui:p-6">
          <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800 mapui:mb-4">New Source</h2>
          <SourceEditor
            value={newSource}
            onChange={setNewSource}
            onTestConnection={url => handleTestConnection('new', url)}
            testStatus={testStatus['new']}
            testError={testError['new']}
          />
          <div className="mapui:mt-4 mapui:flex mapui:gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newSource.id || !newSource.url}
              className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Source'}
            </button>
            <button
              onClick={() => setAddingNew(false)}
              className="mapui:border mapui:border-gray-300 mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sources.length === 0 && !addingNew ? (
        <div className="mapui:text-center mapui:text-gray-500 mapui:py-12">
          No sources saved yet. Create one or import from existing configs.
        </div>
      ) : sources.length > 0 && (
        <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:overflow-visible">
          <table className="mapui:w-full">
            <thead className="mapui:bg-gray-50 mapui:text-left">
              <tr>
                <th className="mapui:px-3 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600 mapui:w-8"></th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Source ID</th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">URL</th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Label</th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Collections</th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Updated</th>
                <th className="mapui:px-4 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-gray-200">
              {sources.map(source => (
                <Fragment key={source.id}>
                  <tr>
                    {editingId === source.id ? (
                      <td colSpan={7} className="mapui:px-6 mapui:py-4">
                        <SourceEditor
                          value={editingSource ?? toOgcApiSource(source)}
                          onChange={setEditingSource}
                          onTestConnection={url => handleTestConnection(`edit-${source.id}`, url)}
                          testStatus={testStatus[`edit-${source.id}`]}
                          testError={testError[`edit-${source.id}`]}
                        />
                        <div className="mapui:mt-3 mapui:flex mapui:gap-2">
                          <button
                            onClick={handleUpdate}
                            disabled={saving || !editingSource?.id || !editingSource?.url}
                            className="mapui:bg-blue-600 mapui:text-white mapui:px-3 mapui:py-1.5 mapui:rounded mapui:text-sm mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditingSource(null); }}
                            className="mapui:border mapui:border-gray-300 mapui:px-3 mapui:py-1.5 mapui:rounded mapui:text-sm mapui:hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="mapui:px-3 mapui:py-4">
                          <button
                            onClick={() => toggleExpanded(source.id)}
                            className="mapui:text-gray-400 mapui:hover:text-gray-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`mapui:transition-transform ${expandedIds.has(source.id) ? 'mapui:rotate-90' : ''}`}
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </td>
                        <td className="mapui:px-4 mapui:py-4 mapui:font-medium mapui:font-mono mapui:text-sm mapui:text-gray-900">{source.source_id}</td>
                        <td className="mapui:px-4 mapui:py-4 mapui:text-gray-500 mapui:text-sm mapui:font-mono mapui:max-w-xs mapui:truncate">{source.url}</td>
                        <td className="mapui:px-4 mapui:py-4 mapui:text-gray-500 mapui:text-sm">{source.label ?? '—'}</td>
                        <td className="mapui:px-4 mapui:py-4 mapui:text-gray-500 mapui:text-sm">
                          {source.metadata?.collections?.length ?? '—'}
                        </td>
                        <td className="mapui:px-4 mapui:py-4 mapui:text-gray-500 mapui:text-sm">
                          {new Date(source.updated_at).toLocaleDateString()}
                        </td>
                        <td className="mapui:px-4 mapui:py-4">
                          <div className="mapui:flex mapui:gap-2">
                            <button
                              onClick={() => { setEditingId(source.id); setEditingSource(toOgcApiSource(source)); }}
                              className="mapui:text-blue-600 mapui:hover:text-blue-800 mapui:text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(source)}
                              className="mapui:text-red-600 mapui:hover:text-red-800 mapui:text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedIds.has(source.id) && editingId !== source.id && (
                    <tr>
                      <td colSpan={7} className="mapui:p-0">
                        <SourceMetadataPanel
                          metadata={source.metadata}
                          metadataUpdatedAt={source.metadata_updated_at}
                          onRefresh={() => handleRefreshMetadata(source)}
                          refreshing={refreshingIds.has(source.id)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete Source"
        description={
          deleteUsage.length > 0
            ? `This source is used by ${deleteUsage.length} config(s): ${deleteUsage.map(c => c.name).join(', ')}. Deleting it will not affect existing configs (sources are embedded in config data), but it will no longer be available for reuse.`
            : 'Are you sure you want to delete this source?'
        }
        onConfirm={handleDelete}
        onCancel={() => { setConfirmDeleteId(null); setDeleteUsage([]); }}
      />
    </div>
  );
}
