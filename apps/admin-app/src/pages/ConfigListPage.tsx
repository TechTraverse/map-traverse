import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActionMenu } from '../components/ActionMenu';

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
  const navigate = useNavigate();

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
    if (!confirm('Delete this map?')) return;
    setActionError(null);
    const res = await fetch(`/api/configs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      setActionError(`Delete failed: ${await res.text()}`);
      return;
    }
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleDuplicate = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/configs/${id}`, { credentials: 'include' });
      if (!res.ok) {
        setActionError(`Duplicate failed: could not fetch config`);
        return;
      }
      const source = await res.json();

      const existingNames = new Set(configs.map(c => c.name));
      let newName = `${source.name}-copy`;
      let i = 2;
      while (existingNames.has(newName)) {
        newName = `${source.name}-copy-${i++}`;
      }

      const createRes = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName, description: source.description, config: source.config }),
      });
      if (!createRes.ok) {
        setActionError(`Duplicate failed: ${await createRes.text()}`);
        return;
      }
      const newConfig = await createRes.json();
      navigate(`/configs/${newConfig.id}/edit`);
    } catch (err) {
      setActionError(`Duplicate failed: ${String(err)}`);
    }
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
        <h1 className="mapui:text-2xl mapui:font-bold mapui:text-gray-900">Maps</h1>
        <Link
          to="/configs/new"
          className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:hover:bg-blue-700"
        >
          Create New Map
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
          No maps yet.{' '}
          <Link to="/configs/new" className="mapui:text-blue-600 mapui:hover:underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:overflow-visible">
          <table className="mapui:w-full">
            <thead className="mapui:bg-gray-50 mapui:text-left">
              <tr>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Name</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Description</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600 mapui:text-center">Published</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600 mapui:text-center">Default</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Updated</th>
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-gray-200">
              {configs.map(config => (
                <tr key={config.id} className="mapui:hover:bg-gray-50">
                  <td className="mapui:px-6 mapui:py-4 mapui:font-medium mapui:text-gray-900">{config.name}</td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-gray-500 mapui:text-sm">{config.description ?? '—'}</td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-center">
                    <button
                      role="switch"
                      aria-checked={config.is_published}
                      disabled={publishingId === config.id}
                      onClick={() => config.is_published ? handleUnpublish(config.id) : handlePublish(config.id)}
                      className={`mapui:relative mapui:inline-flex mapui:h-5 mapui:w-9 mapui:shrink-0 mapui:rounded-full mapui:transition-colors mapui:duration-200 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed ${config.is_published ? 'mapui:bg-green-500' : 'mapui:bg-gray-300'}`}
                    >
                      <span className={`mapui:pointer-events-none mapui:inline-block mapui:h-4 mapui:w-4 mapui:rounded-full mapui:bg-white mapui:shadow mapui:transition-transform mapui:duration-200 mapui:translate-y-0.5 ${config.is_published ? 'mapui:translate-x-4.5' : 'mapui:translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-center">
                    <button
                      role="switch"
                      aria-checked={config.is_default}
                      disabled={!config.is_published || publishingId === config.id}
                      onClick={() => config.is_default ? handleUnsetDefault(config.id) : handleSetDefault(config.id)}
                      className={`mapui:relative mapui:inline-flex mapui:h-5 mapui:w-9 mapui:shrink-0 mapui:rounded-full mapui:transition-colors mapui:duration-200 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed ${config.is_default ? 'mapui:bg-blue-500' : 'mapui:bg-gray-300'}`}
                    >
                      <span className={`mapui:pointer-events-none mapui:inline-block mapui:h-4 mapui:w-4 mapui:rounded-full mapui:bg-white mapui:shadow mapui:transition-transform mapui:duration-200 mapui:translate-y-0.5 ${config.is_default ? 'mapui:translate-x-4.5' : 'mapui:translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="mapui:px-6 mapui:py-4 mapui:text-gray-500 mapui:text-sm">
                    {new Date(config.updated_at).toLocaleDateString()}
                  </td>
                  <td className="mapui:px-6 mapui:py-4">
                    <ActionMenu configId={config.id} onDuplicate={() => handleDuplicate(config.id)} onDelete={() => handleDelete(config.id)} />
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
