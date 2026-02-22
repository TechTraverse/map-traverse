export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="mapui:w-full mapui:max-w-sm mapui:rounded-lg mapui:bg-white mapui:p-6 mapui:shadow-xl">
        <h2
          id="confirm-dialog-title"
          className="mapui:m-0 mapui:mb-2 mapui:text-base mapui:font-semibold mapui:text-gray-900"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="mapui:m-0 mapui:mb-6 mapui:text-sm mapui:text-gray-600"
        >
          {description}
        </p>
        <div className="mapui:flex mapui:justify-end mapui:gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-gray-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-gray-700 hover:mapui:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-transparent mapui:bg-red-600 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:font-medium mapui:text-white hover:mapui:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
