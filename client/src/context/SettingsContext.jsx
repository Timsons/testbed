import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings as apiUpdateSettings } from '../api/settings.js';

const SettingsContext = createContext(null);

function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Apply the resolved theme to the document root, and keep it in sync with
  // OS-level changes for as long as the chosen theme is "system".
  useEffect(() => {
    if (!settings) return;

    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(settings.theme));
    };
    apply();

    if (settings.theme !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings?.theme]);

  const updateSettings = useCallback(async (patch) => {
    const updated = await apiUpdateSettings(patch);
    setSettings(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({ settings, loading, error, updateSettings }),
    [settings, loading, error, updateSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
