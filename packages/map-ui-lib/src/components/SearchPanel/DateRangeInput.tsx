import { useId } from 'react';

interface DateRangeInputProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
  id?: string;
}

export function DateRangeInput({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className = '',
  id,
}: DateRangeInputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const startId = `${baseId}-start`;
  const endId = `${baseId}-end`;

  const inputClass =
    'mapui:flex-1 mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-1.5 ${className}`.trim()}>
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <label htmlFor={startId} className="mapui:text-xs mapui:text-gray-400 mapui:w-8">From</label>
        <input
          id={startId}
          type="datetime-local"
          value={startValue}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="Start date"
          className={inputClass}
        />
      </div>
      <div className="mapui:flex mapui:items-center mapui:gap-2">
        <label htmlFor={endId} className="mapui:text-xs mapui:text-gray-400 mapui:w-8">To</label>
        <input
          id={endId}
          type="datetime-local"
          value={endValue}
          onChange={(e) => onEndChange(e.target.value)}
          aria-label="End date"
          className={inputClass}
        />
      </div>
    </div>
  );
}
