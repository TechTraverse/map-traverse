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
  // counter-clockwise to keep pointing at true north.
  const needleRotation = -bearing;

  return (
    <button
      type="button"
      title={ariaLabel}
      aria-label={ariaLabel}
      className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md mapui:cursor-pointer hover:mapui:bg-slate-50 mapui:transition-colors ${className}`.trim()}
      onClick={onReset}
    >
      <svg width={28} height={28} viewBox="0 0 40 40" data-testid="compass-needle" aria-hidden="true">
        {/* Static layer */}
        <circle cx="20" cy="20" r="18" fill="#f9fafb" stroke="#4b5563" strokeWidth="1.25" />
        <line x1="20" y1="2" x2="20" y2="6" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="34" x2="20" y2="38" stroke="#6b7280" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="2" y1="20" x2="6" y2="20" stroke="#6b7280" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="34" y1="20" x2="38" y2="20" stroke="#6b7280" strokeWidth="1.25" strokeLinecap="round" />

        {/* Rotating needle */}
        <g
          style={{
            transformOrigin: '20px 20px',
            transform: `rotate(${needleRotation}deg)`,
            transition: 'transform 200ms ease-out',
          }}
        >
          <polygon
            points="20,6 16.5,20 20,18 23.5,20"
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <polygon
            points="20,34 16.5,20 20,22 23.5,20"
            fill="#9ca3af"
            stroke="#374151"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <text
            x="20"
            y="13"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="700"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            N
          </text>
        </g>

        {/* Pivot — drawn last so it sits on top */}
        <circle cx="20" cy="20" r="1.75" fill="#1f2937" />
        <circle cx="20" cy="20" r="0.75" fill="#f9fafb" />
      </svg>
    </button>
  );
}
