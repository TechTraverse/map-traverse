import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@ogc-maps/storybook-components';
import { LuPencil, LuTrash2, LuDatabase } from 'react-icons/lu';
import { DataUploadField } from '../components/DataUploadField';
import { GeometryBadge } from '../components/GeometryBadge';
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

  const th = 'mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:font-medium';

  return (
    <div className="mapui:mx-auto mapui:max-w-6xl mapui:px-6 mapui:py-8">
      <div className="mapui:flex mapui:items-center mapui:gap-2.5">
        <h1 className="mapui:m-0 mapui:text-2xl mapui:font-bold mapui:tracking-tight mapui:text-slate-900">
          My Data
        </h1>
        {!loading && datasets.length > 0 && (
          <span className="mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-slate-500">
            {datasets.length}
          </span>
        )}
      </div>
      <p className="mapui:mt-1.5 mapui:mb-5 mapui:max-w-2xl mapui:text-sm mapui:text-slate-500">
        Upload GIS files to publish them as map layers. Data is loaded into the local OGC API and
        becomes available under “My Data” when adding layers to a map.
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
        <div className="mapui:mt-4 mapui:rounded-lg mapui:border mapui:border-green-200 mapui:bg-green-50 mapui:px-3.5 mapui:py-2.5 mapui:text-sm mapui:text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mapui:mt-4 mapui:rounded-lg mapui:border mapui:border-red-200 mapui:bg-red-50 mapui:px-3.5 mapui:py-2.5 mapui:text-sm mapui:text-red-700">
          {error}
        </div>
      )}

      <div className="mapui:mt-6 mapui:overflow-hidden mapui:rounded-xl mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-sm">
        <div className="mapui:overflow-x-auto">
          <table className="mapui:w-full mapui:border-collapse mapui:text-sm">
            <thead className="mapui:bg-slate-50 mapui:text-left mapui:text-xs mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
              <tr className="mapui:border-b mapui:border-slate-200">
                <th className={th}>Name</th>
                <th className={th}>Collection</th>
                <th className={th}>Geometry</th>
                <th className={`${th} mapui:text-right`}>Features</th>
                <th className={th}>CRS</th>
                <th className={th}>Uploaded</th>
                <th className="mapui:w-0 mapui:px-4 mapui:py-2.5" />
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="mapui:px-4 mapui:py-10 mapui:text-center mapui:text-sm mapui:text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && datasets.length === 0 && (
                <tr>
                  <td colSpan={7} className="mapui:px-4 mapui:py-16">
                    <div className="mapui:flex mapui:flex-col mapui:items-center mapui:gap-3 mapui:text-center">
                      <div className="mapui:flex mapui:h-12 mapui:w-12 mapui:items-center mapui:justify-center mapui:rounded-full mapui:bg-slate-100 mapui:text-slate-400">
                        <LuDatabase className="mapui:h-6 mapui:w-6" />
                      </div>
                      <div>
                        <p className="mapui:m-0 mapui:text-sm mapui:font-medium mapui:text-slate-700">No datasets yet</p>
                        <p className="mapui:m-0 mapui:mt-0.5 mapui:text-sm mapui:text-slate-400">
                          Upload a GIS file above to get started.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                datasets.map((ds) => (
                  <tr key={ds.id} className="mapui:group mapui:transition-colors mapui:hover:bg-blue-50/50">
                    <td className="mapui:px-4 mapui:py-2.5">
                      <Link
                        to={`/my-data/${ds.id}`}
                        className="mapui:font-medium mapui:text-slate-800 mapui:transition-colors mapui:hover:text-blue-600"
                      >
                        {ds.label || ds.table_name}
                      </Link>
                      {ds.original_filename && (
                        <div className="mapui:mt-0.5 mapui:text-xs mapui:text-slate-400">{ds.original_filename}</div>
                      )}
                    </td>
                    <td className="mapui:px-4 mapui:py-2.5">
                      <span
                        className="mapui:block mapui:max-w-[26ch] mapui:truncate mapui:font-mono mapui:text-xs mapui:text-slate-500"
                        title={`uploads.${ds.table_name}`}
                      >
                        uploads.{ds.table_name}
                      </span>
                    </td>
                    <td className="mapui:px-4 mapui:py-2.5">
                      <GeometryBadge type={ds.geometry_type} />
                    </td>
                    <td className="mapui:px-4 mapui:py-2.5 mapui:text-right mapui:font-mono mapui:text-[13px] mapui:text-slate-700">
                      {ds.feature_count?.toLocaleString() ?? '—'}
                    </td>
                    <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:text-slate-600">
                      EPSG:{ds.srid ?? 4326}
                      {ds.crs_assumed && (
                        <span
                          className="mapui:ml-1.5 mapui:rounded mapui:bg-amber-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-amber-700"
                          title="No CRS found in the source — assumed EPSG:4326"
                        >
                          assumed
                        </span>
                      )}
                    </td>
                    <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:text-slate-500">
                      {new Date(ds.created_at).toLocaleDateString()}
                    </td>
                    <td className="mapui:px-4 mapui:py-2.5">
                      <div className="mapui:flex mapui:items-center mapui:justify-end mapui:gap-1 mapui:whitespace-nowrap">
                        <Link
                          to={`/my-data/${ds.id}`}
                          className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:whitespace-nowrap mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2.5 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-slate-700 mapui:transition-colors mapui:hover:bg-slate-50 mapui:hover:text-slate-900"
                        >
                          <LuPencil className="mapui:h-3.5 mapui:w-3.5" /> Edit rows
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(ds)}
                          aria-label={`Delete ${ds.label || ds.table_name}`}
                          title="Delete dataset"
                          className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-400 mapui:transition-colors mapui:hover:bg-red-50 mapui:hover:text-red-600"
                        >
                          <LuTrash2 className="mapui:h-4 mapui:w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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
