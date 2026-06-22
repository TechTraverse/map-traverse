/**
 * Right-side slide-over for creating / editing a single feature row. Pure
 * presentation: it receives the in-flight attribute values + geometry and emits
 * changes; DataEditorPage owns the state and persistence. Composes the lib's
 * controlled AttributeForm + GeometryEditor, injecting the app's terra-draw
 * GeometryDrawMap into the editor's mapSlot.
 */
import { useEffect, useRef, useState } from 'react';
import { LuX, LuLayoutList, LuShapes } from 'react-icons/lu';
import {
  AttributeForm,
  GeometryEditor,
  type AttributeColumn,
} from '@techtraverse/map-ui-lib';
import { GeometryDrawMap } from './GeometryDrawMap';

export interface FeatureEditorDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  rowId: string | number | null;
  columns: AttributeColumn[];
  values: Record<string, unknown>;
  geometry: GeoJSON.Geometry | null;
  geometryType?: string;
  saving: boolean;
  error: string | null;
  onValueChange: (name: string, value: unknown) => void;
  onGeometryChange: (geometry: GeoJSON.Geometry | null) => void;
  onSave: () => void;
  onClose: () => void;
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mapui:mb-3 mapui:flex mapui:items-center mapui:gap-2 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
      <span className="mapui:text-slate-400">{icon}</span>
      {children}
    </div>
  );
}

export function FeatureEditorDrawer({
  open,
  mode,
  rowId,
  columns,
  values,
  geometry,
  geometryType,
  saving,
  error,
  onValueChange,
  onGeometryChange,
  onSave,
  onClose,
}: FeatureEditorDrawerProps) {
  // Drive the enter transition: mount at translate-x-full, flip to 0 next frame.
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  // Focus the first field when the drawer opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="mapui:fixed mapui:inset-0 mapui:z-50">
      {/* backdrop */}
      <div
        onClick={() => !saving && onClose()}
        className={`mapui:absolute mapui:inset-0 mapui:bg-slate-900/40 mapui:transition-opacity mapui:duration-300 ${
          shown ? 'mapui:opacity-100' : 'mapui:opacity-0'
        }`}
      />
      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Add feature' : `Edit feature ${rowId}`}
        className={`mapui:absolute mapui:right-0 mapui:top-0 mapui:flex mapui:h-full mapui:w-[min(560px,100%)] mapui:flex-col mapui:bg-white mapui:shadow-2xl mapui:transition-transform mapui:duration-300 mapui:ease-out ${
          shown ? 'mapui:translate-x-0' : 'mapui:translate-x-full'
        }`}
      >
        {/* header */}
        <div className="mapui:flex mapui:shrink-0 mapui:items-center mapui:justify-between mapui:border-b mapui:border-slate-200 mapui:px-5 mapui:py-4">
          <div>
            <p className="mapui:m-0 mapui:text-[11px] mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-blue-600">
              {mode === 'create' ? 'New feature' : 'Editing'}
            </p>
            <h2 className="mapui:m-0 mapui:mt-0.5 mapui:text-base mapui:font-semibold mapui:text-slate-900">
              {mode === 'create' ? 'Add feature' : (
                <>
                  Feature <span className="mapui:font-mono mapui:text-slate-500">#{String(rowId)}</span>
                </>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Close"
            className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-400 mapui:transition-colors mapui:hover:bg-slate-100 mapui:hover:text-slate-700"
          >
            <LuX className="mapui:h-5 mapui:w-5" />
          </button>
        </div>

        {/* body */}
        <div className="mapui:flex-1 mapui:overflow-y-auto mapui:px-5 mapui:py-5">
          <section className="mapui:mb-7">
            <SectionHeading icon={<LuLayoutList className="mapui:h-4 mapui:w-4" />}>
              Attributes
            </SectionHeading>
            {columns.length === 0 ? (
              <p className="mapui:m-0 mapui:rounded-md mapui:bg-slate-50 mapui:px-3 mapui:py-2.5 mapui:text-sm mapui:text-slate-500">
                This collection has no editable attribute columns.
              </p>
            ) : (
              <AttributeForm columns={columns} values={values} onChange={onValueChange} />
            )}
          </section>

          <section>
            <SectionHeading icon={<LuShapes className="mapui:h-4 mapui:w-4" />}>
              Geometry
              {geometryType && (
                <span className="mapui:ml-1 mapui:rounded mapui:bg-slate-100 mapui:px-1.5 mapui:py-0.5 mapui:font-mono mapui:text-[10px] mapui:font-medium mapui:normal-case mapui:tracking-normal mapui:text-slate-500">
                  {geometryType}
                </span>
              )}
            </SectionHeading>
            <GeometryEditor
              geometry={geometry}
              onChange={onGeometryChange}
              geometryType={geometryType}
              mapSlot={
                <GeometryDrawMap
                  geometry={geometry}
                  onChange={onGeometryChange}
                  geometryType={geometryType}
                  height={360}
                />
              }
            />
          </section>

          {error && (
            <p className="mapui:mt-5 mapui:rounded-md mapui:border mapui:border-red-200 mapui:bg-red-50 mapui:px-3 mapui:py-2.5 mapui:text-sm mapui:text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="mapui:flex mapui:shrink-0 mapui:items-center mapui:justify-end mapui:gap-2 mapui:border-t mapui:border-slate-200 mapui:bg-slate-50 mapui:px-5 mapui:py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3.5 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-slate-700 mapui:transition-colors mapui:hover:bg-slate-50 mapui:disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="mapui:inline-flex mapui:items-center mapui:gap-2 mapui:rounded-md mapui:bg-blue-600 mapui:px-4 mapui:py-2 mapui:text-sm mapui:font-semibold mapui:text-white mapui:shadow-sm mapui:transition-colors mapui:hover:bg-blue-700 mapui:disabled:opacity-50"
          >
            {saving && (
              <span className="mapui:h-3.5 mapui:w-3.5 mapui:animate-spin mapui:rounded-full mapui:border-2 mapui:border-white/40 mapui:border-t-white" />
            )}
            {saving ? 'Saving…' : mode === 'create' ? 'Create feature' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
