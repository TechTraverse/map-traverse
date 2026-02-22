import type { OgcApiSource } from '../../types';
import { FormField } from '../admin/FormField';

export interface SourceEditorProps {
  value: OgcApiSource;
  onChange: (source: OgcApiSource) => void;
  onTestConnection?: (url: string) => void;
  testStatus?: 'idle' | 'loading' | 'success' | 'error';
  testError?: string;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function SourceEditor({
  value,
  onChange,
  onTestConnection,
  testStatus = 'idle',
  testError,
}: SourceEditorProps) {
  const update = (patch: Partial<OgcApiSource>) => onChange({ ...value, ...patch });

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="ID" required>
        <input
          type="text"
          value={value.id}
          onChange={(e) => update({ id: e.target.value })}
          placeholder="my-source"
          className={inputClass}
        />
      </FormField>

      <FormField label="URL" required>
        <div className="mapui:flex mapui:gap-2">
          <input
            type="url"
            value={value.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://example.com/ogcapi"
            className={`${inputClass} mapui:flex-1`}
          />
          {onTestConnection && (
            <button
              type="button"
              onClick={() => onTestConnection(value.url)}
              disabled={testStatus === 'loading' || !value.url}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-blue-500 mapui:bg-white mapui:px-3 mapui:py-1 mapui:text-sm mapui:text-blue-600 hover:mapui:bg-blue-50 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
            >
              {testStatus === 'loading' ? 'Testing…' : 'Test Connection'}
            </button>
          )}
        </div>
        {testStatus === 'success' && (
          <span className="mapui:text-xs mapui:text-green-600">Connection successful</span>
        )}
        {testStatus === 'error' && (
          <span className="mapui:text-xs mapui:text-red-600">
            {testError ?? 'Connection failed'}
          </span>
        )}
      </FormField>

      <FormField label="Label">
        <input
          type="text"
          value={value.label ?? ''}
          onChange={(e) => update({ label: e.target.value || undefined })}
          placeholder="My OGC API Source"
          className={inputClass}
        />
      </FormField>

      <FormField label="Tile Matrix Set ID">
        <input
          type="text"
          value={value.tileMatrixSetId ?? 'WebMercatorQuad'}
          onChange={(e) => update({ tileMatrixSetId: e.target.value || undefined })}
          placeholder="WebMercatorQuad"
          className={inputClass}
        />
      </FormField>
    </div>
  );
}
