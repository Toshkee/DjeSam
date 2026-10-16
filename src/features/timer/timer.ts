const MINUTE = 60_000;

export const TIMER_PRESETS_MINUTES = [30, 60, 120] as const;
export const EXTEND_PRESETS_MINUTES = [15, 30, 60] as const;
export const WARNING_LEAD_OPTIONS_MINUTES = [5, 10, 15, 30] as const;

export const MIN_TIMER_MINUTES = 5;
/** 24 h; longer stays are better tracked without a countdown. */
export const MAX_TIMER_MINUTES = 24 * 60;
export const CUSTOM_STEP_MINUTES = 15;

export type TimerStatus = 'none' | 'running' | 'warning' | 'expired';

export interface TimerInfo {
  timerExpiresAt: number | null;
  timerDurationMinutes: number | null;
}

export interface TimerState {
  status: TimerStatus;
  /** Milliseconds until expiry; negative once expired; 0 when there is no timer. */
  remainingMs: number;
  /** 0 → just started, 1 → expired. */
  progress: number;
  expiresAt: number | null;
}

export function clampTimerMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_TIMER_MINUTES;
  return Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, Math.round(minutes)));
}

export function computeExpiry(startMs: number, minutes: number): number {
  return startMs + clampTimerMinutes(minutes) * MINUTE;
}

/**
 * Status of a parking timer at `now`. The "warning" window uses the user's reminder lead time
 * so the in-app colour change matches the notification.
 */
export function getTimerState(timer: TimerInfo, now: number, warningLeadMinutes: number): TimerState {
  const { timerExpiresAt, timerDurationMinutes } = timer;
  if (timerExpiresAt === null) {
    return { status: 'none', remainingMs: 0, progress: 0, expiresAt: null };
  }
  const remainingMs = timerExpiresAt - now;
  const totalMs = Math.max(MINUTE, (timerDurationMinutes ?? 0) * MINUTE);
  const progress = Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  let status: TimerStatus = 'running';
  if (remainingMs <= 0) status = 'expired';
  else if (remainingMs <= warningLeadMinutes * MINUTE) status = 'warning';
  return { status, remainingMs, progress, expiresAt: timerExpiresAt };
}

/**
 * Extending an already expired timer counts from now (the user just paid again),
 * otherwise the extra time is added to the current expiry.
 */
export function extendTimer(timer: TimerInfo, addMinutes: number, now: number): TimerInfo {
  const add = Math.max(1, Math.round(addMinutes));
  if (timer.timerExpiresAt === null) {
    const minutes = clampTimerMinutes(add);
    return { timerExpiresAt: now + minutes * MINUTE, timerDurationMinutes: minutes };
  }
  const base = Math.max(timer.timerExpiresAt, now);
  const newExpiry = Math.min(base + add * MINUTE, now + MAX_TIMER_MINUTES * MINUTE);
  const addedMinutes = Math.round((newExpiry - timer.timerExpiresAt) / MINUTE);
  return {
    timerExpiresAt: newExpiry,
    timerDurationMinutes: (timer.timerDurationMinutes ?? 0) + addedMinutes,
  };
}

export type ReminderKind = 'warning' | 'expiry';

export interface PlannedReminder {
  kind: ReminderKind;
  fireAt: number;
  /** Minutes left when the reminder fires (for the notification text). */
  minutesLeft: number;
}

export interface ReminderPreferences {
  warningLeadMinutes: number;
  notifyAtExpiry: boolean;
}

/** Reminders closer than this are skipped: the OS may drop or instantly fire them. */
const MIN_SCHEDULE_AHEAD_MS = 5_000;

/**
 * Which local notifications should exist for a timer. Pure so it can be unit tested and
 * reused for both scheduling and start-up reconciliation.
 */
export function planReminders(
  expiresAt: number | null,
  now: number,
  prefs: ReminderPreferences,
): PlannedReminder[] {
  if (expiresAt === null) return [];
  const reminders: PlannedReminder[] = [];
  const warningAt = expiresAt - prefs.warningLeadMinutes * MINUTE;
  if (prefs.warningLeadMinutes > 0 && warningAt - now > MIN_SCHEDULE_AHEAD_MS) {
    reminders.push({ kind: 'warning', fireAt: warningAt, minutesLeft: prefs.warningLeadMinutes });
  }
  if (prefs.notifyAtExpiry && expiresAt - now > MIN_SCHEDULE_AHEAD_MS) {
    reminders.push({ kind: 'expiry', fireAt: expiresAt, minutesLeft: 0 });
  }
  return reminders;
}

export function reminderIdentifier(sessionId: string, kind: ReminderKind): string {
  return `desam.parking.${sessionId}.${kind}`;
}

export const REMINDER_ID_PREFIX = 'desam.parking.';
