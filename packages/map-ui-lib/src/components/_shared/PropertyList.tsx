export type PropertyListDensity = 'compact' | 'default';

interface PropertyListProps {
  properties: Record<string, unknown>;
  fields?: string[];
  maxItems?: number;
  density?: PropertyListDensity;
  className?: string;
}

export function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatPropertyValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PropertyList({
  properties,
  fields,
  maxItems,
  density = 'default',
  className = '',
}: PropertyListProps) {
  const keys = fields ?? Object.keys(properties);
  const displayKeys = maxItems != null ? keys.slice(0, maxItems) : keys;

  if (density === 'compact') {
    return (
      <dl className={`mapui:m-0 mapui:text-xs ${className}`.trim()}>
        {displayKeys.map((key) => (
          <div key={key} className="mapui:flex mapui:gap-1 mapui:py-0.5">
            <dt className="mapui:shrink-0 mapui:font-medium mapui:text-gray-500">{key}:</dt>
            <dd className="mapui:m-0 mapui:truncate mapui:text-gray-800">
              {formatPropertyValue(properties[key])}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={`mapui:m-0 mapui:grid mapui:grid-cols-2 mapui:gap-x-4 mapui:gap-y-2 mapui:text-sm ${className}`.trim()}
    >
      {displayKeys.map((key) => (
        <div key={key} className="mapui:contents">
          <dt className="mapui:break-words mapui:font-medium mapui:text-gray-500">{key}</dt>
          <dd className="mapui:m-0 mapui:break-words mapui:text-gray-800">
            {formatPropertyValue(properties[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
