import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ConfirmDialog,
  attributeInputKind,
  type AttributeColumn,
} from '@ogc-maps/storybook-components';
import {
  LuArrowLeft,
  LuPlus,
  LuSearch,
  LuChevronUp,
  LuChevronDown,
  LuChevronsUpDown,
  LuPencil,
  LuTrash2,
  LuDatabase,
  LuMapPin,
  LuSpline,
  LuHexagon,
  LuShapes,
  LuKey,
  LuGlobe,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { FeatureEditorDrawer } from '../components/FeatureEditorDrawer';
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

// ── small presentational helpers ──────────────────────────────────────────────

/** Map a (possibly Multi*) geometry type to an icon. */
function geometryIcon(type?: string): IconType {
  const t = (type ?? '').toUpperCase();
  if (t.includes('POINT')) return LuMapPin;
  if (t.includes('LINE')) return LuSpline;
  if (t.includes('POLYGON')) return LuHexagon;
  return LuShapes;
}

function GeometryBadge({ type }: { type?: string | null }) {
  if (!type) return <span className="mapui:text-slate-300">—</span>;
  const Icon = geometryIcon(type);
  return (
    <span className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-slate-600">
      <Icon className="mapui:h-3.5 mapui:w-3.5 mapui:text-slate-400" aria-hidden />
      {type}
    </span>
  );
}

function StatChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-md mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2.5 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-slate-600">
      <span className="mapui:text-slate-400">{icon}</span>
      {children}
    </span>
  );
}

type CellKind = ReturnType<typeof attributeInputKind>;

