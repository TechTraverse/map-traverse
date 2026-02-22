import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface ConfigSummary {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
}

export function ConfigListPage() {
  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [envFilter, setEnvFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available environments
  useEffect(() => {
    fetch('/api/environments')
      .then(r => r.json())
      .then(data => setEnvironments(data as string[]))
      .catch(() => setEnvironments(['production']));
  }, []);

  // Load configs whenever env filter changes
  useEffect(() => {
    setLoading(true);
    const url = envFilter ? `/api/configs?env=${encodeURIComponent(envFilter)}` : '/api/configs';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setConfigs(data as ConfigSummary[]);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [envFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this configuration?')) return;
    const res = await fetch(`/api/configs/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      alert(`Delete failed: ${await res.text()}`);
      return;
    }
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/configs/${id}/publish`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        alert(`Publish failed: ${await res.text()}`);
        return;
      }
      // Re-fetch to reflect updated published state per environment
      const url = envFilter ? `/api/configs?env=${encodeURIComponent(envFilter)}` : '/api/configs';
      const listRes = await fetch(url);
      setConfigs(await listRes.json() as ConfigSummary[]);
    } catch (err) {
      alert(`Publish failed: ${String(err)}`);
    }
  };

  if (loading) return <div className="mapui:p-8 mapui:text-center mapui:text-gray-500">Loading...</div>;
  if (error) return <div className="mapui:p-8 mapui:text-red-600">{error}</div>;

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

      {/* Environment filter */}
      {environments.length > 1 && (
        <div className="mapui:mb-4 mapui:flex mapui:items-center mapui:gap-3">
          <label className="mapui:text-sm mapui:font-medium mapui:text-gray-600">
            Environment:
          </label>
          <select
            value={envFilter}
            onChange={e => setEnvFilter(e.target.value)}
            className="mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-1.5 mapui:text-sm focus:mapui:outline-none focus:mapui:ring-2 focus:mapui:ring-blue-500"
          >
            <option value="">All</option>
            {environments.map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
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
                <th className="mapui:px-6 mapui:py-3 mapui:text-sm mapui:font-medium mapui:text-gray-600">Environment</th>
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
                    <span className="mapui:bg-slate-100 mapui:text-slate-600 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-mono">
                      {config.environment}
                    </span>
                  </td>
                  <td className="mapui:px-6 mapui:py-4">
                    {config.is_published ? (
                      <span className="mapui:bg-green-100 mapui:text-green-700 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-medium">
                        Published
                      </span>
                    ) : (
                      <span className="mapui:bg-gray-100 mapui:text-gray-600 mapui:px-2 mapui:py-1 mapui:rounded mapui:text-xs mapui:font-medium">
                        Draft
                      </span>
                    )}
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
                        to={`/configs/${config.id}/versions`}
                        className="mapui:text-purple-600 mapui:hover:underline mapui:text-sm"
                      >
                        History
                      </Link>
                      {!config.is_published && (
                        <button
                          onClick={() => handlePublish(config.id)}
                          className="mapui:text-green-600 mapui:hover:underline mapui:text-sm"
                        >
                          Publish
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
