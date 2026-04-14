import { LuRuler, LuPentagon, LuTrash2 } from 'react-icons/lu';
import type {
  MeasureMode,
  MeasureUnit,
  Measurement,
  DistanceUnit,
  AreaUnit,
} from '../../utils/measure';
import { UNITS_FOR_MODE, UNIT_LABELS, formatMeasurement } from '../../utils/measure';

export interface MeasurePanelProps {
  mode: MeasureMode | null;
  onModeChange: (mode: MeasureMode | null) => void;
  points: [number, number][];
  measurement: Measurement | null;
  unit: MeasureUnit;
  onUnitChange: (unit: MeasureUnit) => void;
  onClear: () => void;
  className?: string;
}

const modeButtons: { mode: MeasureMode; icon: typeof LuRuler; label: string }[] = [
  { mode: 'distance', icon: LuRuler, label: 'Distance' },
  { mode: 'area', icon: LuPentagon, label: 'Area' },
];

function getInstructionText(mode: MeasureMode | null, pointCount: number): string {
  if (!mode) return 'Select a measurement mode';
  if (pointCount === 0) return 'Click on the map to start measuring';
  if (mode === 'distance') return 'Click to add points, double-click to finish';
  if (pointCount < 3) return 'Click to add points (min 3 for area)';
  return 'Click to add points, double-click to close';
}

export function MeasurePanel({
  mode,
  onModeChange,
  points,
  measurement,
  unit,
  onUnitChange,
  onClear,
  className,
}: MeasurePanelProps) {
  const unitOptions = mode ? UNITS_FOR_MODE[mode] : [];

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-3 ${className ?? ''}`}>
      {/* Mode toggle */}
      <div className="mapui:flex mapui:gap-1">
        {modeButtons.map(({ mode: m, icon: Icon, label }) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(active ? null : m)}
              aria-label={label}
              aria-pressed={active}
              className={[
                'mapui:flex mapui:flex-1 mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:transition-colors',
                active
                  ? 'mapui:bg-blue-600 mapui:text-white'
                  : 'mapui:bg-slate-100 mapui:text-slate-700 hover:mapui:bg-slate-200',
              ].join(' ')}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Measurement display */}
      {mode && (
        <>
          <div className="mapui:text-center">
            <div className="mapui:text-2xl mapui:font-semibold mapui:text-slate-900">
              {measurement ? formatMeasurement(measurement) : '—'}
            </div>
          </div>

          {/* Unit selector */}
          <div className="mapui:flex mapui:gap-1">
            {unitOptions.map((u) => {
              const active = unit === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => onUnitChange(u as DistanceUnit | AreaUnit)}
                  aria-label={`Unit: ${UNIT_LABELS[u]}`}
                  className={[
                    'mapui:flex-1 mapui:rounded mapui:px-2 mapui:py-1 mapui:text-xs mapui:font-medium mapui:transition-colors',
                    active
                      ? 'mapui:bg-blue-100 mapui:text-blue-700'
                      : 'mapui:bg-slate-50 mapui:text-slate-500 hover:mapui:bg-slate-100',
                  ].join(' ')}
                >
                  {UNIT_LABELS[u]}
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <p className="mapui:m-0 mapui:text-center mapui:text-xs mapui:text-slate-500">
            {getInstructionText(mode, points.length)}
          </p>

          {/* Clear button */}
          {points.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="mapui:flex mapui:items-center mapui:justify-center mapui:gap-1.5 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:text-slate-600 hover:mapui:bg-slate-50"
            >
              <LuTrash2 size={14} />
              Clear
            </button>
          )}
        </>
      )}
    </div>
  );
}
