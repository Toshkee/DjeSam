import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimerPicker, timerChoiceFromMinutes, timerChoiceMinutes, type TimerChoice } from '@/components/parking/TimerPicker';
import { RemindersUpsell } from '@/components/parking/RemindersUpsell';
import { TimerStatus } from '@/components/parking/TimerStatus';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useNotificationPermissionFlow } from '@/features/notifications/useNotificationPermissionFlow';
import { useSession } from '@/features/parking/hooks';
import { extendParkingTimer, setParkingTimer } from '@/features/parking/service';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { EXTEND_PRESETS_MINUTES } from '@/features/timer/timer';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function TimerSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, f } = useI18n();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { settings } = useSettings();
  const { isPremium } = usePremium();
  const ensureNotifications = useNotificationPermissionFlow();
  const { data: session, loading } = useSession(id);
  const [choice, setChoice] = useState<TimerChoice>(() => timerChoiceFromMinutes(settings.defaultTimerMinutes ?? 60));
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, message: string, close = true) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast(message, { icon: 'timer-outline', tone: 'info' });
      if (close) router.back();
    } catch {
      Alert.alert(t.common.errorTitle, t.common.genericError);
    } finally {
      setBusy(false);
    }
  };

  if (!loading && !session) {
    return <EmptyState icon="help-circle-outline" title={t.common.errorTitle} body={t.details.notFound} />;
  }
  if (!session) return <View style={styles.placeholder} />;

  const hasTimer = session.timerExpiresAt !== null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
    >
      <AppText variant="title" accessibilityRole="header">
        {t.timer.title}
      </AppText>

      {hasTimer ? (
        <>
          <TimerStatus timer={session} />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">{t.timer.extend}</AppText>
            <View style={styles.row}>
              {EXTEND_PRESETS_MINUTES.map((m) => (
                <Button
                  key={m}
                  label={t.timer.extendBy(f.minutesLabel(m))}
                  variant="secondary"
                  style={styles.flex}
                  disabled={busy}
                  onPress={() => run(() => extendParkingTimer(session.id, m), t.timer.extendBy(f.minutesLabel(m)), false)}
                />
              ))}
            </View>
            <AppText variant="caption" tone="subtle">
              {t.timer.extendHint}
            </AppText>
          </View>
          <Button
            label={t.timer.stop}
            variant="danger"
            icon="stop-circle-outline"
            disabled={busy}
            onPress={() =>
              Alert.alert(t.timer.stopConfirmTitle, t.timer.stopConfirmBody, [
                { text: t.common.cancel, style: 'cancel' },
                {
                  text: t.timer.stop,
                  style: 'destructive',
                  onPress: () => run(() => setParkingTimer(session.id, null), t.timer.noTimer),
                },
              ])
            }
          />
        </>
      ) : (
        <>
          <TimerPicker value={choice} onChange={setChoice} allowNone={false} />
          <Button
            label={t.timer.start}
            icon="play"
            size="lg"
            loading={busy}
            onPress={() => {
              const minutes = timerChoiceMinutes(choice);
              if (minutes === null) return;
              void run(async () => {
                if (isPremium) await ensureNotifications();
                await setParkingTimer(session.id, minutes);
              }, t.timer.running);
            }}
          />
        </>
      )}
      {!isPremium && <RemindersUpsell />}
      <AppText variant="caption" tone="subtle">
        {t.timer.disclaimer}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  placeholder: { height: 240 },
});
