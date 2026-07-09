import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { ControlCorner } from '../../types';
import { computePopoverMaxHeight } from '../../utils/popoverMaxHeight';

// renderToStaticMarkup-based tests run without a DOM; plain useLayoutEffect
// would warn there.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const PANEL_POSITION_CLASSES: Record<ControlCorner, string> = {
  'top-right': 'mapui:top-0 mapui:right-full mapui:mr-2',
  'top-left': 'mapui:top-0 mapui:left-full mapui:ml-2',
  'bottom-right': 'mapui:bottom-0 mapui:right-full mapui:mr-2',
  'bottom-left': 'mapui:bottom-0 mapui:left-full mapui:ml-2',
};

export interface CollapsibleControlProps {
  /** Icon component to display when collapsed (e.g., LuLayers3 from react-icons/lu) */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Accessible label for the control (shown as tooltip/aria-label) */
  label: string;
  /** Which corner of the map this control sits in — determines expansion direction */
  corner?: ControlCorner;
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
  corner = 'top-right',
  defaultCollapsed = true,
  collapsed: controlledCollapsed,
  onToggle,
  children,
  className = '',
}: CollapsibleControlProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  // Cap the open panel to the space between its anchor (the button box) and
  // the viewport edge, so tall content scrolls instead of running off-screen.
  useIsomorphicLayoutEffect(() => {
    if (isCollapsed) return;
    const update = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMaxHeight(
        computePopoverMaxHeight(rect.top, rect.bottom, window.innerHeight, corner),
      );
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [isCollapsed, corner]);

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
    <div ref={containerRef} className={`mapui:relative mapui:w-10 mapui:h-10 ${className}`}>
      {/* Collapsed button - always rendered to maintain layout space */}
      <button
        type="button"
        onClick={handleToggle}
        title={label}
        aria-label={label}
        className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md hover:mapui:bg-slate-50 mapui:transition-colors ${
          isCollapsed ? '' : 'mapui:bg-slate-100'
        }`}
      >
        <Icon size={20} className="mapui:text-slate-700" />
      </button>

      {/* Expanded panel - positioned based on corner prop */}
      <div
        className={`mapui:absolute ${PANEL_POSITION_CLASSES[corner]} mapui:z-10 mapui:flex mapui:flex-col mapui:bg-white/90 mapui:backdrop-blur-sm mapui:rounded-lg mapui:shadow-lg mapui:transition-all mapui:duration-150 mapui:origin-top-right ${
          isCollapsed
            ? 'mapui:opacity-0 mapui:scale-95 mapui:pointer-events-none'
            : 'mapui:opacity-100 mapui:scale-100 mapui:pointer-events-auto'
        }`}
        style={!isCollapsed && maxHeight != null ? { maxHeight } : undefined}
      >
        {/* Header with icon and close button */}
        <div className="mapui:flex mapui:shrink-0 mapui:items-center mapui:justify-between mapui:p-2 mapui:border-b mapui:border-slate-200">
          <div className="mapui:flex mapui:items-center mapui:gap-2">
            <Icon size={18} className="mapui:text-slate-700" />
            <span className="mapui:text-sm mapui:font-medium mapui:text-slate-700">
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            title={`Collapse ${label}`}
            aria-label={`Collapse ${label}`}
            className="mapui:flex mapui:items-center mapui:justify-center mapui:min-w-[44px] mapui:min-h-[44px] mapui:w-8 mapui:h-8 mapui:rounded hover:mapui:bg-slate-100 mapui:transition-colors"
          >
            <LuX size={16} className="mapui:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="mapui:min-h-0 mapui:overflow-y-auto mapui:overscroll-contain mapui:p-2">{children}</div>
      </div>
    </div>
  );
}
