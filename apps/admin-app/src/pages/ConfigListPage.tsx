import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface ConfigSummary {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function ConfigListPage() {
  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    const res = await fetch('/api/configs');
    setConfigs(await res.json() as ConfigSummary[]);
  };

  // Load configs on mount
  useEffect(() => {
    setLoading(true);
    fetchConfigs()
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this configuration?')) return;
    setActionError(null);
    const res = await fetch(`/api/configs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      setActionError(`Delete failed: ${await res.text()}`);
      return;
    }
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/configs/${id}/publish`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        setActionError(`Publish failed: ${await res.text()}`);
        return;
      }
      await fetchConfigs();
    } catch (err) {
      setActionError(`Publish failed: ${String(err)}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    setPublishingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/configs/${id}/unpublish`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        setActionError(`Unpublish failed: ${await res.text()}`);
        return;
      }
      await fetchConfigs();
    } catch (err) {
      setActionError(`Unpublish failed: ${String(err)}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setPublishingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/configs/${id}/set-default`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        setActionError(`Set default failed: ${await res.text()}`);
        return;
      }
      await fetchConfigs();
    } catch (err) {
      setActionError(`Set default failed: ${String(err)}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnsetDefault = async (id: string) => {
    setPublishingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/configs/${id}/unset-default`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        setActionError(`Remove default failed: ${await res.text()}`);
        return;
      }
      await fetchConfigs();
    } catch (err) {
      setActionError(`Remove default failed: ${String(err)}`);
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) return <div className="mapui:p-8 mapui:text-center mapui:text-gray-500">Loading...</div>;

  return (
    <div className="mapui:p-8">
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:mb-6">
        <h1 className="mapui:text-2xl mapui:font-bold mapui:text-gray-900">Map Configurations</h1>
        <Link
          to="/configs/new"
          className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:hover:bg-blue-700"
        >
          Create New Config
        </Link>
      </div>

      {error && (
        <div className="mapui:mb-4 mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:px-4 mapui:py-3 mapui:flex mapui:items-center mapui:justify-between">
          <span className="mapui:text-sm mapui:text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="mapui:text-red-500 mapui:hover:text-red-700 mapui:text-lg mapui:leading-none">×</button>
        </div>
      )}

      {actionError && (
        <div className="mapui:mb-4 mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:px-4 mapui:py-3 mapui:flex mapui:items-center mapui:justify-between">
          <span className="mapui:text-sm mapui:text-red-700">{actionError}</span>
          <button onClick={() => setActionError(null)} className="mapui:text-red-500 mapui:hover:text-red-700 mapui:text-lg mapui:leading-none">×</button>
        </div>
      )}

      {configs.length === 0 ? (
        <div className="mapui:text-center mapui:text-gray-500 mapui:py-12">
          No configurations yet.{' '}
          <Link to="/configs/new" className="mapui:text-blue-600 mapui:hover:underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:overflow-hidden">
          <table className="mapui:w-full">
            <thead className="mapui:bg-gray-50 mapui:text-left">
              <tr>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Name</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Description</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Status</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Updated</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-gray-200">
              {configs.map(config => (
                <tr key={config.id} className="mapui:hover:bg-gray-50">
                  <td className="mapui:px-6 mapui:py-4 mapui:font-medium mapui:text-gray-900">{config.name}</td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-gray-500 mapui:text-sm">{config.description ?? '—'}</td>
                  <td className="mapui:px-6 mapui:py-4">
                    <div className="mapui:flex mapui:gap-1">
                      {config.is_published ? (
                        <span className="mapui:bg-green-100 mapui:text-green-700 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-medium">
                          Published
                        </span>
                      ) : (
                        <span className="mapui:bg-gray-100 mapui:text-gray-600 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-medium">
                          Draft
                        </span>
                      )}
                      {config.is_default && (
                        <span className="mapui:bg-blue-100 mapui:text-blue-700 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-medium">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-gray-500 mapui:text-sm">
                    {new Date(config.updated_at).toLocaleDateString()}
                  </td>
                  <td className="mapui:px-6 mapui:py-4">
                    <div className="mapui:flex mapui:gap-2">
                      <Link
                        to={`/configs/${config.id}/edit`}
                        className="mapui:text-blue-600 mapui:hover:underline mapui:text-sm"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/configs/${config.id}/preview`}
                        className="mapui:text-indigo-600 mapui:hover:underline mapui:text-sm"
                      >
                        Preview
                      </Link>
                      <Link
                        to={`/configs/${config.id}/versions`}
                        className="mapui:text-purple-600 mapui:hover:underline mapui:text-sm"
                      >
                        History
                      </Link>
                      {config.is_published ? (
                        <button
                          onClick={() => handleUnpublish(config.id)}
                          disabled={publishingId === config.id}
                          className="mapui:text-orange-600 mapui:hover:underline mapui:text-sm mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
                        >
                          {publishingId === config.id ? 'Unpublishing...' : 'Unpublish'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(config.id)}
                          disabled={publishingId === config.id}
                          className="mapui:text-green-600 mapui:hover:underline mapui:text-sm mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
                        >
                          {publishingId === config.id ? 'Publishing...' : 'Publish'}
                        </button>
                      )}
                      {config.is_published && !config.is_default && (
                        <button
                          onClick={() => handleSetDefault(config.id)}
                          disabled={publishingId === config.id}
                          className="mapui:text-blue-600 mapui:hover:underline mapui:text-sm mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
                        >
                          Set Default
                        </button>
                      )}
                      {config.is_default && (
                        <button
                          onClick={() => handleUnsetDefault(config.id)}
                          disabled={publishingId === config.id}
                          className="mapui:text-blue-600 mapui:hover:underline mapui:text-sm mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
                        >
                          Remove Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="mapui:text-red-600 mapui:hover:underline mapui:text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
