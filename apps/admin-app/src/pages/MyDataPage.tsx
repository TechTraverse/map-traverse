import { useEffect, useState, useCallback } from 'react';
import { ConfirmDialog } from '@ogc-maps/storybook-components';
import { DataUploadField } from '../components/DataUploadField';
import { listDatasets, deleteDataset, type UploadedDataset } from '../utils/dataApi';

export function MyDataPage() {
  const [datasets, setDatasets] = useState<UploadedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UploadedDataset | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDatasets(await listDatasets());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (ds: UploadedDataset) => {
    setConfirmDelete(null);
    try {
      await deleteDataset(ds.id);
      setNotice(`Deleted "${ds.label || ds.table_name}".`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="mapui:mx-auto mapui:max-w-5xl mapui:p-6">
      <div className="mapui:mb-2 mapui:flex mapui:items-center mapui:justify-between">
        <h1 className="mapui:m-0 mapui:text-xl mapui:font-semibold mapui:text-slate-800">My Data</h1>
      </div>
      <p className="mapui:mt-0 mapui:mb-5 mapui:text-sm mapui:text-slate-500">
        Upload GIS files to publish them as map layers. Data is loaded into the local OGC API and
        becomes available under "My Data" when adding layers to a map.
      </p>

      <DataUploadField
        onUploaded={(r) => {
          setNotice(
            `Uploaded "${r.label || r.table_name}" (${r.feature_count} features).` +
              (r.crs_assumed ? ' Note: no CRS found — assumed EPSG:4326.' : '') +
              (r.tipgRefreshed ? '' : ' It may take a moment to appear.'),
          );
          void refresh();
        }}
      />

      {notice && (
        <p className="mapui:mt-4 mapui:rounded mapui:bg-green-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mapui:mt-4 mapui:rounded mapui:bg-red-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-red-700">
          {error}
        </p>
      )}

      <div className="mapui:mt-6 mapui:overflow-hidden mapui:rounded-lg mapui:border mapui:border-slate-200">
        <table className="mapui:w-full mapui:border-collapse mapui:text-sm">
          <thead className="mapui:bg-slate-50 mapui:text-left mapui:text-xs mapui:uppercase mapui:text-slate-500">
            <tr>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">Name</th>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">Collection</th>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">Geometry</th>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">Features</th>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">CRS</th>
              <th className="mapui:px-4 mapui:py-2 mapui:font-medium">Uploaded</th>
              <th className="mapui:px-4 mapui:py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="mapui:px-4 mapui:py-6 mapui:text-center mapui:text-slate-400">Loading…</td></tr>
            )}
            {!loading && datasets.length === 0 && (
              <tr><td colSpan={7} className="mapui:px-4 mapui:py-6 mapui:text-center mapui:text-slate-400">
                No datasets yet. Upload a file above to get started.
              </td></tr>
            )}
            {!loading && datasets.map((ds) => (
              <tr key={ds.id} className="mapui:border-t mapui:border-slate-100">
                <td className="mapui:px-4 mapui:py-2 mapui:font-medium mapui:text-slate-800">
                  {ds.label || ds.table_name}
                </td>
                <td className="mapui:px-4 mapui:py-2 mapui:font-mono mapui:text-xs mapui:text-slate-500">
                  uploads.{ds.table_name}
                </td>
                <td className="mapui:px-4 mapui:py-2 mapui:text-slate-600">{ds.geometry_type ?? '—'}</td>
                <td className="mapui:px-4 mapui:py-2 mapui:text-slate-600">{ds.feature_count ?? '—'}</td>
                <td className="mapui:px-4 mapui:py-2 mapui:text-slate-600">
                  EPSG:{ds.srid ?? 4326}
                  {ds.crs_assumed && (
                    <span className="mapui:ml-1 mapui:rounded mapui:bg-amber-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:text-amber-700">
                      assumed
                    </span>
                  )}
                </td>
                <td className="mapui:px-4 mapui:py-2 mapui:text-slate-500">
                  {new Date(ds.created_at).toLocaleDateString()}
                </td>
                <td className="mapui:px-4 mapui:py-2 mapui:text-right">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(ds)}
                    className="mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 mapui:hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete dataset"
        description={
          confirmDelete
            ? `Permanently delete "${confirmDelete.label || confirmDelete.table_name}"? This drops the table from the database. Any maps using this layer will lose it.`
            : ''
        }
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
