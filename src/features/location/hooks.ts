import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getLastKnownFix,
  getLocationPermission,
  locationServicesEnabled,
  requestLocationPermission,
  toFix,
  type Fix,
  type LocationPermission,
} from './location';

export interface LocationStatus {
  permission: LocationPermission | null;
  servicesEnabled: boolean | null;
}

async function readStatus(): Promise<{ permission: LocationPermission; servicesEnabled: boolean }> {
  const [permission, servicesEnabled] = await Promise.all([getLocationPermission(), locationServicesEnabled()]);
  return { permission, servicesEnabled };
}

/**
 * Tracks permission and location-services state, re-checking whenever the app returns to the
 * foreground so changes made in system settings are picked up immediately.
 */
export function useLocationStatus() {
  const [status, setStatus] = useState<LocationStatus>({ permission: null, servicesEnabled: null });

  const refresh = useCallback(
    () =>
      readStatus().then((next) => {
        setStatus(next);
        return next.permission;
      }),
    [],
  );

  const request = useCallback(async () => {
    const permission = await requestLocationPermission();
    const servicesEnabled = await locationServicesEnabled();
    setStatus({ permission, servicesEnabled });
    return permission;
  }, []);

  useEffect(() => {
    readStatus().then(setStatus, () => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  return { ...status, refresh, request };
}

/**
 * Live user position while the screen is focused. The subscription is removed on blur and
 * unmount so GPS is never kept on in the background.
 */
export function useLiveLocation(enabled: boolean): Fix | null {
  const [fix, setFix] = useState<Fix | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      let cancelled = false;
      let subscription: Location.LocationSubscription | null = null;

      getLastKnownFix().then((last) => {
        if (!cancelled && last) setFix((current) => current ?? last);
      });

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        (update) => {
          const next = toFix(update);
          if (next) setFix(next);
        },
      )
        .then((sub) => {
          if (cancelled) sub.remove();
          else subscription = sub;
        })
        .catch(() => undefined);

      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, [enabled]),
  );

  return fix;
}
