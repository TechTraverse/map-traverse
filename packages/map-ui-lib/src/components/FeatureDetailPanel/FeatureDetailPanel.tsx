import { PropertyList } from '../_shared/PropertyList';

export interface FeatureDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Record<string, unknown> | null;
  title?: string;
  fields?: string[];
  labels?: Record<string, string>;
  variant?: 'panel' | 'modal';
  className?: string;
}

export function FeatureDetailPanel({
  isOpen,
  onClose,
  properties,
  title = 'Feature Properties',
  fields,
  labels,
  variant = 'panel',
  className = '',
}: FeatureDetailPanelProps) {
  if (!isOpen) return null;

  const content = (
    <div
      className={[
        'mapui:flex mapui:flex-col mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:shadow-md',
        variant === 'modal'
          ? 'mapui:max-h-[80vh] mapui:w-full mapui:max-w-lg'
          : 'mapui:max-h-[calc(100vh-4rem)] mapui:w-72',
        className,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()}
      onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
    >
      <div className="mapui:flex mapui:shrink-0 mapui:items-center mapui:justify-between mapui:border-b mapui:border-gray-200 mapui:px-4 mapui:py-3">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-gray-700">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="mapui:flex mapui:h-6 mapui:w-6 mapui:cursor-pointer mapui:items-center mapui:justify-center mapui:rounded mapui:border-0 mapui:bg-transparent mapui:text-lg mapui:leading-none mapui:text-gray-400 mapui:transition-colors hover:mapui:bg-gray-100 hover:mapui:text-gray-700"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mapui:overflow-y-auto mapui:px-4 mapui:py-3">
        {properties && Object.keys(properties).length > 0 ? (
          <PropertyList properties={properties} fields={fields} labels={labels} density="default" />
        ) : (
          <p className="mapui:m-0 mapui:text-sm mapui:text-gray-400">No properties available.</p>
        )}
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/40 mapui:p-4"
        onClick={onClose}
      >
        {content}
      </div>
    );
  }

  return content;
}
