export const PARKING_TYPES = ['street', 'garage', 'lot', 'private', 'other'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export type LocationSource = 'gps' | 'manual';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ParkingSession {
  id: string;
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres reported by the OS, null when unknown or manually placed. */
  accuracy: number | null;
  locationSource: LocationSource;
  address: string | null;
  parkedAt: number;
  endedAt: number | null;
  parkingType: ParkingType | null;
  floor: string | null;
  section: string | null;
  spaceNumber: string | null;
  note: string | null;
  /** File name inside the app's photo directory (never an absolute path: containers move on iOS). */
  photoFile: string | null;
  /** Planned paid duration in minutes, including extensions. */
  timerDurationMinutes: number | null;
  timerExpiresAt: number | null;
  feeCents: number | null;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

/** Fields the user can fill in when saving or editing a session. */
export interface ParkingDetailsInput {
  parkingType: ParkingType | null;
  floor: string | null;
  section: string | null;
  spaceNumber: string | null;
  note: string | null;
  feeCents: number | null;
}

export interface NewParkingInput extends ParkingDetailsInput {
  coordinates: Coordinates;
  accuracy: number | null;
  locationSource: LocationSource;
  /** Temporary URI from the camera/picker; copied into app storage on save. */
  photoSourceUri: string | null;
  timerMinutes: number | null;
}

export type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'replace'; sourceUri: string };

export interface ParkingUpdateInput extends ParkingDetailsInput {
  coordinates: Coordinates;
  accuracy: number | null;
  locationSource: LocationSource;
  photo: PhotoChange;
}

export function isActive(session: Pick<ParkingSession, 'endedAt'>): boolean {
  return session.endedAt === null;
}
