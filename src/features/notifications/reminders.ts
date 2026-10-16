import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { getI18n } from '@/i18n';
import type { ParkingSession } from '@/features/parking/types';
import {
  REMINDER_ID_PREFIX,
  planReminders,
  reminderIdentifier,
  type ReminderPreferences,
} from '@/features/timer/timer';

export const REMINDER_CHANNEL_ID = 'parking-reminders';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

let configured = false;

/** Foreground presentation + Android channel. Safe to call more than once. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: getI18n().t.notifications.channelName,
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
}

function toState(p: Notifications.NotificationPermissionsStatus): NotificationPermissionState {
  if (p.granted) return 'granted';
  if (
    Platform.OS === 'ios' &&
    (p.ios?.status === IosAuthorizationStatus.PROVISIONAL ||
      p.ios?.status === IosAuthorizationStatus.EPHEMERAL)
  ) {
    return 'granted';
  }
  return p.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await configureNotifications();
  return toState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

async function cancelOurReminders(keep: Set<string> = new Set()): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((r) => r.identifier.startsWith(REMINDER_ID_PREFIX) && !keep.has(r.identifier))
      .map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)),
  );
}

/**
 * Makes the OS-scheduled reminders match the given active session exactly: stale reminders
 * (other sessions, old expiry times) are cancelled and the planned ones (re)scheduled.
 * Deterministic identifiers make this idempotent, so it doubles as start-up reconciliation.
 */
export async function syncReminders(
  active: ParkingSession | null,
  prefs: ReminderPreferences,
  now = Date.now(),
): Promise<void> {
  await cancelOurReminders();
  if (!active || active.timerExpiresAt === null) return;
  if ((await getNotificationPermission()) !== 'granted') return;

  await configureNotifications();
  const { t, f } = getI18n();
  const expiresAt = active.timerExpiresAt;
  for (const reminder of planReminders(expiresAt, now, prefs)) {
    const content: Notifications.NotificationContentInput =
      reminder.kind === 'warning'
        ? {
            title: t.notifications.warningTitle,
            body: t.notifications.warningBody(f.durationLong(reminder.minutesLeft * 60_000), f.time(expiresAt)),
          }
        : {
            title: t.notifications.expiredTitle,
            body: t.notifications.expiredBody(f.time(expiresAt)),
          };
    await Notifications.scheduleNotificationAsync({
      identifier: reminderIdentifier(active.id, reminder.kind),
      content: { ...content, sound: true, data: { sessionId: active.id, kind: reminder.kind } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await cancelOurReminders();
}
