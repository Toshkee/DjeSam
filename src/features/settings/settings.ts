import type { Db } from '@/db/types';
import { TIMER_PRESETS_MINUTES, WARNING_LEAD_OPTIONS_MINUTES } from '@/features/timer/timer';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  theme: ThemePreference;
  warningLeadMinutes: number;
  notifyAtExpiry: boolean;
  /** Preselected timer for new sessions; null = no timer. */
  defaultTimerMinutes: number | null;
  reverseGeocode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  warningLeadMinutes: 10,
  notifyAtExpiry: true,
  defaultTimerMinutes: null,
  reverseGeocode: true,
};

type Parser<T> = (raw: unknown) => T | undefined;

const parsers: { [K in keyof AppSettings]: Parser<AppSettings[K]> } = {
  theme: (v) => (v === 'system' || v === 'light' || v === 'dark' ? v : undefined),
  warningLeadMinutes: (v) =>
    typeof v === 'number' && (WARNING_LEAD_OPTIONS_MINUTES as readonly number[]).includes(v)
      ? v
      : undefined,
  notifyAtExpiry: (v) => (typeof v === 'boolean' ? v : undefined),
  defaultTimerMinutes: (v) =>
    v === null || (typeof v === 'number' && (TIMER_PRESETS_MINUTES as readonly number[]).includes(v))
      ? (v as number | null)
      : undefined,
  reverseGeocode: (v) => (typeof v === 'boolean' ? v : undefined),
};

/** Unknown keys and malformed values fall back to defaults instead of crashing. */
export function parseSettings(rows: { key: string; value: string }[]): AppSettings {
  const result: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (!(key in parsers)) continue;
    const k = key as keyof AppSettings;
    let raw: unknown;
    try {
      raw = JSON.parse(value);
    } catch {
      continue;
    }
    const parsed = parsers[k](raw);
    if (parsed !== undefined) (result as Record<keyof AppSettings, unknown>)[k] = parsed;
  }
  return result;
}

export function createSettingsRepository(db: Db) {
  return {
    async load(): Promise<AppSettings> {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
      return parseSettings(rows);
    },
    async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, JSON.stringify(value)],
      );
    },
    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM settings');
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
