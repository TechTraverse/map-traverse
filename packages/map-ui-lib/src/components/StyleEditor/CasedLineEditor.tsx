import { FormField } from '../admin/FormField';
import { ColorPicker } from '../admin/ColorPicker';
import {
  getCasedLineParams,
  applyCasedLineParams,
  type CasedLinePair,
  type CasedLineParams,
} from '../../utils/casedLine';

export interface CasedLineEditorProps {
  /** The cased-line pair: [outer casing, inner road]. */
  value: CasedLinePair;
  onChange: (pair: CasedLinePair) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

const groupClass = 'mapui:flex mapui:flex-col mapui:gap-2 mapui:rounded-md mapui:border mapui:border-slate-200 mapui:p-3';
const groupTitleClass = 'mapui:m-0 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-slate-600';

/** A small static preview: the casing bar with the road bar centred on top. */
function CasedLinePreview({
  innerColor,
  innerWidth,
  outerColor,
  outerWidth,
}: {
  innerColor: string;
  innerWidth: number;
  outerColor: string;
  outerWidth: number;
}) {
  const trackHeight = Math.max(outerWidth, innerWidth, 2);
  const bar = (color: string, height: number, key: string) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: Math.max(height, 1),
        backgroundColor: color,
        borderRadius: 2,
      }}
    />
  );
  return (
    <div
      className="mapui:flex mapui:h-10 mapui:w-full mapui:items-center mapui:rounded mapui:border mapui:border-slate-200 mapui:px-3"
      aria-label="Cased line preview"
    >
      <div className="mapui:relative mapui:w-full" style={{ height: trackHeight }}>
        {bar(outerColor, outerWidth, 'outer')}
        {bar(innerColor, innerWidth, 'inner')}
      </div>
    </div>
  );
}

/**
 * Friendly editor for a "cased line" (two stacked line layers). Exposes the
 * inner (road) colour + width and the outer (casing) colour + edge width as
 * four always-visible controls, instead of two collapsed generic style cards.
 * Fully controlled; emits an updated [outer, inner] pair.
 */
export function CasedLineEditor({ value, onChange }: CasedLineEditorProps) {
  const params = getCasedLineParams(value);
  const outerWidth = params.innerWidth + params.edge * 2;

  const set = (patch: Partial<CasedLineParams>) =>
    onChange(applyCasedLineParams(value, { ...params, ...patch }));

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:rounded mapui:border mapui:border-slate-100 mapui:p-2">
        <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-slate-500">Preview</p>
        <CasedLinePreview
          innerColor={params.innerColor}
          innerWidth={params.innerWidth}
          outerColor={params.outerColor}
          outerWidth={outerWidth}
        />
      </div>

      <div className={groupClass}>
        <p className={groupTitleClass}>Inner (road)</p>
        <FormField label="Line color">
          <ColorPicker value={params.innerColor} onChange={(c) => set({ innerColor: c })} label="Inner line color" />
        </FormField>
        <FormField label="Line width">
          <input
            type="number"
            min={0}
            step={0.5}
            value={params.innerWidth}
            onChange={(e) => set({ innerWidth: Number(e.target.value) })}
            className={inputClass}
          />
        </FormField>
      </div>

      <div className={groupClass}>
        <p className={groupTitleClass}>Outer (casing)</p>
        <FormField label="Casing color">
          <ColorPicker value={params.outerColor} onChange={(c) => set({ outerColor: c })} label="Casing color" />
        </FormField>
        <FormField
          label="Casing edge (per side)"
          description="How far the casing extends beyond the road on each side, in pixels. Total casing width = line width + 2 × edge."
        >
          <input
            type="number"
            min={0}
            step={0.5}
            value={params.edge}
            onChange={(e) => set({ edge: Number(e.target.value) })}
            className={inputClass}
          />
        </FormField>
      </div>
    </div>
  );
}
