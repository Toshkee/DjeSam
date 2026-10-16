import type { Db } from '@/db/types';
import { clampTimerMinutes } from '@/features/timer/timer';

import { PARKING_TYPES, type ParkingType } from './types';

/** A user-defined preset such as "Zona 1 Podgorica – 1 h"; no tariffs are stored or assumed. */
export interface Zone {
  id: string;
  name: string;
  durationMinutes: number;
  parkingType: ParkingType | null;
  createdAt: number;
}

interface ZoneRow {
  id: string;
  name: string;
  duration_minutes: number;
  parking_type: string | null;
  created_at: number;
}

const fromRow = (r: ZoneRow): Zone => ({
  id: r.id,
  name: r.name,
  durationMinutes: r.duration_minutes,
  parkingType: (PARKING_TYPES as readonly string[]).includes(r.parking_type ?? '') ? (r.parking_type as ParkingType) : null,
  createdAt: r.created_at,
});

export function createZoneRepository(db: Db) {
  return {
    async list(): Promise<Zone[]> {
      const rows = await db.getAllAsync<ZoneRow>('SELECT * FROM zones ORDER BY created_at ASC');
      return rows.map(fromRow);
    },
    async getById(id: string): Promise<Zone | null> {
      const row = await db.getFirstAsync<ZoneRow>('SELECT * FROM zones WHERE id = ?', [id]);
      return row ? fromRow(row) : null;
    },
    async upsert(zone: Zone): Promise<void> {
      const name = zone.name.trim();
      if (!name) throw new Error('Zone name is required');
      await db.runAsync(
        `INSERT INTO zones (id, name, duration_minutes, parking_type, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, duration_minutes = excluded.duration_minutes,
           parking_type = excluded.parking_type`,
        [zone.id, name, clampTimerMinutes(zone.durationMinutes), zone.parkingType, zone.createdAt],
      );
    },
    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM zones WHERE id = ?', [id]);
    },
    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM zones');
    },
  };
}

export type ZoneRepository = ReturnType<typeof createZoneRepository>;
