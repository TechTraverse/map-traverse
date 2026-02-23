import { PropertyList } from '../_shared/PropertyList';

export interface FeatureTooltipProps {
  title?: string;
  properties: Record<string, unknown> | null;
  fields?: string[];
  labels?: Record<string, string>;
  maxItems?: number;
  className?: string;
}

export function FeatureTooltip({
  title,
  properties,
  fields,
  labels,
  maxItems = 4,
  className = '',
}: FeatureTooltipProps) {
  if (!properties) {
    return (
      <div
        className={`mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-3 mapui:py-2 mapui:shadow-md ${className}`.trim()}
      >
        <p className="mapui:m-0 mapui:text-xs mapui:text-gray-400">No data</p>
      </div>
    );
  }

  const keys = fields ?? Object.keys(properties);
  const truncated = keys.length > maxItems;
  const extra = keys.length - maxItems;

  return (
    <div
      className={`mapui:min-w-[140px] mapui:max-w-[240px] mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-3 mapui:py-2 mapui:shadow-md ${className}`.trim()}
    >
      {title && (
        <p className="mapui:mb-1.5 mapui:mt-0 mapui:text-xs mapui:font-semibold mapui:text-gray-700">
          {title}
        </p>
      )}
      <PropertyList
        properties={properties}
        fields={fields}
        labels={labels}
        maxItems={maxItems}
        density="compact"
      />
      {truncated && (
        <p className="mapui:mb-0 mapui:mt-1 mapui:text-xs mapui:text-gray-400">+{extra} more</p>
      )}
    </div>
  );
}
