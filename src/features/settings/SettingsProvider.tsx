import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getRepositories, resyncReminders, subscribeParking } from '@/features/parking/service';

import { DEFAULT_SETTINGS, type AppSettings } from './settings';

interface SettingsValue {
  settings: AppSettings;
  ready: boolean;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

const REMINDER_KEYS: (keyof AppSettings)[] = ['warningLeadMinutes', 'notifyAtExpiry'];

async function readSettings(): Promise<AppSettings> {
  try {
    const { settings } = await getRepositories();
    return await settings.load();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () =>
      readSettings().then((next) => {
        setSettings((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
        setReady(true);
      });
    load();
    // "Delete all data" also resets settings; reload whenever data is wiped/changed.
    return subscribeParking(() => {
      load();
    });
  }, []);

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    const { settings: repo } = await getRepositories();
    await repo.set(key, value);
    if (REMINDER_KEYS.includes(key)) await resyncReminders();
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
