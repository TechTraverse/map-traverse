import { useState } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number | string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mapui:rounded mapui:border mapui:border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mapui:flex mapui:w-full mapui:cursor-pointer mapui:items-center mapui:justify-between mapui:rounded mapui:border-none mapui:bg-gray-50 mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-gray-700 hover:mapui:bg-gray-100"
      >
        <span className="mapui:flex mapui:items-center mapui:gap-2">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="mapui:rounded-full mapui:bg-blue-100 mapui:px-1.5 mapui:py-0.5 mapui:text-xs mapui:font-semibold mapui:text-blue-700">
              {badge}
            </span>
          )}
        </span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mapui:p-3">{children}</div>}
    </div>
  );
}
