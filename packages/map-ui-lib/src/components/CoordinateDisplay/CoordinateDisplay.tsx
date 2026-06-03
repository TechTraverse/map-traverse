import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LuMapPin, LuX } from 'react-icons/lu';

export interface CoordinateFormatOption {
  id: string;
  label: string;
  format: (lat: number, lng: number) => string;
}

export interface CoordinateDisplayProps {
  latitude: number | null;
  longitude: number | null;
  activeFormat: string;
  formats: CoordinateFormatOption[];
  onFormatChange: (formatId: string) => void;
  className?: string;
  /**
   * When provided, the coordinate readout becomes a button that expands into
   * a "go to lat/lng" input form. Wire this to `map.flyTo` in the consumer.
   */
  onNavigate?: (lat: number, lng: number) => void;
  /** Controlled expand/collapse state for the navigate form. */
  isExpanded?: boolean;
  /** Called when the user clicks the expand toggle. */
  onToggleExpand?: (next: boolean) => void;
  /**
   * When provided, renders a pin button inside the navigate form as an
   * alternative to typing coordinates. The consumer is expected to put the
   * map into a one-shot "next click drops a pin" mode in response.
   */
  onPinDropRequest?: () => void;
  /** Whether pin-drop mode is currently active — drives the button's pressed style. */
  pinDropActive?: boolean;
}

/**
 * Format coordinates as decimal degrees.
 */
