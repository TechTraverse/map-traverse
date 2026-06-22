import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ConfigPreview } from '@techtraverse/map-ui-lib';

interface VersionSummary {
  id: string;
  version_number: number;
  name: string;
  created_by: string | null;
  created_at: string;
}

interface VersionDetail extends VersionSummary {
  description: string | null;
  config: unknown;
}

export function VersionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [current, setCurrent] = useState<VersionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/configs/${id}/versions`).then(r => r.json()),
      fetch(`/api/configs/${id}`).then(r => r.json()),
    ])
      .then(([versionData, currentData]) => {
        setVersions(versionData as VersionSummary[]);
        setCurrent(currentData as VersionDetail);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [id]);

  const handleSelectVersion = async (versionId: string) => {
    const res = await fetch(`/api/configs/${id}/versions/${versionId}`);
    const data = await res.json() as VersionDetail;
    setSelected(data);
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Restore this version? The current state will be saved as a new version.')) return;
    setRestoring(true);
    try {
      await fetch(`/api/configs/${id}/restore/${versionId}`, { method: 'POST', credentials: 'include' });
      navigate('/configs');
    } catch (err) {
      setError(String(err));
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <div className="mapui:p-8 mapui:text-center mapui:text-slate-500">Loading...</div>;
  if (error) return <div className="mapui:p-8 mapui:text-red-600">{error}</div>;

  return (
    <div className="mapui:p-8">
      <div className="mapui:flex mapui:items-center mapui:gap-4 mapui:mb-6">
        <Link to="/configs" className="mapui:text-blue-600 mapui:hover:underline mapui:text-sm">
          ← Back to Configs
        </Link>
        <h1 className="mapui:text-2xl mapui:font-bold mapui:text-slate-900">
          Version History: {current?.name}
        </h1>
      </div>

      {versions.length === 0 ? (
        <div className="mapui:text-slate-500 mapui:py-8 mapui:text-center">
          No version history yet. Versions are created each time the config is updated.
        </div>
      ) : (
        <div className="mapui:flex mapui:gap-6">
          {/* Version list */}
          <div className="mapui:w-72 mapui:flex-shrink-0">
            <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:overflow-hidden">
              <div className="mapui:px-4 mapui:py-3 mapui:bg-slate-50 mapui:border-b mapui:text-sm mapui:font-medium mapui:text-slate-600">
                Saved Versions
              </div>
              <ul className="mapui:divide-y mapui:divide-slate-100">
                {versions.map(v => (
                  <li
                    key={v.id}
                    className={`mapui:px-4 mapui:py-3 mapui:cursor-pointer mapui:hover:bg-slate-50 ${selected?.id === v.id ? 'mapui:bg-blue-50' : ''}`}
                    onClick={() => handleSelectVersion(v.id)}
                  >
                    <div className="mapui:flex mapui:items-center mapui:justify-between">
                      <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">
                        v{v.version_number}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleRestore(v.id); }}
                        disabled={restoring}
                        className="mapui:text-xs mapui:text-green-600 mapui:hover:underline mapui:disabled:opacity-50"
                      >
                        Restore
                      </button>
                    </div>
                    <div className="mapui:text-xs mapui:text-slate-500 mapui:mt-1">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    {v.created_by && (
                      <div className="mapui:text-xs mapui:text-slate-400">by {v.created_by}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Comparison panel */}
          <div className="mapui:flex-1 mapui:min-w-0">
            {selected ? (
              <div className="mapui:grid mapui:grid-cols-2 mapui:gap-4">
                <div>
                  <div className="mapui:text-sm mapui:font-medium mapui:text-slate-600 mapui:mb-2">
                    Version {selected.version_number} (selected)
                  </div>
                  <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:p-4">
                    <ConfigPreview config={selected.config as Parameters<typeof ConfigPreview>[0]['config']} />
                  </div>
                </div>
                <div>
                  <div className="mapui:text-sm mapui:font-medium mapui:text-slate-600 mapui:mb-2">
                    Current
                  </div>
                  <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:p-4">
                    <ConfigPreview config={current?.config as Parameters<typeof ConfigPreview>[0]['config']} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:p-8 mapui:text-center mapui:text-slate-400">
                Select a version from the list to compare it with the current config.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
