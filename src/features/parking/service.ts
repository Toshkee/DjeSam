import { getDb } from '@/db/client';
import { syncLiveActivity } from '@/features/liveActivity/liveActivity';
import { reverseGeocode } from '@/features/location/location';
import { cancelAllReminders, syncReminders } from '@/features/notifications/reminders';
import { deleteAllPhotos, deletePhoto, deletePhotos, removeOrphanedPhotos, storePhoto } from '@/features/photos/photoStorage';
import { createEntitlementRepository } from '@/features/premium/entitlement';
import { createSettingsRepository } from '@/features/settings/settings';
import { clampTimerMinutes, computeExpiry, extendTimer } from '@/features/timer/timer';
import { isValidCoordinates } from '@/lib/geo';
import { createId, singleFlight } from '@/lib/singleFlight';

import { createParkingRepository, type ParkingPatch } from './repository';
import { createZoneRepository, type Zone } from './zones';
import type { NewParkingInput, ParkingSession, ParkingUpdateInput } from './types';

/* ------------------------------------------------------------------ change feed */

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function subscribeParking(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getParkingVersion(): number {
  return version;
}
function notifyChanged() {
  version += 1;
  listeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ helpers */

export async function getRepositories() {
  const db = await getDb();
  return {
    parking: createParkingRepository(db),
    settings: createSettingsRepository(db),
    entitlement: createEntitlementRepository(db),
    zones: createZoneRepository(db),
  };
}

const clean = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export class InvalidLocationError extends Error {
  constructor() {
    super('Invalid coordinates');
    this.name = 'InvalidLocationError';
  }
}

/**
 * Reschedules reminders for whatever session is active now. Phone reminders are a Premium
 * feature; without it any scheduled ones are cancelled. Failures never break a save.
 */
export async function resyncReminders(): Promise<void> {
  try {
    const { parking, settings, entitlement } = await getRepositories();
    const [active, prefs, premium] = await Promise.all([parking.getActive(), settings.load(), entitlement.load()]);
    await syncReminders(premium ? active : null, prefs);
    await syncLiveActivity(premium ? active : null);
  } catch {
    // Notifications are best effort; the in-app timer still shows the correct state.
  }
}

async function fillAddressInBackground(id: string, coords: { latitude: number; longitude: number }) {
  try {
    const { parking, settings } = await getRepositories();
    if (!(await settings.load()).reverseGeocode) return;
    const address = await reverseGeocode(coords);
    if (!address) return;
    const current = await parking.getById(id);
    // Skip if the user moved the pin meanwhile; that edit triggers its own lookup.
    if (!current || current.latitude !== coords.latitude || current.longitude !== coords.longitude) return;
    await parking.update(id, { address }, Date.now());
    notifyChanged();
    // Refresh the Lock Screen activity so it shows the address.
    await resyncReminders();
  } catch {
    // Address is optional.
  }
}

/* ------------------------------------------------------------------ commands */

export interface SaveResult {
  session: ParkingSession;
  photoFailed: boolean;
}

/**
 * Saves a new active parking session. Wrapped in `singleFlight` so double taps produce exactly
 * one session; the database additionally enforces a single active session.
 */
export const saveParking = singleFlight(async (input: NewParkingInput): Promise<SaveResult> => {
  if (!isValidCoordinates(input.coordinates)) throw new InvalidLocationError();

  let photoFile: string | null = null;
  let photoFailed = false;
  if (input.photoSourceUri) {
    try {
      photoFile = await storePhoto(input.photoSourceUri);
    } catch {
      photoFailed = true;
    }
  }

  const now = Date.now();
  const minutes = input.timerMinutes === null ? null : clampTimerMinutes(input.timerMinutes);
  const session: ParkingSession = {
    id: createId(),
    latitude: input.coordinates.latitude,
    longitude: input.coordinates.longitude,
    accuracy: input.accuracy,
    locationSource: input.locationSource,
    address: null,
    parkedAt: now,
    endedAt: null,
    parkingType: input.parkingType,
    floor: clean(input.floor),
    section: clean(input.section),
    spaceNumber: clean(input.spaceNumber),
    note: clean(input.note),
    photoFile,
    timerDurationMinutes: minutes,
    timerExpiresAt: minutes === null ? null : computeExpiry(now, minutes),
    feeCents: input.feeCents,
    currency: 'EUR',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { parking } = await getRepositories();
    await parking.insertActive(session);
  } catch (error) {
    deletePhoto(photoFile);
    throw error;
  }

  notifyChanged();
  await resyncReminders();
  void fillAddressInBackground(session.id, input.coordinates);
  return { session, photoFailed };
});

export async function updateParking(id: string, input: ParkingUpdateInput): Promise<void> {
  if (!isValidCoordinates(input.coordinates)) throw new InvalidLocationError();
  const { parking } = await getRepositories();
  const existing = await parking.getById(id);
  if (!existing) throw new Error('Session not found');

  let newPhoto: string | null | undefined;
  if (input.photo.kind === 'replace') newPhoto = await storePhoto(input.photo.sourceUri);
  else if (input.photo.kind === 'remove') newPhoto = null;

  const moved =
    existing.latitude !== input.coordinates.latitude || existing.longitude !== input.coordinates.longitude;

  const patch: ParkingPatch = {
    latitude: input.coordinates.latitude,
    longitude: input.coordinates.longitude,
    accuracy: input.accuracy,
    locationSource: input.locationSource,
    parkingType: input.parkingType,
    floor: clean(input.floor),
    section: clean(input.section),
    spaceNumber: clean(input.spaceNumber),
    note: clean(input.note),
    feeCents: input.feeCents,
    ...(moved ? { address: null } : {}),
    ...(newPhoto !== undefined ? { photoFile: newPhoto } : {}),
  };

  try {
    await parking.update(id, patch, Date.now());
  } catch (error) {
    if (newPhoto) deletePhoto(newPhoto);
    throw error;
  }
  // Only remove the old photo once the database no longer points to it.
  if (newPhoto !== undefined && existing.photoFile && existing.photoFile !== newPhoto) {
    deletePhoto(existing.photoFile);
  }
  notifyChanged();
  await resyncReminders();
  if (moved) void fillAddressInBackground(id, input.coordinates);
}

export async function endParking(id: string): Promise<void> {
  const { parking } = await getRepositories();
  const now = Date.now();
  await parking.update(id, { endedAt: now }, now);
  notifyChanged();
  await resyncReminders();
}

export async function deleteParking(id: string): Promise<void> {
  const { parking } = await getRepositories();
  const photo = await parking.remove(id);
  deletePhoto(photo);
  notifyChanged();
  await resyncReminders();
}

/** Sets (or with `null`, removes) the timer, counting from now. */
export async function setParkingTimer(id: string, minutes: number | null): Promise<void> {
  const { parking } = await getRepositories();
  const now = Date.now();
  const patch: ParkingPatch =
    minutes === null
      ? { timerExpiresAt: null, timerDurationMinutes: null }
      : {
          timerExpiresAt: computeExpiry(now, minutes),
          timerDurationMinutes: clampTimerMinutes(minutes),
        };
  await parking.update(id, patch, now);
  notifyChanged();
  await resyncReminders();
}

export async function extendParkingTimer(id: string, addMinutes: number): Promise<void> {
  const { parking } = await getRepositories();
  const session = await parking.getById(id);
  if (!session) throw new Error('Session not found');
  const now = Date.now();
  await parking.update(id, extendTimer(session, addMinutes, now), now);
  notifyChanged();
  await resyncReminders();
}

export async function clearHistory(): Promise<void> {
  const { parking } = await getRepositories();
  deletePhotos(await parking.clearHistory());
  notifyChanged();
}

export async function deleteAllData(): Promise<void> {
  const { parking, settings, zones } = await getRepositories();
  await cancelAllReminders().catch(() => undefined);
  await parking.clearAll();
  await zones.clear();
  await settings.clear();
  deleteAllPhotos();
  notifyChanged();
}

/**
 * Start-up housekeeping: re-create reminders the OS may have dropped (reboot, app update,
 * changed preferences) and remove photo files left behind by interrupted operations.
 */
export async function reconcileOnLaunch(): Promise<void> {
  await resyncReminders();
  try {
    const { parking } = await getRepositories();
    removeOrphanedPhotos(await parking.referencedPhotoFiles());
  } catch {
    // Housekeeping only.
  }
}

/* ------------------------------------------------------------------ saved zones */

export async function saveZone(zone: Zone): Promise<void> {
  const { zones } = await getRepositories();
  await zones.upsert(zone);
  notifyChanged();
}

export async function deleteZone(id: string): Promise<void> {
  const { zones } = await getRepositories();
  await zones.remove(id);
  notifyChanged();
}
