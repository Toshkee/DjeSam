import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useI18n } from '@/i18n';

import { getNotificationPermission, requestNotificationPermission } from './reminders';

/**
 * Asks for notification permission only when the user actually starts a timer, with a short
 * explanation first. Resolves to whether reminders can be delivered; never blocks the save.
 */
export function useNotificationPermissionFlow() {
  const { t } = useI18n();

  return useCallback(async (): Promise<boolean> => {
    const state = await getNotificationPermission().catch(() => 'denied' as const);
    if (state === 'granted') return true;

    if (state === 'undetermined') {
      const proceed = await new Promise<boolean>((resolve) =>
        Alert.alert(t.permissions.notificationsRationaleTitle, t.permissions.notificationsRationaleBody, [
          { text: t.permissions.notNow, style: 'cancel', onPress: () => resolve(false) },
          { text: t.permissions.continue, onPress: () => resolve(true) },
        ]),
      );
      if (!proceed) return false;
      return (await requestNotificationPermission().catch(() => 'denied' as const)) === 'granted';
    }

    Alert.alert(t.permissions.notificationsRationaleTitle, t.permissions.notificationsDeniedBody, [
      { text: t.common.close, style: 'cancel' },
      { text: t.common.openSettings, onPress: () => Linking.openSettings() },
    ]);
    return false;
  }, [t]);
}
