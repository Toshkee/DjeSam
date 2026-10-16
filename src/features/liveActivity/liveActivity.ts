import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { ParkingSession } from '@/features/parking/types';
import { getI18n } from '@/i18n';

import type { ParkingActivityProps } from './ParkingActivity';

type Factory = (typeof import('./ParkingActivity'))['default'];

let factory: Factory | null | undefined;

/**
 * Live Activities need the native widget extension, which only exists in iOS development or
 * store builds (not Expo Go, not Android). Loaded lazily so the rest of the app is unaffected.
 */
function getFactory(): Factory | null {
  if (factory !== undefined) return factory;
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    factory = null;
    return factory;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = (require('./ParkingActivity') as typeof import('./ParkingActivity')).default;
  } catch {
    factory = null;
  }
  return factory;
}

function placeOf(session: ParkingSession): string {
  const { t } = getI18n();
  const clues = [
    session.floor ? `${t.details.floor} ${session.floor}` : null,
    session.section ? `${t.details.section} ${session.section}` : null,
    session.spaceNumber ? `${t.details.space} ${session.spaceNumber}` : null,
  ].filter(Boolean);
  return [session.address, ...clues].filter(Boolean).join(' · ');
}

export function activityPropsFor(session: ParkingSession): ParkingActivityProps | null {
  if (session.timerExpiresAt === null || session.timerDurationMinutes === null) return null;
  const { t } = getI18n();
  return {
    startedAt: session.timerExpiresAt - session.timerDurationMinutes * 60_000,
    expiresAt: session.timerExpiresAt,
    title: t.liveActivity.title,
    place: placeOf(session),
    expiresLabel: t.liveActivity.expires,
  };
}

/**
 * Makes the Lock Screen countdown match the active session: started or updated while a paid
 * timer is running, ended otherwise. Best effort — failures never affect saving parking.
 */
export async function syncLiveActivity(active: ParkingSession | null, now = Date.now()): Promise<void> {
  const f = getFactory();
  if (!f) return;
  try {
    const props = active ? activityPropsFor(active) : null;
    const running = f.getInstances();
    if (!props || props.expiresAt <= now) {
      await Promise.all(running.map((a) => a.end('immediate')));
      return;
    }
    const [current, ...extra] = running;
    await Promise.all(extra.map((a) => a.end('immediate')));
    if (current) await current.update(props);
    else f.start(props, 'desam://');
  } catch {
    // Live Activities can be disabled by the user in Settings; reminders still work.
  }
}