/** Render an attribute value with type-aware styling. */
function Cell({ value, kind }: { value: unknown; kind: CellKind }) {
  if (value === null || value === undefined || value === '') {
    return <span className="mapui:text-slate-300">—</span>;
  }
  if (kind === 'boolean') {
    const on = value === true || value === 'true';
    return (
      <span
        className={`mapui:inline-block mapui:rounded-full mapui:px-2 mapui:py-0.5 mapui:text-[11px] mapui:font-medium ${
          on ? 'mapui:bg-green-50 mapui:text-green-700' : 'mapui:bg-slate-100 mapui:text-slate-500'
        }`}
      >
        {String(on)}
      </span>
    );
  }
  if (kind === 'number') {
    return <span className="mapui:font-mono mapui:text-[13px] mapui:text-slate-700">{String(value)}</span>;
  }
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <span className="mapui:block mapui:max-w-[22ch] mapui:truncate mapui:text-slate-700" title={text}>
      {text}
    </span>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

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
  const [filterInput, setFilterInput] = useState<string>('');
  const [filter, setFilter] = useState<string>(''); // debounced applied value

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeatureRow | null>(null);

  // Debounce the filter input → applied filter (avoids a fetch per keystroke).
  useEffect(() => {
    const t = setTimeout(() => {
      setFilter(filterInput);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [filterInput]);

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

  const columnKinds = useMemo(() => {
    const m = new Map<string, CellKind>();
    for (const c of attributeColumns) m.set(c.name, attributeInputKind(c));
    return m;
  }, [attributeColumns]);

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
    setEditor({ mode: 'edit', rowId: row.id, values: { ...row.properties }, geometry: row.geometry });
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
  const colCount = attributeColumns.length + 3; // pk + attrs + geometry + actions
  const GeoStatIcon = schema?.geometry ? geometryIcon(schema.geometry.type) : null;

  const SortHeader = ({ column, label, align }: { column: string; label: string; align?: 'right' }) => {
    const active = sort === column;
    const Icon = !active ? LuChevronsUpDown : order === 'asc' ? LuChevronUp : LuChevronDown;
    return (
      <th className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:font-medium">
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={`mapui:inline-flex mapui:items-center mapui:gap-1 mapui:transition-colors mapui:hover:text-slate-900 ${
            align === 'right' ? 'mapui:flex-row-reverse' : ''
          } ${active ? 'mapui:text-slate-900' : 'mapui:text-slate-500'}`}
        >
          {label}
          <Icon className={`mapui:h-3.5 mapui:w-3.5 ${active ? 'mapui:text-blue-500' : 'mapui:text-slate-300'}`} />
        </button>
      </th>
    );
  };

  return (
    <div className="mapui:mx-auto mapui:max-w-6xl mapui:px-6 mapui:py-8">
      {/* breadcrumb */}
      <Link
        to="/my-data"
        className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:text-sm mapui:font-medium mapui:text-slate-500 mapui:transition-colors mapui:hover:text-blue-600"
      >
        <LuArrowLeft className="mapui:h-4 mapui:w-4" /> My Data
      </Link>

      {/* identity header */}
      <div className="mapui:mt-3 mapui:flex mapui:flex-wrap mapui:items-start mapui:justify-between mapui:gap-4">
        <div>
          <h1 className="mapui:m-0 mapui:font-mono mapui:text-2xl mapui:font-bold mapui:tracking-tight mapui:text-slate-900">
            {schema?.table ?? 'Collection'}
          </h1>
          <div className="mapui:mt-2.5 mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-1.5">
            <StatChip icon={<LuDatabase className="mapui:h-3.5 mapui:w-3.5" />}>
              {total.toLocaleString()} {total === 1 ? 'feature' : 'features'}
            </StatChip>
            {schema?.geometry && GeoStatIcon && (
              <StatChip icon={<GeoStatIcon className="mapui:h-3.5 mapui:w-3.5" />}>
                {schema.geometry.type}
              </StatChip>
            )}
            {schema?.geometry && (
              <StatChip icon={<LuGlobe className="mapui:h-3.5 mapui:w-3.5" />}>
                EPSG:{schema.geometry.srid}
              </StatChip>
            )}
            <StatChip icon={<LuKey className="mapui:h-3.5 mapui:w-3.5" />}>
              <span className="mapui:font-mono">{pkName}</span>
            </StatChip>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!schema}
          className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-lg mapui:bg-blue-600 mapui:px-3.5 mapui:py-2 mapui:text-sm mapui:font-semibold mapui:text-white mapui:shadow-sm mapui:transition-colors mapui:hover:bg-blue-700 mapui:disabled:opacity-50"
        >
          <LuPlus className="mapui:h-4 mapui:w-4" /> Add feature
        </button>
      </div>

      {/* toolbar */}
      <div className="mapui:mt-6 mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2">
        <div className="mapui:relative mapui:min-w-[220px] mapui:flex-1">
          <LuSearch className="mapui:pointer-events-none mapui:absolute mapui:left-3 mapui:top-1/2 mapui:h-4 mapui:w-4 mapui:-translate-y-1/2 mapui:text-slate-400" />
          <input
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder={filterColumn ? `Filter ${filterColumn}…` : 'Filter features…'}
            className="mapui:w-full mapui:rounded-lg mapui:border mapui:border-slate-300 mapui:bg-white mapui:py-2 mapui:pl-9 mapui:pr-3 mapui:text-sm mapui:text-slate-800 mapui:outline-none mapui:transition-colors mapui:focus:border-blue-500 mapui:focus:ring-2 mapui:focus:ring-blue-100"
          />
        </div>
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
          className="mapui:rounded-lg mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-slate-700 mapui:outline-none mapui:transition-colors mapui:focus:border-blue-500 mapui:focus:ring-2 mapui:focus:ring-blue-100"
        >
          <option value="">All columns</option>
          {attributeColumns.map((c) => (
            <option key={c.name} value={c.name}>
              in: {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* notices */}
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

      {/* table card */}
      <div className="mapui:mt-4 mapui:overflow-hidden mapui:rounded-xl mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-sm">
        <div className="mapui:max-h-[calc(100vh-360px)] mapui:overflow-auto">
          <table className="mapui:w-full mapui:border-collapse mapui:text-sm">
            <thead className="mapui:sticky mapui:top-0 mapui:z-10 mapui:bg-slate-50/95 mapui:text-left mapui:text-xs mapui:uppercase mapui:tracking-wide mapui:text-slate-500 mapui:backdrop-blur">
              <tr className="mapui:border-b mapui:border-slate-200">
                <SortHeader column={pkName} label={pkName} />
                {attributeColumns.map((c) => (
                  <SortHeader
                    key={c.name}
                    column={c.name}
                    label={c.name}
                    align={columnKinds.get(c.name) === 'number' ? 'right' : undefined}
                  />
                ))}
                <th className="mapui:px-4 mapui:py-2.5 mapui:font-medium">Geometry</th>
                <th className="mapui:w-0 mapui:px-4 mapui:py-2.5" />
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-slate-100">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: colCount }).map((__, j) => (
                      <td key={j} className="mapui:px-4 mapui:py-3">
                        <div className="mapui:h-3.5 mapui:animate-pulse mapui:rounded mapui:bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="mapui:px-4 mapui:py-16">
                    <div className="mapui:flex mapui:flex-col mapui:items-center mapui:gap-3 mapui:text-center">
                      <div className="mapui:flex mapui:h-12 mapui:w-12 mapui:items-center mapui:justify-center mapui:rounded-full mapui:bg-slate-100 mapui:text-slate-400">
                        <LuDatabase className="mapui:h-6 mapui:w-6" />
                      </div>
                      <div>
                        <p className="mapui:m-0 mapui:text-sm mapui:font-medium mapui:text-slate-700">
                          {filter ? 'No matching features' : 'No features yet'}
                        </p>
                        <p className="mapui:m-0 mapui:mt-0.5 mapui:text-sm mapui:text-slate-400">
                          {filter ? 'Try a different filter.' : 'Add your first feature to this collection.'}
                        </p>
                      </div>
                      {!filter && (
                        <button
                          type="button"
                          onClick={openCreate}
                          className="mapui:mt-1 mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-lg mapui:bg-blue-600 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-semibold mapui:text-white mapui:transition-colors mapui:hover:bg-blue-700"
                        >
                          <LuPlus className="mapui:h-4 mapui:w-4" /> Add feature
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => (
                  <tr key={String(row.id)} className="mapui:group mapui:transition-colors mapui:hover:bg-blue-50/50">
                    <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:font-mono mapui:text-xs mapui:text-slate-400">
                      {String(row.id)}
                    </td>
                    {attributeColumns.map((c) => (
                      <td
                        key={c.name}
                        className={`mapui:px-4 mapui:py-2.5 ${columnKinds.get(c.name) === 'number' ? 'mapui:text-right' : ''}`}
                      >
                        <Cell value={row.properties[c.name]} kind={columnKinds.get(c.name) ?? 'text'} />
                      </td>
                    ))}
                    <td className="mapui:px-4 mapui:py-2.5">
                      <GeometryBadge type={row.geometry?.type} />
                    </td>
                    <td className="mapui:px-4 mapui:py-2.5 mapui:text-right">
                      <div className="mapui:flex mapui:items-center mapui:justify-end mapui:gap-1 mapui:opacity-0 mapui:transition-opacity mapui:group-hover:opacity-100 mapui:focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          aria-label="Edit feature"
                          title="Edit"
                          className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-500 mapui:transition-colors mapui:hover:bg-white mapui:hover:text-blue-600"
                        >
                          <LuPencil className="mapui:h-4 mapui:w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(row)}
                          aria-label="Delete feature"
                          title="Delete"
                          className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-500 mapui:transition-colors mapui:hover:bg-white mapui:hover:text-red-600"
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

        {/* pager */}
        <div className="mapui:flex mapui:items-center mapui:justify-between mapui:border-t mapui:border-slate-200 mapui:bg-slate-50/60 mapui:px-4 mapui:py-2.5">
          <p className="mapui:m-0 mapui:text-xs mapui:text-slate-500">
            {total === 0 ? (
              'No features'
            ) : (
              <>
                Showing{' '}
                <span className="mapui:font-medium mapui:text-slate-700">
                  {pageStart}–{pageEnd}
                </span>{' '}
                of <span className="mapui:font-medium mapui:text-slate-700">{total.toLocaleString()}</span>
              </>
            )}
          </p>
          <div className="mapui:flex mapui:items-center mapui:gap-1.5">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2.5 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-slate-600 mapui:transition-colors mapui:hover:bg-slate-50 mapui:disabled:opacity-40 mapui:disabled:hover:bg-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2.5 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-slate-600 mapui:transition-colors mapui:hover:bg-slate-50 mapui:disabled:opacity-40 mapui:disabled:hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <FeatureEditorDrawer
        open={editor !== null}
        mode={editor?.mode ?? 'create'}
        rowId={editor?.rowId ?? null}
        columns={attributeColumns}
        values={editor?.values ?? {}}
        geometry={editor?.geometry ?? null}
        geometryType={schema?.geometry?.type}
        saving={saving}
        error={formError}
        onValueChange={(name, value) =>
          setEditor((e) => (e ? { ...e, values: { ...e.values, [name]: value } } : e))
        }
        onGeometryChange={(geometry) => setEditor((e) => (e ? { ...e, geometry } : e))}
        onSave={() => void save()}
        onClose={() => setEditor(null)}
      />

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
