import { MIGRATIONS, migrate } from '@/db/migrations';
import { createSettingsRepository, DEFAULT_SETTINGS, parseSettings } from '@/features/settings/settings';
import { createTestDb } from '@/test-utils/nodeDb';

import { createEntitlementRepository } from '@/features/premium/entitlement';

import { createParkingRepository } from './repository';
import { createZoneRepository } from './zones';
import type { ParkingSession } from './types';

const NOW = Date.UTC(2026, 9, 16, 10, 0, 0);

function session(overrides: Partial<ParkingSession> = {}): ParkingSession {
  return {
    id: 's1',
    latitude: 42.4411,
    longitude: 19.2636,
    accuracy: 8,
    locationSource: 'gps',
    address: null,
    parkedAt: NOW,
    endedAt: null,
    parkingType: 'garage',
    floor: '-2',
    section: 'B',
    spaceNumber: '47',
    note: 'Pored lifta',
    photoFile: 'p1.jpg',
    timerDurationMinutes: 60,
    timerExpiresAt: NOW + 3_600_000,
    feeCents: 150,
    currency: 'EUR',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function setup() {
  const db = createTestDb();
  await migrate(db);
  return { db, repo: createParkingRepository(db), settings: createSettingsRepository(db) };
}

describe('migrations', () => {
  it('migrates a fresh database and is idempotent', async () => {
    const db = createTestDb();
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });
});

describe('parking repository', () => {
  it('round-trips a session', async () => {
    const { repo } = await setup();
    await repo.insertActive(session());
    expect(await repo.getById('s1')).toEqual(session());
    expect((await repo.getActive())?.id).toBe('s1');
  });

  it('ends the previous active session when a new one is saved', async () => {
    const { repo } = await setup();
    await repo.insertActive(session());
    const later = NOW + 7_200_000;
    const { endedId } = await repo.insertActive(session({ id: 's2', parkedAt: later, createdAt: later, updatedAt: later }));
    expect(endedId).toBe('s1');
    expect((await repo.getById('s1'))?.endedAt).toBe(later);
    expect((await repo.getActive())?.id).toBe('s2');
  });

  it('enforces a single active session at the database level', async () => {
    const { db } = await setup();
    const insert = (id: string) =>
      db.runAsync(
        `INSERT INTO parking_sessions (id, latitude, longitude, parked_at, created_at, updated_at) VALUES (?, 42, 19, ?, ?, ?)`,
        [id, NOW, NOW, NOW],
      );
    await insert('a');
    await expect(insert('b')).rejects.toThrow(/UNIQUE/);
  });

  it('rejects invalid coordinates', async () => {
    const { repo } = await setup();
    await expect(repo.insertActive(session({ latitude: 120 }))).rejects.toThrow(/CHECK/);
  });

  it('updates fields and the updated timestamp', async () => {
    const { repo } = await setup();
    await repo.insertActive(session());
    await repo.update('s1', { note: null, floor: 'P1', endedAt: NOW + 1000 }, NOW + 5000);
    const s = await repo.getById('s1');
    expect(s).toMatchObject({ note: null, floor: 'P1', endedAt: NOW + 1000, updatedAt: NOW + 5000 });
  });

  it('lists active first, then newest', async () => {
    const { repo } = await setup();
    await repo.insertActive(session({ id: 'old', parkedAt: NOW - 1000 }));
    await repo.insertActive(session({ id: 'newer', parkedAt: NOW }));
    await repo.update('newer', { endedAt: NOW + 10 }, NOW + 10);
    await repo.insertActive(session({ id: 'active', parkedAt: NOW - 5000 }));
    expect((await repo.list(10)).map((s) => s.id)).toEqual(['active', 'newer', 'old']);
    expect((await repo.list(1, 1)).map((s) => s.id)).toEqual(['newer']);
    expect(await repo.count()).toBe(3);
  });

  it('returns photo files on delete and history clear, keeping the active session', async () => {
    const { repo } = await setup();
    await repo.insertActive(session({ id: 'a', photoFile: 'a.jpg' }));
    await repo.insertActive(session({ id: 'b', photoFile: null, parkedAt: NOW + 1 }));
    await repo.insertActive(session({ id: 'c', photoFile: 'c.jpg', parkedAt: NOW + 2 }));
    expect(await repo.remove('a')).toBe('a.jpg');
    expect(await repo.remove('missing')).toBeNull();
    expect(await repo.clearHistory()).toEqual([]);
    expect((await repo.list(10)).map((s) => s.id)).toEqual(['c']);
    expect(await repo.referencedPhotoFiles()).toEqual(new Set(['c.jpg']));
  });

  it('skips corrupt rows instead of crashing', async () => {
    const { db, repo } = await setup();
    await repo.insertActive(session());
    // Simulate a row written by a buggy build that bypassed the CHECK constraint.
    await db.execAsync('PRAGMA ignore_check_constraints = ON');
    await db.runAsync('UPDATE parking_sessions SET latitude = 500 WHERE id = ?', ['s1']);
    expect(await repo.getById('s1')).toBeNull();
    expect(await repo.list(10)).toEqual([]);
  });
});

describe('settings', () => {
  it('persists values and falls back to defaults for bad data', async () => {
    const { settings, db } = await setup();
    expect(await settings.load()).toEqual(DEFAULT_SETTINGS);
    await settings.set('theme', 'dark');
    await settings.set('warningLeadMinutes', 15);
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('notifyAtExpiry', 'not-json')");
    expect(await settings.load()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', warningLeadMinutes: 15 });
  });

  it('ignores out-of-range values', () => {
    expect(parseSettings([{ key: 'warningLeadMinutes', value: '7' }]).warningLeadMinutes).toBe(
      DEFAULT_SETTINGS.warningLeadMinutes,
    );
    expect(parseSettings([{ key: 'defaultTimerMinutes', value: '60' }]).defaultTimerMinutes).toBe(60);
    expect(parseSettings([{ key: 'mapStyle', value: '"hybrid"' }]).mapStyle).toBe('hybrid');
    expect(parseSettings([{ key: 'mapStyle', value: '"lunar"' }]).mapStyle).toBe('standard');
  });
});

describe('zones', () => {
  it('creates, updates, lists and removes zones', async () => {
    const db = createTestDb();
    await migrate(db);
    const zones = createZoneRepository(db);
    await zones.upsert({ id: 'z1', name: '  Zona 1  ', durationMinutes: 60, parkingType: 'street', createdAt: 1 });
    await zones.upsert({ id: 'z2', name: 'Budva centar', durationMinutes: 2, parkingType: null, createdAt: 2 });
    expect((await zones.list()).map((z) => [z.name, z.durationMinutes])).toEqual([
      ['Zona 1', 60],
      ['Budva centar', 5],
    ]);
    await zones.upsert({ id: 'z1', name: 'Zona 1 PG', durationMinutes: 120, parkingType: null, createdAt: 99 });
    expect(await zones.getById('z1')).toEqual({ id: 'z1', name: 'Zona 1 PG', durationMinutes: 120, parkingType: null, createdAt: 1 });
    await zones.remove('z2');
    expect(await zones.list()).toHaveLength(1);
    await expect(zones.upsert({ id: 'z3', name: '   ', durationMinutes: 30, parkingType: null, createdAt: 3 })).rejects.toThrow();
  });
});

describe('premium entitlement cache', () => {
  it('persists and survives clearing user settings', async () => {
    const { db, settings } = await setup();
    const entitlement = createEntitlementRepository(db);
    expect(await entitlement.load()).toBe(false);
    await entitlement.save(true);
    await settings.set('theme', 'dark');
    await settings.clear();
    expect(await entitlement.load()).toBe(true);
    expect((await settings.load()).theme).toBe('system');
  });
});
