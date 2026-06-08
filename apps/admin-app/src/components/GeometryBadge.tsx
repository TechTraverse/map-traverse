/** Shared geometry-type iconography for the My Data list + collection editor. */
import type { IconType } from 'react-icons';
import { LuMapPin, LuSpline, LuHexagon, LuShapes } from 'react-icons/lu';

/** Map a (possibly Multi*) geometry type to a representative icon. */
export function geometryIcon(type?: string | null): IconType {
  const t = (type ?? '').toUpperCase();
  if (t.includes('POINT')) return LuMapPin;
  if (t.includes('LINE')) return LuSpline;
  if (t.includes('POLYGON')) return LuHexagon;
  return LuShapes;
}

export function GeometryBadge({ type }: { type?: string | null }) {
  if (!type) return <span className="mapui:text-slate-300">—</span>;
  const Icon = geometryIcon(type);
  return (
    <span className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-slate-600">
      <Icon className="mapui:h-3.5 mapui:w-3.5 mapui:text-slate-400" aria-hidden />
      {type}
    </span>
  );
}
