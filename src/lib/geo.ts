import type { Coordinates } from '@/features/parking/types';

const EARTH_RADIUS_M = 6_371_000;

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const { latitude, longitude } = value as Record<string, unknown>;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres (haversine). Accurate to well under 1% at walking distances. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Accuracy (in metres) above which we tell the user their fix may be approximate. */
export const APPROXIMATE_ACCURACY_M = 35;

export function isApproximate(accuracy: number | null): boolean {
  return accuracy !== null && accuracy > APPROXIMATE_ACCURACY_M;
}

export interface Region extends Coordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Region that frames all given points with padding; falls back to a street-level zoom. */
export function regionForPoints(points: Coordinates[], minDelta = 0.004): Region | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(minDelta, (maxLon - minLon) * 1.6),
  };
}

/** Rough centre of Montenegro, used only to frame the map before any location is known. */
export const MONTENEGRO_REGION: Region = {
  latitude: 42.65,
  longitude: 19.3,
  latitudeDelta: 2.2,
  longitudeDelta: 2.2,
};
