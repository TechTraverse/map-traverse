import { useState } from 'react';
import { LuX } from 'react-icons/lu';

export interface CollapsibleControlProps {
  /** Icon component to display when collapsed (e.g., LuLayers3 from react-icons/lu) */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Accessible label for the control (shown as tooltip/aria-label) */
  label: string;
  /** Initial collapsed state (uncontrolled mode) */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapsed state changes (controlled mode) */
  onToggle?: (collapsed: boolean) => void;
  /** Content to render when expanded */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * CollapsibleControl
 *
 * A wrapper component that collapses its children into a compact icon button.
 * Useful for map controls that should take minimal space when not in use.
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: Pass `defaultCollapsed` prop
 * - Controlled: Pass `collapsed` and `onToggle` props
 */
export function CollapsibleControl({
  icon: Icon,
  label,
  defaultCollapsed = true,
  collapsed: controlledCollapsed,
  onToggle,
  children,
  className = '',
}: CollapsibleControlProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    if (onToggle) {
      onToggle(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  // Always render in a fixed-size container to prevent layout shift
  return (
    <div className={`mapui:relative mapui:w-10 mapui:h-10 ${className}`}>
      {/* Collapsed button - always rendered to maintain layout space */}
      <button
        type="button"
        onClick={handleToggle}
        title={label}
        aria-label={label}
        className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md hover:mapui:bg-gray-50 mapui:transition-colors ${
          isCollapsed ? '' : 'mapui:bg-gray-100'
        }`}
      >
        <Icon size={20} className="mapui:text-gray-700" />
      </button>

      {/* Expanded panel - absolutely positioned to the left of the icon button */}
      {!isCollapsed && (
        <div className="mapui:absolute mapui:top-0 mapui:right-full mapui:mr-2 mapui:z-10 mapui:bg-white mapui:rounded-lg mapui:shadow-lg">
          {/* Header with icon and close button */}
          <div className="mapui:flex mapui:items-center mapui:justify-between mapui:p-2 mapui:border-b mapui:border-gray-200">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <Icon size={18} className="mapui:text-gray-700" />
              <span className="mapui:text-sm mapui:font-medium mapui:text-gray-700">
                {label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              title={`Collapse ${label}`}
              aria-label={`Collapse ${label}`}
              className="mapui:flex mapui:items-center mapui:justify-center mapui:w-6 mapui:h-6 mapui:rounded hover:mapui:bg-gray-100 mapui:transition-colors"
            >
              <LuX size={16} className="mapui:text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="mapui:p-2">{children}</div>
        </div>
      )}
    </div>
  );
}
