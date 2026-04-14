export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? 'Color'}
        className="mapui:h-8 mapui:w-10 mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:p-0.5"
      />
      <span className="mapui:font-mono mapui:text-xs mapui:text-slate-600">{value}</span>
    </div>
  );
}
