import { useEffect, useRef, useState } from 'react';
import { FormField, ColorPicker } from '@ogc-maps/storybook-components';
import { useSettings } from '../hooks/useSettings';
import type { SiteSettings } from '../hooks/useSettings';
import { ImageUploadField } from '../components/ImageUploadField';

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function CustomizePage() {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const initialized = useRef(false);

  // Sync form from server on initial load only
  useEffect(() => {
    if (!initialized.current) {
      setForm(settings);
      initialized.current = true;
    }
  }, [settings]);

  const update = (patch: Partial<SiteSettings>) => {
    setForm(prev => ({ ...prev, ...patch }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateSettings(form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(settings);
    setError(null);
    setSuccess(false);
  };

  const hasChanges =
    form.header_title !== settings.header_title ||
    form.header_color !== settings.header_color ||
    form.browser_title !== settings.browser_title ||
    form.favicon_data_url !== settings.favicon_data_url ||
    form.logo_data_url !== settings.logo_data_url ||
    form.logo_height !== settings.logo_height;

  return (
    <div className="mapui:mx-auto mapui:max-w-2xl mapui:px-6 mapui:py-8">
      <h1 className="mapui:mb-6 mapui:text-2xl mapui:font-bold mapui:text-slate-900">
        Customize
      </h1>

      {error && (
        <div className="mapui:mb-4 mapui:rounded mapui:border mapui:border-red-200 mapui:bg-red-50 mapui:px-4 mapui:py-3 mapui:flex mapui:items-center mapui:justify-between">
          <span className="mapui:text-sm mapui:text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="mapui:text-red-500 mapui:hover:text-red-700 mapui:text-lg mapui:leading-none">&times;</button>
        </div>
      )}

      {success && (
        <div className="mapui:mb-4 mapui:rounded mapui:border mapui:border-green-200 mapui:bg-green-50 mapui:px-4 mapui:py-3 mapui:flex mapui:items-center mapui:justify-between">
          <span className="mapui:text-sm mapui:text-green-700">Settings saved successfully.</span>
          <button onClick={() => setSuccess(false)} className="mapui:text-green-500 mapui:hover:text-green-700 mapui:text-lg mapui:leading-none">&times;</button>
        </div>
      )}

      <div className="mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-6 mapui:shadow-sm">
        <div className="mapui:flex mapui:flex-col mapui:gap-6">
          <FormField label="Header Title" description="Text displayed in the header navigation bar">
            <input
              type="text"
              value={form.header_title}
              onChange={e => update({ header_title: e.target.value })}
              className={inputClass}
            />
          </FormField>

          <FormField label="Header Background Color" description="Background color of the header bar">
            <ColorPicker
              value={form.header_color}
              onChange={color => update({ header_color: color })}
            />
          </FormField>

          <FormField label="Browser Tab Title" description="Title shown in the browser tab">
            <input
              type="text"
              value={form.browser_title}
              onChange={e => update({ browser_title: e.target.value })}
              className={inputClass}
            />
          </FormField>

          <FormField label="Favicon" description="Icon shown in the browser tab (PNG, ICO, or SVG, max 100KB)">
            <ImageUploadField
              value={form.favicon_data_url}
              onChange={dataUrl => update({ favicon_data_url: dataUrl })}
              accept="image/png,image/x-icon,image/svg+xml"
              maxSizeKb={100}
              previewHeight={32}
            />
          </FormField>

          <FormField label="Header Logo" description="Logo image displayed next to the header title (PNG, JPEG, or SVG, max 200KB)">
            <ImageUploadField
              value={form.logo_data_url}
              onChange={dataUrl => update({ logo_data_url: dataUrl })}
              accept="image/png,image/jpeg,image/svg+xml"
              maxSizeKb={200}
              previewHeight={40}
            />
          </FormField>

          <FormField label="Logo Height (px)" description="Height of the logo in the header. Logos taller than the header will extend below it.">
            <input
              type="number"
              min={16}
              max={200}
              value={form.logo_height}
              onChange={e => update({ logo_height: Number(e.target.value) })}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="mapui:mt-8 mapui:flex mapui:gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="mapui:rounded mapui:bg-blue-600 mapui:px-4 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-white mapui:hover:bg-blue-700 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges && (
            <button
              onClick={handleReset}
              className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-4 mapui:py-2 mapui:text-sm mapui:text-slate-700 mapui:hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
