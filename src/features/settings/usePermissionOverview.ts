import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getLocationPermission } from '@/features/location/location';
import { getNotificationPermission } from '@/features/notifications/reminders';

export type PermissionSummary = 'granted' | 'denied' | 'undetermined' | 'limited';

export interface PermissionOverview {
  location: PermissionSummary;
  camera: PermissionSummary;
  photos: PermissionSummary;
  notifications: PermissionSummary;
}

const camera = async (): Promise<PermissionSummary> => {
  const p = await ImagePicker.getCameraPermissionsAsync();
  return p.status as PermissionSummary;
};

const photos = async (): Promise<PermissionSummary> => {
  const p = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (p.accessPrivileges === 'limited') return 'limited';
  return p.status as PermissionSummary;
};

/** Live view of every permission the app uses; refreshed on focus and on app resume. */
export function usePermissionOverview() {
  const [overview, setOverview] = useState<PermissionOverview | null>(null);

  const refresh = useCallback(async () => {
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    const [location, cam, lib, notifications] = await Promise.all([
      safe(getLocationPermission().then((p) => p.state as PermissionSummary), 'undetermined'),
      safe(camera(), 'undetermined'),
      safe(photos(), 'undetermined'),
      safe(getNotificationPermission(), 'undetermined'),
    ]);
    setOverview({ location, camera: cam, photos: lib, notifications });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return { overview, refresh };
}
