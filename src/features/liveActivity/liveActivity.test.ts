import type { ParkingSession } from '@/features/parking/types';

import { activityPropsFor } from './liveActivity';

const base: ParkingSession = {
  id: 's',
  latitude: 42.44,
  longitude: 19.26,
  accuracy: 5,
  locationSource: 'gps',
  address: 'Bulevar Stanka Dragojevića, Podgorica',
  parkedAt: 1_000_000,
  endedAt: null,
  parkingType: 'garage',
  floor: '-2',
  section: 'B',
  spaceNumber: null,
  note: null,
  photoFile: null,
  timerDurationMinutes: 90,
  timerExpiresAt: 1_000_000 + 90 * 60_000,
  feeCents: null,
  currency: 'EUR',
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
};

describe('activityPropsFor', () => {
  it('spans the paid duration and summarises where the car is', () => {
    expect(activityPropsFor(base)).toEqual({
      startedAt: 1_000_000,
      expiresAt: 1_000_000 + 90 * 60_000,
      title: 'Parking ističe za',
      place: 'Bulevar Stanka Dragojevića, Podgorica · Sprat -2 · Sekcija B',
      expiresLabel: 'Ističe u',
    });
  });

  it('includes extensions in the progress range', () => {
    // Extended by 30 min: duration grows with the expiry, so the bar keeps its true start.
    const extended = { ...base, timerDurationMinutes: 120, timerExpiresAt: base.timerExpiresAt! + 30 * 60_000 };
    expect(activityPropsFor(extended)?.startedAt).toBe(1_000_000);
  });

  it('returns null without a timer', () => {
    expect(activityPropsFor({ ...base, timerExpiresAt: null, timerDurationMinutes: null })).toBeNull();
  });
});
