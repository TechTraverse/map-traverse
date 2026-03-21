import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface SiteSettings {
  header_title: string;
  header_color: string;
  browser_title: string;
  favicon_data_url: string | null;
  logo_data_url: string | null;
}

interface UseSettingsResult {
  settings: SiteSettings;
  loading: boolean;
  updateSettings: (patch: Partial<SiteSettings>) => Promise<void>;
  refetch: () => void;
}

const DEFAULTS: SiteSettings = {
  header_title: 'Map Config Admin',
  header_color: '#1e293b',
  browser_title: 'Map Config Admin',
  favicon_data_url: null,
  logo_data_url: null,
};

const SettingsContext = createContext<UseSettingsResult | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    fetch('/api/settings', { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json() as SiteSettings;
          setSettings(data);
        }
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync browser title
  useEffect(() => {
    document.title = settings.browser_title;
  }, [settings.browser_title]);

  // Sync favicon
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-custom]');
    if (settings.favicon_data_url) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.setAttribute('data-custom', 'true');
        document.head.appendChild(link);
      }
      link.href = settings.favicon_data_url;
    } else if (link) {
      link.remove();
    }
  }, [settings.favicon_data_url]);

  const updateSettings = useCallback(async (patch: Partial<SiteSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? 'Failed to update settings');
    }
    const updated = await res.json() as SiteSettings;
    setSettings(updated);
  }, []);

  const value: UseSettingsResult = { settings, loading, updateSettings, refetch: fetchSettings };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): UseSettingsResult {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
