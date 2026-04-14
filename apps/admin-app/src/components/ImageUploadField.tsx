import { useRef } from 'react';

export interface ImageUploadFieldProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  accept?: string;
  maxSizeKb?: number;
  previewHeight?: number;
}

export function ImageUploadField({
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/svg+xml,image/x-icon',
  maxSizeKb = 200,
  previewHeight = 40,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeKb * 1024) {
      alert(`File must be under ${maxSizeKb}KB. Selected file is ${Math.round(file.size / 1024)}KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="mapui:flex mapui:items-center mapui:gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="mapui:hidden"
      />
      {value ? (
        <>
          <img
            src={value}
            alt="Preview"
            style={{ height: previewHeight }}
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:object-contain mapui:p-1"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:text-slate-700 mapui:hover:bg-slate-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:text-red-600 mapui:hover:bg-red-50"
          >
            Remove
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mapui:rounded mapui:border mapui:border-dashed mapui:border-slate-400 mapui:bg-white mapui:px-4 mapui:py-2 mapui:text-xs mapui:text-slate-500 mapui:hover:border-slate-500 mapui:hover:text-slate-700"
        >
          Upload image
        </button>
      )}
    </div>
  );
}
