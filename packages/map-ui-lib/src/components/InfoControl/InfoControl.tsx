import { LuInfo } from 'react-icons/lu';

export interface InfoControlProps {
  /** Called when the user clicks the info button. */
  onClick: () => void;
  /** Accessible label for the button. */
  ariaLabel?: string;
  /** Tooltip shown on hover. */
  title?: string;
  className?: string;
}

/** 40×40 white info button. Fires `onClick` so the caller can open a modal. */
export function InfoControl({
  onClick,
  ariaLabel = 'Map information',
  title = 'About this map',
  className = '',
}: InfoControlProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md mapui:cursor-pointer hover:mapui:bg-gray-50 mapui:transition-colors ${className}`.trim()}
    >
      <LuInfo size={20} aria-hidden="true" className="mapui:text-gray-700" />
    </button>
  );
}
