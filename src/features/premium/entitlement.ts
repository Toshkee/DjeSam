import type { Db } from '@/db/types';

const KEY = '__premium';

/**
 * Local cache of the Premium unlock so features work offline and at start-up. The store stays
 * the source of truth and refreshes this on every launch.
 */
export function createEntitlementRepository(db: Db) {
  return {
    async load(): Promise<boolean> {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [KEY]);
      return row?.value === 'true';
    },
    async save(unlocked: boolean): Promise<void> {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [KEY, String(unlocked)],
      );
    },
  };
}

/** Free tier limit for the history list. */
export const FREE_HISTORY_LIMIT = 5;
