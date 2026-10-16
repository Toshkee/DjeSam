import {
  MAX_TIMER_MINUTES,
  clampTimerMinutes,
  computeExpiry,
  extendTimer,
  getTimerState,
  planReminders,
  reminderIdentifier,
} from './timer';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 16, 12, 0, 0);

describe('clampTimerMinutes / computeExpiry', () => {
  it('clamps to sane bounds', () => {
    expect(clampTimerMinutes(1)).toBe(5);
    expect(clampTimerMinutes(10_000)).toBe(MAX_TIMER_MINUTES);
    expect(clampTimerMinutes(Number.NaN)).toBe(5);
    expect(clampTimerMinutes(44.6)).toBe(45);
  });

  it('computes expiry from start', () => {
    expect(computeExpiry(NOW, 60)).toBe(NOW + 60 * MIN);
  });
});

describe('getTimerState', () => {
  const timer = { timerExpiresAt: NOW + 60 * MIN, timerDurationMinutes: 60 };

  it('reports none without a timer', () => {
    expect(getTimerState({ timerExpiresAt: null, timerDurationMinutes: null }, NOW, 10).status).toBe('none');
  });

  it('is running well before expiry', () => {
    const s = getTimerState(timer, NOW, 10);
    expect(s.status).toBe('running');
    expect(s.remainingMs).toBe(60 * MIN);
    expect(s.progress).toBe(0);
  });

  it('enters warning inside the lead window', () => {
    expect(getTimerState(timer, NOW + 50 * MIN, 10).status).toBe('warning');
    expect(getTimerState(timer, NOW + 49 * MIN, 10).status).toBe('running');
  });

  it('is expired at and after expiry', () => {
    expect(getTimerState(timer, NOW + 60 * MIN, 10).status).toBe('expired');
    const late = getTimerState(timer, NOW + 75 * MIN, 10);
    expect(late.status).toBe('expired');
    expect(late.remainingMs).toBe(-15 * MIN);
    expect(late.progress).toBe(1);
  });
});

describe('extendTimer', () => {
  it('adds to the current expiry while running', () => {
    const t = extendTimer({ timerExpiresAt: NOW + 20 * MIN, timerDurationMinutes: 60 }, 30, NOW);
    expect(t.timerExpiresAt).toBe(NOW + 50 * MIN);
    expect(t.timerDurationMinutes).toBe(90);
  });

  it('counts from now once expired', () => {
    const t = extendTimer({ timerExpiresAt: NOW - 10 * MIN, timerDurationMinutes: 60 }, 30, NOW);
    expect(t.timerExpiresAt).toBe(NOW + 30 * MIN);
    expect(t.timerDurationMinutes).toBe(100);
  });

  it('starts a timer when none exists', () => {
    const t = extendTimer({ timerExpiresAt: null, timerDurationMinutes: null }, 60, NOW);
    expect(t).toEqual({ timerExpiresAt: NOW + 60 * MIN, timerDurationMinutes: 60 });
  });

  it('never extends past the maximum from now', () => {
    const t = extendTimer({ timerExpiresAt: NOW + MAX_TIMER_MINUTES * MIN, timerDurationMinutes: MAX_TIMER_MINUTES }, 60, NOW);
    expect(t.timerExpiresAt).toBe(NOW + MAX_TIMER_MINUTES * MIN);
  });
});

describe('planReminders', () => {
  const prefs = { warningLeadMinutes: 10, notifyAtExpiry: true };

  it('plans a warning and an expiry reminder', () => {
    expect(planReminders(NOW + 60 * MIN, NOW, prefs)).toEqual([
      { kind: 'warning', fireAt: NOW + 50 * MIN, minutesLeft: 10 },
      { kind: 'expiry', fireAt: NOW + 60 * MIN, minutesLeft: 0 },
    ]);
  });

  it('skips the warning when already inside the lead window', () => {
    expect(planReminders(NOW + 8 * MIN, NOW, prefs).map((r) => r.kind)).toEqual(['expiry']);
  });

  it('respects the expiry preference', () => {
    expect(planReminders(NOW + 60 * MIN, NOW, { ...prefs, notifyAtExpiry: false }).map((r) => r.kind)).toEqual([
      'warning',
    ]);
  });

  it('plans nothing for expired or missing timers', () => {
    expect(planReminders(NOW - MIN, NOW, prefs)).toEqual([]);
    expect(planReminders(null, NOW, prefs)).toEqual([]);
  });

  it('uses deterministic identifiers per session', () => {
    expect(reminderIdentifier('abc', 'warning')).toBe('desam.parking.abc.warning');
  });
});
