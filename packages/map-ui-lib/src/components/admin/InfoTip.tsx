import { useId } from 'react';
import { LuInfo } from 'react-icons/lu';

export interface InfoTipProps {
  text: string;
  id?: string;
}

export function InfoTip({ text, id }: InfoTipProps) {
  const generatedId = useId();
  const tooltipId = id ?? generatedId;

  return (
    <span className="mapui:relative mapui:inline-flex mapui:group">
      <span
        tabIndex={0}
        aria-label="Info"
        aria-describedby={tooltipId}
        className="mapui:inline-flex mapui:items-center mapui:text-gray-400 mapui:cursor-default hover:mapui:text-gray-600 focus:mapui:text-gray-600 focus:mapui:outline-none"
      >
        <LuInfo className="mapui:h-3.5 mapui:w-3.5" />
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className="mapui:pointer-events-none mapui:absolute mapui:bottom-full mapui:left-1/2 mapui:-translate-x-1/2 mapui:mb-1.5 mapui:w-48 mapui:rounded mapui:bg-gray-900 mapui:px-2 mapui:py-1.5 mapui:text-xs mapui:text-white mapui:shadow-lg mapui:opacity-0 mapui:group-hover:opacity-100 mapui:group-focus-within:opacity-100 mapui:transition-opacity mapui:z-50"
      >
        {text}
        <span className="mapui:absolute mapui:top-full mapui:left-1/2 mapui:-translate-x-1/2 mapui:border-4 mapui:border-transparent mapui:border-t-gray-900" />
      </span>
    </span>
  );
}
