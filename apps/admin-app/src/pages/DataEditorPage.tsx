import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AttributeForm,
  GeometryEditor,
  type AttributeColumn,
} from '@ogc-maps/storybook-components';
import { ConfirmDialog } from '@ogc-maps/storybook-components';
import { GeometryDrawMap } from '../components/GeometryDrawMap';
import {
  getCollectionSchema,
  listRows,
  createRow,
  updateRow,
  deleteRow,
  DataApiError,
  type CollectionSchema,
  type FeatureRow,
} from '../utils/dataApi';

const PAGE_SIZE = 50;

interface EditorState {
  mode: 'create' | 'edit';
  rowId: string | number | null;
  values: Record<string, unknown>;
  geometry: GeoJSON.Geometry | null;
}

export function DataEditorPage() {
  const { id = '' } = useParams<{ id: string }>();

  const [schema, setSchema] = useState<CollectionSchema | null>(null);
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // paging / sort / filter (server-side)
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filter, setFilter] = useState<string>('');

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeatureRow | null>(null);

  const attributeColumns: AttributeColumn[] = useMemo(
    () =>
      (schema?.columns ?? [])
        .filter((c) => !c.isPrimaryKey && !c.isGeometry)
        .map((c) => ({
          name: c.name,
          dataType: c.dataType,
          udtName: c.udtName,
          nullable: c.nullable,
        })),
    [schema],
  );

  const loadSchema = useCallback(async () => {
    try {
      setSchema(await getCollectionSchema(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection schema');
    }
  }, [id]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRows(id, {
        limit: PAGE_SIZE,
        offset,
        sort,
        order,
        filterColumn: filter ? filterColumn || undefined : undefined,
        filter: filter || undefined,
      });
      setRows(res.rows);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rows');
    } finally {
      setLoading(false);
    }
  }, [id, offset, sort, order, filterColumn, filter]);

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);
  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const toggleSort = (column: string) => {
    if (sort === column) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('asc');
    }
    setOffset(0);
  };

  const openCreate = () => {
    setFormError(null);
    setEditor({ mode: 'create', rowId: null, values: {}, geometry: null });
  };

  const openEdit = (row: FeatureRow) => {
    setFormError(null);
    setEditor({
      mode: 'edit',
      rowId: row.id,
      values: { ...row.properties },
      geometry: row.geometry,
    });
  };

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = { properties: editor.values, geometry: editor.geometry };
      if (editor.mode === 'create') {
        await createRow(id, body);
        setNotice('Feature created.');
      } else if (editor.rowId != null) {
        await updateRow(id, editor.rowId, body);
        setNotice('Feature updated.');
      }
      setEditor(null);
      await loadRows();
    } catch (err) {
      const msg =
        err instanceof DataApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Save failed';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (row: FeatureRow) => {
    setConfirmDelete(null);
    try {
      await deleteRow(id, row.id);
      setNotice('Feature deleted.');
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const pkName = schema?.primaryKey ?? 'id';
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/my-data" className="text-sm text-blue-600 hover:underline">
            ← My Data
          </Link>
          <h1 className="m-0 mt-1 text-xl font-semibold text-slate-800">
            {schema?.table ?? 'Collection'}
          </h1>
          {schema?.geometry && (
            <p className="m-0 mt-1 text-xs text-slate-500">
              Geometry: {schema.geometry.type} · EPSG:{schema.geometry.srid} · PK: {pkName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!schema}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + Add feature
        </button>
      </div>

      {/* filter */}
      <div className="mb-3 flex items-center gap-2">
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">Any column…</option>
          {attributeColumns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setOffset(0);
              void loadRows();
            }
          }}
          placeholder="Filter value…"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="ml-auto text-xs text-slate-500">
          {pageStart}–{pageEnd} of {total}
        </span>
      </div>

      {notice && (
        <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>
      )}
      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort(pkName)} className="hover:underline">
                  {pkName} {sort === pkName ? (order === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              {attributeColumns.map((c) => (
                <th key={c.name} className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort(c.name)} className="hover:underline">
                    {c.name} {sort === c.name ? (order === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">geometry</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={attributeColumns.length + 3} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={attributeColumns.length + 3} className="px-3 py-6 text-center text-slate-400">
                  No features. Use “Add feature” to create one.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={String(row.id)} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{String(row.id)}</td>
                  {attributeColumns.map((c) => (
                    <td key={c.name} className="px-3 py-2 text-slate-700">
                      {formatCell(row.properties[c.name])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-slate-500">{row.geometry?.type ?? '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="mr-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(row)}
                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* pager */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {/* create/edit modal */}
      {editor && schema && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6">
          <div className="my-4 w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="m-0 mb-4 text-base font-semibold text-slate-900">
              {editor.mode === 'create' ? 'Add feature' : `Edit feature ${editor.rowId}`}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Attributes</h3>
                <AttributeForm
                  columns={attributeColumns}
                  values={editor.values}
                  onChange={(name, value) =>
                    setEditor((e) => (e ? { ...e, values: { ...e.values, [name]: value } } : e))
                  }
                />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Geometry</h3>
                <GeometryEditor
                  geometry={editor.geometry}
                  onChange={(geometry) => setEditor((e) => (e ? { ...e, geometry } : e))}
                  geometryType={schema.geometry?.type}
                  mapSlot={
                    <GeometryDrawMap
                      geometry={editor.geometry}
                      onChange={(geometry) => setEditor((e) => (e ? { ...e, geometry } : e))}
                      geometryType={schema.geometry?.type}
                    />
                  }
                />
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                disabled={saving}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete feature"
        description={
          confirmDelete ? `Permanently delete feature ${confirmDelete.id}? This cannot be undone.` : ''
        }
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
