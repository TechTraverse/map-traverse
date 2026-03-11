import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuEllipsisVertical, LuPencil, LuEye, LuHistory, LuTrash2 } from 'react-icons/lu';

interface ActionMenuProps {
  configId: string;
  onDelete: () => void;
}

export function ActionMenu({ configId, onDelete }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const linkClass =
    'mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-gray-700 mapui:hover:bg-gray-100 mapui:w-full mapui:text-left';

  return (
    <div ref={menuRef} className="mapui:relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="mapui:p-1 mapui:rounded mapui:hover:bg-gray-200 mapui:text-gray-500"
        aria-label="Actions"
      >
        <LuEllipsisVertical className="mapui:w-5 mapui:h-5" />
      </button>
      {open && (
        <div className="mapui:absolute mapui:right-0 mapui:z-20 mapui:mt-1 mapui:w-40 mapui:rounded-md mapui:bg-white mapui:shadow-lg mapui:ring-1 mapui:ring-black/5 mapui:py-1">
          <Link
            to={`/configs/${configId}/edit`}
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            <LuPencil className="mapui:w-4 mapui:h-4" /> Edit
          </Link>
          <Link
            to={`/configs/${configId}/preview`}
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            <LuEye className="mapui:w-4 mapui:h-4" /> Preview
          </Link>
          <Link
            to={`/configs/${configId}/versions`}
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            <LuHistory className="mapui:w-4 mapui:h-4" /> History
          </Link>
          <div className="mapui:border-t mapui:border-gray-100 mapui:my-1" />
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-red-600 mapui:hover:bg-red-50 mapui:w-full mapui:text-left"
          >
            <LuTrash2 className="mapui:w-4 mapui:h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
