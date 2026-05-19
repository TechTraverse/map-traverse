import { LuCompass } from 'react-icons/lu';

export interface CompassControlProps {
  /** Current map bearing in degrees. Positive values rotate the map clockwise. */
  bearing: number;
  /** Called when the user clicks the compass to reset bearing to 0. */
  onReset: () => void;
  /** Accessible label / tooltip. */
  ariaLabel?: string;
  className?: string;
}

/**
 * A framework-agnostic compass control. Renders a circular button with a
 * compass needle that rotates as the map bearing changes. Clicking the
 * button fires `onReset` so the caller can animate the map back to north.
 *
 * The component is fully controlled — it has no internal state and no
 * dependency on MapLibre or any specific map library.
 */
export function CompassControl({
  bearing,
  onReset,
  ariaLabel = 'Reset map orientation to north',
  className = '',
}: CompassControlProps) {
  // Negate bearing: when the map rotates clockwise, the needle must rotate
  // counter-clockwise to keep pointing at true north. The -45° offset
  // compensates for LuCompass's needle, which is drawn pointing NE.
  const needleRotation = -bearing - 45;

  return (
    <button
      type="button"
      title={ariaLabel}
      aria-label={ariaLabel}
      className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md mapui:cursor-pointer hover:mapui:bg-slate-50 mapui:transition-colors ${className}`.trim()}
      onClick={onReset}
    >
      <span
        data-testid="compass-needle"
        aria-hidden="true"
        className="mapui:inline-flex mapui:text-slate-700"
        style={{
          transformOrigin: 'center',
          transform: `rotate(${needleRotation}deg)`,
          transition: 'transform 200ms ease-out',
        }}
      >
        <LuCompass size={20} />
      </span>
    </button>
  );
}
