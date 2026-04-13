import { useEffect, useState } from 'react';
import { LuMenu, LuX, LuChevronDown } from 'react-icons/lu';

export interface SideMenuPanelItem {
  /** Stable identifier used for keyed rendering and section expand state. */
  key: string;
  /** Visible label for the section header. */
  label: string;
  /** Icon component shown next to the label. */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Expanded content — any React node. */
  content: React.ReactNode;
}

export interface SideMenuPanelProps {
  /** Controls rendered as collapsible sections inside the panel. */
  controls: SideMenuPanelItem[];
  /** Whether the panel is currently open. */
  isOpen: boolean;
  /** Called when the user dismisses the panel (close button or Escape key). */
  onClose: () => void;
  /** Title rendered at the top of the panel. Defaults to "Menu". */
  title?: string;
  /** Key of the section to render expanded initially. Defaults to the first item. */
  defaultOpenKey?: string;
}

/**
 * SideMenuPanel
 *
 * A slide-in-from-right scrollable panel that presents map controls as
 * accordion sections. Intended for mobile screens and for admins who
 * prefer a single hamburger menu over a stack of individual control
 * buttons. The trigger button (hamburger) is exported separately as
 * `SideMenuToggle` so callers can place it wherever they need it.
 */
export function SideMenuPanel({
  controls,
  isOpen,
  onClose,
  title = 'Menu',
  defaultOpenKey,
}: SideMenuPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(() => {
    const initial = defaultOpenKey ?? controls[0]?.key;
    return initial ? [initial] : [];
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mapui:fixed mapui:top-0 mapui:right-0 mapui:z-50 mapui:h-full mapui:w-full mapui:max-w-xs mapui:pointer-events-auto mapui:flex mapui:flex-col mapui:bg-white mapui:shadow-2xl"
      role="dialog"
      aria-label={title}
    >
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:border-b mapui:border-gray-200 mapui:px-4 mapui:py-3">
        <h2 className="mapui:m-0 mapui:text-base mapui:font-semibold mapui:text-gray-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="mapui:flex mapui:h-8 mapui:w-8 mapui:cursor-pointer mapui:items-center mapui:justify-center mapui:rounded hover:mapui:bg-gray-100"
        >
          <LuX size={18} className="mapui:text-gray-700" />
        </button>
      </div>

      <div className="mapui:flex-1 mapui:overflow-y-auto">
        {controls.length === 0 ? (
          <p className="mapui:m-0 mapui:p-4 mapui:text-sm mapui:text-gray-500">
            No controls available.
          </p>
        ) : (
          <ul className="mapui:m-0 mapui:list-none mapui:p-0">
            {controls.map((item) => {
              const Icon = item.icon;
              const expanded = openSections.includes(item.key);
              return (
                <li key={item.key} className="mapui:border-b mapui:border-gray-100">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) =>
                        prev.includes(item.key)
                          ? prev.filter((k) => k !== item.key)
                          : [...prev, item.key],
                      )
                    }
                    aria-expanded={expanded}
                    className="mapui:flex mapui:w-full mapui:cursor-pointer mapui:items-center mapui:justify-between mapui:gap-3 mapui:bg-white mapui:px-4 mapui:py-3 mapui:text-left mapui:text-sm mapui:font-medium mapui:text-gray-800 hover:mapui:bg-gray-50"
                  >
                    <span className="mapui:flex mapui:items-center mapui:gap-3">
                      <Icon size={18} className="mapui:text-gray-600" />
                      {item.label}
                    </span>
                    <LuChevronDown
                      size={16}
                      className={`mapui:text-gray-500 mapui:transition-transform ${
                        expanded ? 'mapui:rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expanded && (
                    <div className="mapui:bg-gray-50 mapui:px-4 mapui:py-3">
                      {item.content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export interface SideMenuToggleProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Hamburger button that opens a SideMenuPanel. Styled to match
 * ExportButton / CollapsibleControl so it slots into the same top-right
 * stack.
 */
export function SideMenuToggle({
  onClick,
  label = 'Open menu',
  className = '',
}: SideMenuToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`mapui:flex mapui:h-10 mapui:w-10 mapui:cursor-pointer mapui:items-center mapui:justify-center mapui:rounded mapui:bg-white mapui:shadow-md mapui:transition-colors hover:mapui:bg-gray-50 ${className}`.trim()}
    >
      <LuMenu size={20} className="mapui:text-gray-700" />
    </button>
  );
}