export function formatDecimal(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Format coordinates as degrees, minutes, seconds (DMS).
 */
export function formatDMS(lat: number, lng: number): string {
  const formatComponent = (value: number, positiveDir: string, negativeDir: string): string => {
    const dir = value >= 0 ? positiveDir : negativeDir;
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
    return `${degrees}°${minutes}'${seconds}"${dir}`;
  };

  const latStr = formatComponent(lat, 'N', 'S');
  const lngStr = formatComponent(lng, 'E', 'W');
  return `${latStr} ${lngStr}`;
}

/**
 * Format coordinates as degrees with decimal minutes (DDM).
 */
export function formatDDM(lat: number, lng: number): string {
  const formatComponent = (value: number, positiveDir: string, negativeDir: string): string => {
    const dir = value >= 0 ? positiveDir : negativeDir;
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = ((abs - degrees) * 60).toFixed(3);
    return `${degrees}° ${minutes}' ${dir}`;
  };

  const latStr = formatComponent(lat, 'N', 'S');
  const lngStr = formatComponent(lng, 'E', 'W');
  return `${latStr}, ${lngStr}`;
}

/**
 * Parse a single coordinate component. Accepts decimal degrees, DDM, or DMS,
 * with an optional hemisphere letter (N/S/E/W). Returns `null` if the string
 * is unparseable. Doesn't range-check — callers do that against axis-specific
 * limits.
 *
 * Supported shapes:
 *   "40.7128"          → 40.7128
 *   "-74.006"          → -74.006
 *   "40.7128 N"        → 40.7128
 *   "74.006 W"         → -74.006
 *   "40 42.768 N"      → 40.7128
 *   "40 42' 46.08\" N" →  40.7128
 *   "40°42'46.08\"N"   →  40.7128
 */
export function parseCoordinate(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Extract hemisphere letter if present (any position, but typically trailing).
  const hemisphereMatch = trimmed.match(/[NSEW]/i);
  const hemisphere = hemisphereMatch ? hemisphereMatch[0].toUpperCase() : null;

  // Strip hemisphere letters and normalize all unicode degree/minute/second
  // marks to spaces so the remaining tokens are just numeric components.
  const normalized = trimmed
    .replace(/[NSEW]/gi, ' ')
    .replace(/[°º*]/g, ' ')
    .replace(/['′]/g, ' ')
    .replace(/["″]/g, ' ')
    .replace(/,/g, ' ')
    .trim();

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const numbers = tokens.map((t) => Number(t));
  if (numbers.some((n) => !Number.isFinite(n))) return null;

  let value: number;
  if (numbers.length === 1) {
    // Decimal degrees.
    value = numbers[0];
  } else if (numbers.length === 2) {
    // Degrees + decimal minutes (DDM).
    const [deg, min] = numbers;
    if (min < 0) return null;
    const abs = Math.abs(deg) + min / 60;
    value = deg < 0 ? -abs : abs;
  } else if (numbers.length === 3) {
    // Degrees, minutes, seconds (DMS).
    const [deg, min, sec] = numbers;
    if (min < 0 || sec < 0) return null;
    const abs = Math.abs(deg) + min / 60 + sec / 3600;
    value = deg < 0 ? -abs : abs;
  } else {
    return null;
  }

  if (hemisphere === 'S' || hemisphere === 'W') value = -Math.abs(value);
  else if (hemisphere === 'N' || hemisphere === 'E') value = Math.abs(value);

  return value;
}

/**
 * CoordinateDisplay - Shows mouse coordinates with selectable format.
 * When `onNavigate` is provided, clicking the readout expands the control into
 * a lat/lng input form for "go-to" navigation.
 */
export function CoordinateDisplay({
  latitude,
  longitude,
  activeFormat,
  formats,
  onFormatChange,
  className = '',
  onNavigate,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onPinDropRequest,
  pinDropActive = false,
}: CoordinateDisplayProps) {
  const activeFormatOption = formats.find((f) => f.id === activeFormat);

  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpandedProp ?? internalExpanded;
  const canNavigate = !!onNavigate;
  const rootRef = useRef<HTMLDivElement>(null);

  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFormatClick = () => {
    const currentIndex = formats.findIndex((f) => f.id === activeFormat);
    const nextIndex = (currentIndex + 1) % formats.length;
    onFormatChange(formats[nextIndex].id);
  };

  const setExpanded = (next: boolean) => {
    if (onToggleExpand) onToggleExpand(next);
    else setInternalExpanded(next);
    if (!next) setError(null);
  };

  const handleReadoutClick = () => {
    if (!canNavigate) return;
    setExpanded(!expanded);
  };

  // Close the navigate form on outside click or Escape.
  useEffect(() => {
    if (!expanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      const node = rootRef.current;
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setExpanded(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onNavigate) return;
    const lat = parseCoordinate(latInput);
    const lng = parseCoordinate(lngInput);
    if (lat == null || lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }
    if (lng == null || lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }
    setError(null);
    onNavigate(lat, lng);
    setExpanded(false);
  };

  return (
    <div
      ref={rootRef}
      className={`mapui:bg-black/60 mapui:text-white mapui:text-xs mapui:px-3 mapui:py-1 mapui:flex mapui:flex-col mapui:gap-1 mapui:rounded ${className}`}
    >
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <button
          onClick={handleFormatClick}
          className="mapui:text-blue-300 hover:mapui:text-blue-200 mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:p-0"
          title="Click to cycle coordinate format"
          type="button"
        >
          {activeFormatOption?.label ?? 'Unknown'}
        </button>
        {canNavigate ? (
          <button
            type="button"
            onClick={handleReadoutClick}
            className="mapui:font-mono mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:text-inherit mapui:p-0 hover:mapui:text-blue-200"
            title="Click to go to coordinates"
            aria-expanded={expanded}
          >
            {latitude !== null && longitude !== null && activeFormatOption
              ? activeFormatOption.format(latitude, longitude)
              : '—'}
          </button>
        ) : (
          <span className="mapui:font-mono">
            {latitude !== null && longitude !== null && activeFormatOption
              ? activeFormatOption.format(latitude, longitude)
              : '—'}
          </span>
        )}
      </div>

      {canNavigate && expanded && (
        <form onSubmit={handleSubmit} className="mapui:flex mapui:flex-col mapui:gap-1 mapui:pt-1">
          <div className="mapui:flex mapui:items-center mapui:gap-1">
            <label className="mapui:text-[10px] mapui:uppercase mapui:tracking-wide mapui:opacity-80" htmlFor="mapui-coord-lat">
              Lat
            </label>
            <input
              id="mapui-coord-lat"
              type="text"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="40.7128"
              className="mapui:bg-white/10 mapui:text-white mapui:rounded mapui:px-1 mapui:py-0.5 mapui:font-mono mapui:w-24 mapui:border mapui:border-white/20 focus:mapui:outline-none focus:mapui:border-blue-300"
              aria-label="Latitude"
              autoFocus
            />
            <label className="mapui:text-[10px] mapui:uppercase mapui:tracking-wide mapui:opacity-80 mapui:ml-1" htmlFor="mapui-coord-lng">
              Lng
            </label>
            <input
              id="mapui-coord-lng"
              type="text"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="-74.006"
              className="mapui:bg-white/10 mapui:text-white mapui:rounded mapui:px-1 mapui:py-0.5 mapui:font-mono mapui:w-24 mapui:border mapui:border-white/20 focus:mapui:outline-none focus:mapui:border-blue-300"
              aria-label="Longitude"
            />
            <button
              type="submit"
              className="mapui:bg-blue-500 hover:mapui:bg-blue-400 mapui:text-white mapui:rounded mapui:px-2 mapui:py-0.5 mapui:ml-1 mapui:cursor-pointer mapui:border-none"
            >
              Go
            </button>
            {onPinDropRequest && (
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  onPinDropRequest();
                }}
                title={pinDropActive ? 'Cancel pin drop' : 'Click on the map to drop a pin'}
                aria-label={pinDropActive ? 'Cancel pin drop' : 'Drop pin on map'}
                aria-pressed={pinDropActive}
                className={`mapui:rounded mapui:px-2 mapui:py-0.5 mapui:ml-1 mapui:cursor-pointer mapui:border-none mapui:text-white mapui:flex mapui:items-center ${
                  pinDropActive
                    ? 'mapui:bg-blue-400'
                    : 'mapui:bg-white/20 hover:mapui:bg-white/30'
                }`}
              >
                <LuMapPin size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              title="Close"
              aria-label="Close coordinate input"
              className="mapui:rounded mapui:px-2 mapui:py-0.5 mapui:ml-1 mapui:cursor-pointer mapui:border-none mapui:bg-white/20 hover:mapui:bg-white/30 mapui:text-white mapui:flex mapui:items-center"
            >
              <LuX size={14} />
            </button>
          </div>
          {error && <div className="mapui:text-red-300 mapui:text-[10px]">{error}</div>}
        </form>
      )}
    </div>
  );
}
