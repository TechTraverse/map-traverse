import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function FormField({ label, error, required, description, htmlFor, children }: FormFieldProps) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1">
      <div className="mapui:flex mapui:items-center mapui:gap-1">
        <label htmlFor={htmlFor} className="mapui:flex mapui:items-center mapui:gap-1 mapui:text-xs mapui:font-medium mapui:text-slate-700">
          {label}
          {required && (
            <span className="mapui:ml-0.5 mapui:text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {description && <InfoTip text={description} />}
      </div>
      {children}
      {error && (
        <p className="mapui:m-0 mapui:text-xs mapui:text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
