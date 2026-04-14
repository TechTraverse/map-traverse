import { useState } from 'react';
import type { OgcApiSource } from '../../types';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { SourceEditor } from './SourceEditor';

export interface SourceListProps {
  sources: OgcApiSource[];
  onChange: (sources: OgcApiSource[]) => void;
  /** When set, only shows sources of this type and locks new sources to it. */
  sourceType?: 'features' | 'imagery';
}

/** Check whether a source matches a given type (defaults to 'features' when unset). */
export const isSourceType = (source: OgcApiSource, type: 'features' | 'imagery') =>
  (source.type ?? 'features') === type;

export const isFeatureSource = (source: OgcApiSource) => isSourceType(source, 'features');

const defaultSource = (type?: 'features' | 'imagery'): OgcApiSource => ({
  id: '',
  url: '',
  label: undefined,
  tileMatrixSetId: 'WebMercatorQuad',
  type: type ?? 'features',
});

export function SourceList({ sources, onChange, sourceType }: SourceListProps) {
  const displaySources = sourceType ? sources.filter(s => isSourceType(s, sourceType)) : sources;

  // When filtered by type, merge changes back with sources of the other type
  const emitChange = (updated: OgcApiSource[]) => {
    if (!sourceType) {
      onChange(updated);
      return;
    }
    const otherSources = sources.filter(s => !isSourceType(s, sourceType));
    onChange([...otherSources, ...updated]);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<OgcApiSource | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newSource, setNewSource] = useState<OgcApiSource>(defaultSource());
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleTestConnection = async (key: string, url: string) => {
    setTestStatus((prev) => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fetch(`${url}/conformance`);
      if (res.ok) {
        setTestStatus((prev) => ({ ...prev, [key]: 'success' }));
      } else {
        setTestStatus((prev) => ({ ...prev, [key]: 'error' }));
        setTestError((prev) => ({ ...prev, [key]: `HTTP ${res.status}` }));
      }
    } catch (err) {
      setTestStatus((prev) => ({ ...prev, [key]: 'error' }));
      setTestError((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Network error' }));
    }
  };

  const handleSaveEdit = () => {
    if (!editingSource) return;
    emitChange(displaySources.map((s) => (s.id === editingId ? editingSource : s)));
    setEditingId(null);
    setEditingSource(null);
  };

  const handleSaveNew = () => {
    emitChange([...displaySources, newSource]);
    setAddingNew(false);
    setNewSource(defaultSource(sourceType));
  };

  const handleDelete = (id: string) => {
    emitChange(displaySources.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-slate-700">
          Sources
        </h3>
        <button
          type="button"
          onClick={() => { setAddingNew(true); setNewSource(defaultSource(sourceType)); }}
          className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
        >
          + Add Source
        </button>
      </div>

      {displaySources.length === 0 && !addingNew && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-slate-500">No sources configured.</p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {displaySources.map((source) => (
          <li
            key={source.id}
            className="mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-3"
          >
            {editingId === source.id ? (
              <div className="mapui:flex mapui:flex-col mapui:gap-3">
                <SourceEditor
                  value={editingSource ?? source}
                  onChange={setEditingSource}
                  onTestConnection={(url) => handleTestConnection(`edit-${source.id}`, url)}
                  testStatus={testStatus[`edit-${source.id}`]}
                  testError={testError[`edit-${source.id}`]}
                  sourceType={sourceType}
                />
                <div className="mapui:flex mapui:gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={!editingSource?.id || !editingSource?.url}
                    className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditingSource(null); }}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-slate-700 hover:mapui:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mapui:flex mapui:items-start mapui:justify-between mapui:gap-2">
                <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                  <div className="mapui:flex mapui:items-center mapui:gap-1.5">
                    <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">
                      {source.label ?? source.id}
                    </span>
                    {source.type === 'imagery' && (
                      <span className="mapui:text-xs mapui:rounded-full mapui:bg-purple-100 mapui:text-purple-700 mapui:px-1.5 mapui:py-0.5">
                        Imagery
                      </span>
                    )}
                  </div>
                  <span className="mapui:font-mono mapui:text-xs mapui:text-slate-500">
                    {source.url}
                  </span>
                  {source.tileMatrixSetId && (
                    <span className="mapui:text-xs mapui:text-slate-400">
                      TMS: {source.tileMatrixSetId}
                    </span>
                  )}
                </div>
                <div className="mapui:flex mapui:shrink-0 mapui:gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditingId(source.id); setEditingSource(source); }}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-slate-600 hover:mapui:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(source.id)}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {addingNew && (
        <div className="mapui:rounded-lg mapui:border mapui:border-blue-200 mapui:bg-blue-50 mapui:p-3">
          <p className="mapui:m-0 mapui:mb-3 mapui:text-xs mapui:font-semibold mapui:text-blue-700">
            New Source
          </p>
          <SourceEditor
            value={newSource}
            onChange={setNewSource}
            onTestConnection={(url) => handleTestConnection('new', url)}
            testStatus={testStatus['new']}
            testError={testError['new']}
            sourceType={sourceType}
          />
          <div className="mapui:mt-3 mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newSource.id || !newSource.url}
              className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAddingNew(false)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-slate-700 hover:mapui:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remove Source"
        description="Are you sure you want to remove this source? Any layers using it will be affected."
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
