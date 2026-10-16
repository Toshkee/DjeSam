import type { Db } from './types';

/**
 * Ordered schema migrations. Never edit a shipped migration — append a new one.
 * The index + 1 is stored in `PRAGMA user_version`.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS parking_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    accuracy REAL,
    location_source TEXT NOT NULL DEFAULT 'gps' CHECK (location_source IN ('gps', 'manual')),
    address TEXT,
    parked_at INTEGER NOT NULL,
    ended_at INTEGER,
    parking_type TEXT CHECK (parking_type IN ('street', 'garage', 'lot', 'private', 'other')),
    floor TEXT,
    section TEXT,
    space_number TEXT,
    note TEXT,
    photo_file TEXT,
    timer_duration_minutes INTEGER,
    timer_expires_at INTEGER,
    fee_cents INTEGER CHECK (fee_cents IS NULL OR fee_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_parking_sessions_parked_at ON parking_sessions (parked_at DESC);
  -- At most one active (not ended) session at any time: guards against duplicate saves.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_sessions_single_active
    ON parking_sessions ((ended_at IS NULL)) WHERE ended_at IS NULL;
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    parking_type TEXT CHECK (parking_type IN ('street', 'garage', 'lot', 'private', 'other')),
    created_at INTEGER NOT NULL
  );
  `,
];

export async function migrate(db: Db): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version]!;
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      // PRAGMA does not accept bound parameters; `next` is an internal integer.
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
