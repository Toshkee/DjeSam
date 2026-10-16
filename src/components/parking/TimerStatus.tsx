import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useSettings } from '@/features/settings/SettingsProvider';
import { getTimerState, type TimerInfo } from '@/features/timer/timer';
import { useI18n } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme/ThemeProvider';

/** Countdown with a progress bar; turns amber inside the reminder window and red once expired. */
export function TimerStatus({ timer, compact }: { timer: TimerInfo; compact?: boolean }) {
  const { t, f } = useI18n();
  const { colors, radius } = useTheme();
  const { settings } = useSettings();
  const now = useNow(timer.timerExpiresAt ? 10_000 : 60_000);
  const state = getTimerState(timer, now, settings.warningLeadMinutes);

  if (state.status === 'none' || state.expiresAt === null) return null;

  // Traffic light: green while valid, amber inside the reminder window, red once expired.
  const tone = state.status === 'expired' ? 'danger' : state.status === 'warning' ? 'warning' : 'success';
  const color = { danger: colors.danger, warning: colors.warning, success: colors.success }[tone];
  const soft = { danger: colors.dangerSoft, warning: colors.warningSoft, success: colors.successSoft }[tone];

  const headline =
    state.status === 'expired'
      ? t.timer.expiredAgo(f.durationShort(-state.remainingMs))
      : t.timer.remaining(f.countdown(state.remainingMs));
  const sub =
    state.status === 'expired'
      ? t.timer.expired
      : state.status === 'warning'
        ? `${t.timer.expiringSoon} · ${t.timer.expiresAt(f.time(state.expiresAt))}`
        : t.timer.expiresAt(f.time(state.expiresAt));

  return (
    <View
      accessible
      accessibilityRole={state.status === 'running' ? 'text' : 'alert'}
      accessibilityLabel={`${headline}. ${sub}`}
      style={[styles.box, { backgroundColor: soft, borderRadius: radius.md, padding: compact ? 10 : 12 }]}
    >
      <View style={styles.row}>
        <Icon name={state.status === 'expired' ? 'alert-circle' : 'timer-outline'} size={20} color={color} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" style={{ color }} tabular>
            {headline}
          </AppText>
          <AppText variant="caption" tone="muted">
            {sub}
          </AppText>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.bar, { backgroundColor: color, width: `${Math.round(state.progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2 },
});
