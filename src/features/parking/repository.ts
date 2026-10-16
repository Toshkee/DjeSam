import type { Db, SqlValue } from '@/db/types';
import { isValidCoordinates } from '@/lib/geo';

import { PARKING_TYPES, type ParkingSession, type ParkingType } from './types';

interface ParkingRow {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  location_source: string;
  address: string | null;
  parked_at: number;
  ended_at: number | null;
  parking_type: string | null;
  floor: string | null;
  section: string | null;
  space_number: string | null;
  note: string | null;
  photo_file: string | null;
  timer_duration_minutes: number | null;
  timer_expires_at: number | null;
  fee_cents: number | null;
  currency: string;
  created_at: number;
  updated_at: number;
}

const COLUMNS: Record<keyof ParkingSession, keyof ParkingRow> = {
  id: 'id',
  latitude: 'latitude',
  longitude: 'longitude',
  accuracy: 'accuracy',
  locationSource: 'location_source',
  address: 'address',
  parkedAt: 'parked_at',
  endedAt: 'ended_at',
  parkingType: 'parking_type',
  floor: 'floor',
  section: 'section',
  spaceNumber: 'space_number',
  note: 'note',
  photoFile: 'photo_file',
  timerDurationMinutes: 'timer_duration_minutes',
  timerExpiresAt: 'timer_expires_at',
  feeCents: 'fee_cents',
  currency: 'currency',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const isParkingType = (v: string | null): v is ParkingType =>
  v !== null && (PARKING_TYPES as readonly string[]).includes(v);

/** Converts a row into a domain object, discarding rows that cannot be trusted. */
function fromRow(row: ParkingRow): ParkingSession | null {
  if (!isValidCoordinates({ latitude: row.latitude, longitude: row.longitude })) return null;
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    locationSource: row.location_source === 'manual' ? 'manual' : 'gps',
    address: row.address,
    parkedAt: row.parked_at,
    endedAt: row.ended_at,
    parkingType: isParkingType(row.parking_type) ? row.parking_type : null,
    floor: row.floor,
    section: row.section,
    spaceNumber: row.space_number,
    note: row.note,
    photoFile: row.photo_file,
    timerDurationMinutes: row.timer_duration_minutes,
    timerExpiresAt: row.timer_expires_at,
    feeCents: row.fee_cents,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const compact = (rows: ParkingRow[]) =>
  rows.map(fromRow).filter((s): s is ParkingSession => s !== null);

export type ParkingPatch = Partial<Omit<ParkingSession, 'id' | 'createdAt'>>;

export function createParkingRepository(db: Db) {
  async function getById(id: string): Promise<ParkingSession | null> {
    const row = await db.getFirstAsync<ParkingRow>('SELECT * FROM parking_sessions WHERE id = ?', [id]);
    return row ? fromRow(row) : null;
  }

  async function getActive(): Promise<ParkingSession | null> {
    const row = await db.getFirstAsync<ParkingRow>(
      'SELECT * FROM parking_sessions WHERE ended_at IS NULL ORDER BY parked_at DESC LIMIT 1',
    );
    return row ? fromRow(row) : null;
  }

  /** Newest first. Paged so long histories never load in one go. */
  async function list(limit: number, offset = 0): Promise<ParkingSession[]> {
    const rows = await db.getAllAsync<ParkingRow>(
      'SELECT * FROM parking_sessions ORDER BY (ended_at IS NULL) DESC, parked_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return compact(rows);
  }

  async function count(): Promise<number> {
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM parking_sessions');
    return row?.n ?? 0;
  }

  /**
   * Inserts a new active session. Any currently active session is ended first, in the same
   * transaction, so the "single active session" invariant always holds.
   */
  async function insertActive(session: ParkingSession): Promise<{ endedId: string | null }> {
    let endedId: string | null = null;
    await db.withTransactionAsync(async () => {
      const active = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM parking_sessions WHERE ended_at IS NULL LIMIT 1',
      );
      if (active) {
        endedId = active.id;
        await db.runAsync('UPDATE parking_sessions SET ended_at = ?, updated_at = ? WHERE id = ?', [
          session.parkedAt,
          session.parkedAt,
          active.id,
        ]);
      }
      const keys = Object.keys(COLUMNS) as (keyof ParkingSession)[];
      const columns = keys.map((k) => COLUMNS[k]).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      await db.runAsync(
        `INSERT INTO parking_sessions (${columns}) VALUES (${placeholders})`,
        keys.map((k) => session[k] as SqlValue),
      );
    });
    return { endedId };
  }

  async function update(id: string, patch: ParkingPatch, now: number): Promise<void> {
    const entries = Object.entries({ ...patch, updatedAt: now }).filter(
      ([, v]) => v !== undefined,
    ) as [keyof ParkingSession, SqlValue][];
    if (entries.length === 0) return;
    const assignments = entries.map(([k]) => `${COLUMNS[k]} = ?`).join(', ');
    await db.runAsync(`UPDATE parking_sessions SET ${assignments} WHERE id = ?`, [
      ...entries.map(([, v]) => v),
      id,
    ]);
  }

  /** Returns the removed session's photo file so the caller can clean it up. */
  async function remove(id: string): Promise<string | null> {
    const row = await db.getFirstAsync<{ photo_file: string | null }>(
      'SELECT photo_file FROM parking_sessions WHERE id = ?',
      [id],
    );
    await db.runAsync('DELETE FROM parking_sessions WHERE id = ?', [id]);
    return row?.photo_file ?? null;
  }

  /** Deletes every ended session; the active one is kept. Returns their photo files. */
  async function clearHistory(): Promise<string[]> {
    let files: string[] = [];
    await db.withTransactionAsync(async () => {
      const rows = await db.getAllAsync<{ photo_file: string }>(
        'SELECT photo_file FROM parking_sessions WHERE ended_at IS NOT NULL AND photo_file IS NOT NULL',
      );
      files = rows.map((r) => r.photo_file);
      await db.runAsync('DELETE FROM parking_sessions WHERE ended_at IS NOT NULL');
    });
    return files;
  }

  async function clearAll(): Promise<void> {
    await db.runAsync('DELETE FROM parking_sessions');
  }

  async function referencedPhotoFiles(): Promise<Set<string>> {
    const rows = await db.getAllAsync<{ photo_file: string }>(
      'SELECT photo_file FROM parking_sessions WHERE photo_file IS NOT NULL',
    );
    return new Set(rows.map((r) => r.photo_file));
  }

  return {
    getById,
    getActive,
    list,
    count,
    insertActive,
    update,
    remove,
    clearHistory,
    clearAll,
    referencedPhotoFiles,
  };
}

export type ParkingRepository = ReturnType<typeof createParkingRepository>;
