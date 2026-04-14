import { useEffect, useRef, useState } from 'react';
import { FaRegUserCircle } from 'react-icons/fa';
import { LuLogOut } from 'react-icons/lu';

export interface UserMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface UserMenuProps {
  username?: string;
  menuItems?: UserMenuItem[];
  onLogout: () => void;
}

export function UserMenu({ username, menuItems = [], onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const itemClass =
    'mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-slate-700 mapui:hover:bg-slate-100 mapui:w-full mapui:text-left';

  return (
    <div ref={menuRef} className="mapui:relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="mapui:text-current mapui:hover:opacity-80 mapui:cursor-pointer"
        aria-label="User menu"
        aria-expanded={open}
      >
        <FaRegUserCircle className="mapui:w-5 mapui:h-5" />
      </button>
      {open && (
        <div className="mapui:absolute mapui:right-0 mapui:z-20 mapui:mt-1 mapui:w-48 mapui:rounded-md mapui:bg-white mapui:shadow-lg mapui:ring-1 mapui:ring-black/5 mapui:py-1">
          {username && (
            <>
              <div className="mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-slate-900">
                {username}
              </div>
              <div className="mapui:border-t mapui:border-slate-100 mapui:my-1" />
            </>
          )}
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={
                  item.variant === 'danger'
                    ? 'mapui:flex mapui:items-center mapui:gap-2 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-red-600 mapui:hover:bg-red-50 mapui:w-full mapui:text-left'
                    : itemClass
                }
              >
                {Icon && <Icon className="mapui:w-4 mapui:h-4" />}
                {item.label}
              </button>
            );
          })}
          {menuItems.length > 0 && (
            <div className="mapui:border-t mapui:border-slate-100 mapui:my-1" />
          )}
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={itemClass}
          >
            <LuLogOut className="mapui:w-4 mapui:h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
