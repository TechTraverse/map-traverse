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
}

/**
 * Format coordinates as decimal degrees
 */
export function formatDecimal(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Format coordinates as degrees, minutes, seconds (DMS)
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
 * CoordinateDisplay - Shows mouse coordinates with selectable format
 */
export function CoordinateDisplay({
  latitude,
  longitude,
  activeFormat,
  formats,
  onFormatChange,
  className = '',
}: CoordinateDisplayProps) {
  const activeFormatOption = formats.find((f) => f.id === activeFormat);

  const handleFormatClick = () => {
    const currentIndex = formats.findIndex((f) => f.id === activeFormat);
    const nextIndex = (currentIndex + 1) % formats.length;
    onFormatChange(formats[nextIndex].id);
  };

  return (
    <div
      className={`mapui:bg-black/60 mapui:text-white mapui:text-xs mapui:px-3 mapui:py-1 mapui:flex mapui:items-center mapui:gap-2 mapui:rounded ${className}`}
    >
      <button
        onClick={handleFormatClick}
        className="mapui:text-blue-300 hover:mapui:text-blue-200 mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:p-0"
        title="Click to cycle coordinate format"
      >
        {activeFormatOption?.label ?? 'Unknown'}
      </button>
      <span className="mapui:font-mono">
        {latitude !== null && longitude !== null && activeFormatOption
          ? activeFormatOption.format(latitude, longitude)
          : '—'}
      </span>
    </div>
  );
}
