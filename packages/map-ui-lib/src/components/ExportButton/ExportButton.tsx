export interface ExportButtonProps {
  onExport: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  onExport,
  loading = false,
  disabled = false,
  className = '',
}: ExportButtonProps) {
  const isDisabled = disabled || loading;

  const buttonClasses = [
    'mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded mapui:border mapui:border-gray-300',
    'mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-gray-700 mapui:transition-colors',
    isDisabled
      ? 'mapui:cursor-not-allowed mapui:opacity-50'
      : 'mapui:cursor-pointer hover:mapui:bg-gray-50 hover:mapui:border-gray-400',
  ].join(' ');

  return (
    <button
      className={`${buttonClasses} ${className}`.trim()}
      disabled={isDisabled}
      onClick={() => !isDisabled && onExport()}
    >
      {loading ? 'Exporting...' : 'Export'}
    </button>
  );
}
