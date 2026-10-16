import * as Location from 'expo-location';

import type { Coordinates } from '@/features/parking/types';
import { isValidCoordinates } from '@/lib/geo';

export interface Fix extends Coordinates {
  accuracy: number | null;
  timestamp: number;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface LocationPermission {
  state: PermissionState;
  canAskAgain: boolean;
}

function toPermission(r: Location.LocationPermissionResponse): LocationPermission {
  return { state: r.status as PermissionState, canAskAgain: r.canAskAgain };
}

export async function getLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.getForegroundPermissionsAsync());
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.requestForegroundPermissionsAsync());
}

export async function locationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

export function toFix(o: Location.LocationObject): Fix | null {
  const fix = {
    latitude: o.coords.latitude,
    longitude: o.coords.longitude,
    accuracy: o.coords.accuracy ?? null,
    timestamp: o.timestamp,
  };
  return isValidCoordinates(fix) ? fix : null;
}

/**
 * A fresh, high-accuracy fix for saving the car. Times out rather than hanging forever
 * when the phone cannot get a signal (e.g. deep in a garage).
 */
export async function getCurrentFix(timeoutMs = 15_000): Promise<Fix | null> {
  const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }).then(toFix);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([fresh, timeout]);
}

/** Recent cached fix, good enough for centring the map instantly. */
export async function getLastKnownFix(): Promise<Fix | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    return last ? toFix(last) : null;
  } catch {
    return null;
  }
}

/**
 * Formats a human-readable address via the OS geocoder (Apple / Google). Returns null on any
 * failure — addresses are a nice-to-have and must never block the core flow.
 */
export async function reverseGeocode(c: Coordinates): Promise<string | null> {
  try {
    const [first] = await Location.reverseGeocodeAsync(c);
    if (!first) return null;
    const streetLine = [first.street, first.streetNumber].filter(Boolean).join(' ');
    const parts = [streetLine || first.name, first.city ?? first.district].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);
    return unique.length > 0 ? unique.join(', ') : (first.formattedAddress ?? null);
  } catch {
    return null;
  }
}
