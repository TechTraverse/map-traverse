export type ScaleBarUnit = 'metric' | 'imperial';

export interface ScaleBarControlProps {
  /** Current map zoom level. */
  zoom: number;
  /** Current map center latitude (needed for Web Mercator scale). */
  latitude: number;
  /** Display unit system. Defaults to metric. */
  unit?: ScaleBarUnit;
  /** Maximum on-screen bar width in pixels. Defaults to 100. */
  maxWidthPx?: number;
  className?: string;
}

// Web Mercator ground resolution (meters per pixel at 256px tiles, zoom 0).
const EARTH_CIRCUMFERENCE_M = 40075016.686;
const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

/** Meters represented by one pixel at the given zoom and latitude (Web Mercator). */
export function metersPerPixel(zoom: number, latitude: number): number {
  const latRad = (latitude * Math.PI) / 180;
  return (EARTH_CIRCUMFERENCE_M * Math.cos(latRad)) / Math.pow(2, zoom + 8);
}

/** Picks a "nice" round number ≤ max (1, 2, 5, 10, 20, 50, ...). */
function niceNumber(max: number): number {
  if (max <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const frac = max / pow;
  let nice: number;
  if (frac >= 5) nice = 5;
  else if (frac >= 2) nice = 2;
  else nice = 1;
  return nice * pow;
}

interface ScaleBarValue {
  label: string;
  widthPx: number;
}

/** Computes the displayed label and bar width for a metric scale bar. */
export function computeMetricScale(
  zoom: number,
  latitude: number,
  maxWidthPx: number,
): ScaleBarValue {
  const mPerPx = metersPerPixel(zoom, latitude);
  const maxMeters = mPerPx * maxWidthPx;
  if (maxMeters >= 1000) {
    const km = niceNumber(maxMeters / 1000);
    return { label: `${km} km`, widthPx: (km * 1000) / mPerPx };
  }
  const m = niceNumber(maxMeters);
  return { label: `${m} m`, widthPx: m / mPerPx };
}

/** Computes the displayed label and bar width for an imperial scale bar. */
export function computeImperialScale(
  zoom: number,
  latitude: number,
  maxWidthPx: number,
): ScaleBarValue {
  const mPerPx = metersPerPixel(zoom, latitude);
  const maxMiles = (mPerPx * maxWidthPx) / METERS_PER_MILE;
  if (maxMiles >= 1) {
    const miles = niceNumber(maxMiles);
    return { label: `${miles} mi`, widthPx: (miles * METERS_PER_MILE) / mPerPx };
  }
  const maxFeet = mPerPx * maxWidthPx * FEET_PER_METER;
  const feet = niceNumber(maxFeet);
  return { label: `${feet} ft`, widthPx: feet / FEET_PER_METER / mPerPx };
}

/**
 * A framework-agnostic scale bar. Given a zoom level, center latitude, and
 * unit system, renders a labeled bar whose pixel width matches the round
 * ground distance in the label.
 *
 * Fully controlled: has no internal state and no dependency on MapLibre.
 */
export function ScaleBarControl({
  zoom,
  latitude,
  unit = 'metric',
  maxWidthPx = 100,
  className = '',
}: ScaleBarControlProps) {
  const { label, widthPx } =
    unit === 'imperial'
      ? computeImperialScale(zoom, latitude, maxWidthPx)
      : computeMetricScale(zoom, latitude, maxWidthPx);

  return (
    <div
      className={`mapui:inline-flex mapui:flex-col mapui:items-start mapui:bg-white/80 mapui:px-1.5 mapui:py-1 mapui:rounded mapui:shadow-sm mapui:text-[10px] mapui:font-medium mapui:text-slate-800 ${className}`.trim()}
      aria-label={`Map scale: ${label}`}
    >
      <span className="mapui:tabular-nums">{label}</span>
      <span
        className="mapui:block mapui:h-1 mapui:border-b mapui:border-l mapui:border-r mapui:border-slate-800"
        style={{ width: `${Math.max(1, Math.round(widthPx))}px` }}
      />
    </div>
  );
}
