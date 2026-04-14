export interface ExportButtonProps {
  /** Icon component to display (e.g., LuDownload from react-icons/lu) */
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Accessible label for the button (shown as tooltip/aria-label) */
  label?: string;
  onExport: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  icon: Icon,
  label = 'Export',
  onExport,
  loading = false,
  disabled = false,
  className = '',
}: ExportButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`mapui:flex mapui:items-center mapui:justify-center mapui:w-10 mapui:h-10 mapui:bg-white mapui:rounded mapui:shadow-md mapui:transition-colors ${
        isDisabled
          ? 'mapui:cursor-not-allowed mapui:opacity-50'
          : 'mapui:cursor-pointer hover:mapui:bg-slate-50'
      } ${className}`.trim()}
      disabled={isDisabled}
      onClick={onExport}
    >
      <Icon size={20} className="mapui:text-slate-700" />
    </button>
  );
}
