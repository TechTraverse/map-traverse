import type { OgcApiSource, SourceAuth } from '../../types';
import { FormField } from '../admin/FormField';

export interface SourceEditorProps {
  value: OgcApiSource;
  onChange: (source: OgcApiSource) => void;
  onTestConnection?: (url: string, auth?: SourceAuth) => void;
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
  const authType = value.auth?.type ?? 'none';

  const handleAuthTypeChange = (newType: string) => {
    if (newType === 'none') {
      update({ auth: undefined });
    } else {
      update({
        auth: {
          type: newType as SourceAuth['type'],
          name: value.auth?.name ?? '',
          value: value.auth?.value ?? '',
        },
      });
    }
  };

  const updateAuth = (patch: Partial<SourceAuth>) => {
    if (!value.auth) return;
    update({ auth: { ...value.auth, ...patch } });
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="Type">
        <div className="mapui:flex mapui:gap-4">
          {(['features', 'imagery'] as const).map((t) => (
            <label key={t} className="mapui:flex mapui:items-center mapui:gap-1.5 mapui:cursor-pointer">
              <input
                type="radio"
                name={`source-type-${value.id || 'new'}`}
                value={t}
                checked={(value.type ?? 'features') === t}
                onChange={() => update({ type: t })}
                className="mapui:accent-blue-600"
              />
              <span className="mapui:text-sm mapui:text-gray-700 mapui:capitalize">{t}</span>
            </label>
          ))}
        </div>
      </FormField>

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
            placeholder="https://example.com/ogcapi or tiles.json URL"
            className={`${inputClass} mapui:flex-1`}
          />
          {onTestConnection && (
            <button
              type="button"
              onClick={() => onTestConnection(value.url, value.auth)}
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

      <FormField label="Authentication">
        <select
          value={authType}
          onChange={(e) => handleAuthTypeChange(e.target.value)}
          className={`${inputClass} mapui:w-full`}
        >
          <option value="none">None</option>
          <option value="query_param">Query Parameter</option>
          <option value="header">HTTP Header</option>
        </select>
      </FormField>

      {value.auth && (
        <div className="mapui:grid mapui:grid-cols-2 mapui:gap-3">
          <FormField label={authType === 'header' ? 'Header Name' : 'Parameter Name'} required>
            <input
              type="text"
              value={value.auth.name}
              onChange={(e) => updateAuth({ name: e.target.value })}
              placeholder={authType === 'header' ? 'Authorization' : 'key'}
              className={inputClass}
            />
          </FormField>
          <FormField label="Value" required>
            <input
              type="text"
              value={value.auth.value}
              onChange={(e) => updateAuth({ value: e.target.value })}
              placeholder={authType === 'header' ? 'Bearer your-token' : 'your-api-key'}
              className={inputClass}
            />
          </FormField>
        </div>
      )}

      <FormField label="Proxy">
        <label className="mapui:flex mapui:items-center mapui:gap-2 mapui:cursor-pointer">
          <input
            type="checkbox"
            checked={value.proxy ?? false}
            onChange={() => update({ proxy: !value.proxy })}
            className="mapui:accent-blue-600"
          />
          <span className="mapui:text-sm mapui:text-gray-700">Proxy requests through server</span>
        </label>
        <p className="mapui:text-xs mapui:text-gray-500 mapui:mt-1">
          Route requests through the server to protect API keys and bypass CORS restrictions.
        </p>
        {value.proxy && value.auth && (
          <p className="mapui:text-xs mapui:text-blue-600 mapui:mt-1">
            Credentials will be applied server-side and hidden from browsers.
          </p>
        )}
      </FormField>
    </div>
  );
}
