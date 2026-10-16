import { directionsUrl, providersForPlatform } from '@/features/directions/urls';

import { distanceMeters, isApproximate, isValidCoordinates, regionForPoints } from './geo';
import { singleFlight } from './singleFlight';

describe('geo', () => {
  const podgorica = { latitude: 42.4411, longitude: 19.2636 };
  const budva = { latitude: 42.2911, longitude: 18.84 };

  it('validates coordinates', () => {
    expect(isValidCoordinates(podgorica)).toBe(true);
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(false);
    expect(isValidCoordinates(null)).toBe(false);
  });

  it('computes realistic distances', () => {
    expect(distanceMeters(podgorica, podgorica)).toBe(0);
    const d = distanceMeters(podgorica, budva);
    expect(d).toBeGreaterThan(37_000);
    expect(d).toBeLessThan(39_000);
  });

  it('flags approximate fixes', () => {
    expect(isApproximate(null)).toBe(false);
    expect(isApproximate(10)).toBe(false);
    expect(isApproximate(80)).toBe(true);
  });

  it('frames multiple points', () => {
    const r = regionForPoints([podgorica, budva])!;
    expect(r.latitude).toBeCloseTo((podgorica.latitude + budva.latitude) / 2);
    expect(r.latitudeDelta).toBeGreaterThan(podgorica.latitude - budva.latitude);
    expect(regionForPoints([])).toBeNull();
  });
});

describe('singleFlight', () => {
  it('shares one promise across concurrent calls', async () => {
    let calls = 0;
    let release!: () => void;
    const save = singleFlight(async () => {
      calls += 1;
      await new Promise<void>((r) => (release = r));
      return calls;
    });
    const a = save();
    const b = save();
    expect(save.isRunning()).toBe(true);
    release();
    await expect(Promise.all([a, b])).resolves.toEqual([1, 1]);
    expect(calls).toBe(1);
    expect(save.isRunning()).toBe(false);
  });

  it('allows a new call after failure', async () => {
    let n = 0;
    const op = singleFlight(async () => {
      n += 1;
      if (n === 1) throw new Error('boom');
      return n;
    });
    await expect(op()).rejects.toThrow('boom');
    await expect(op()).resolves.toBe(2);
  });
});

describe('directions', () => {
  const car = { latitude: 42.4411, longitude: 19.2636 };

  it('builds walking URLs with the real coordinates', () => {
    expect(directionsUrl('apple', car)).toBe('https://maps.apple.com/?daddr=42.441100,19.263600&dirflg=w');
    expect(directionsUrl('google-web', car)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=42.441100,19.263600&travelmode=walking',
    );
    expect(directionsUrl('google-app', car)).toContain('directionsmode=walking');
    expect(directionsUrl('android-geo', car, 'Auto')).toBe('geo:42.441100,19.263600?q=42.441100%2C19.263600(Auto)');
  });

  it('offers platform-appropriate providers', () => {
    expect(providersForPlatform('ios', false)).toEqual(['apple', 'google-web']);
    expect(providersForPlatform('ios', true)).toEqual(['apple', 'google-app']);
    expect(providersForPlatform('android', false)).toEqual(['google-web', 'android-geo']);
  });
});
