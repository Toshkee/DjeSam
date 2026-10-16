import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusBarScrim } from '@/components/ui/StatusBarScrim';
import { useToast } from '@/components/ui/Toast';
import { requestLocationPermission } from '@/features/location/location';
import { requestNotificationPermission } from '@/features/notifications/reminders';
import { clearHistory, deleteAllData } from '@/features/parking/service';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { MapStyle, ThemePreference } from '@/features/settings/settings';
import { AVAILABLE_MAP_STYLES, useMapType } from '@/features/settings/useMapStyle';
import { usePremium } from '@/features/premium/PremiumProvider';
import { usePremiumGate } from '@/features/premium/usePremiumGate';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { usePermissionOverview, type PermissionSummary } from '@/features/settings/usePermissionOverview';
import { TIMER_PRESETS_MINUTES, WARNING_LEAD_OPTIONS_MINUTES } from '@/features/timer/timer';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const { t, f } = useI18n();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings, update } = useSettings();
  const { overview, refresh } = usePermissionOverview();
  const router = useRouter();
  const { isPremium, product, setDevUnlocked } = usePremium();
  const requirePremium = usePremiumGate();
  const mapType = useMapType();

  const statusLabel = (s: PermissionSummary | undefined) =>
    s === 'granted'
      ? t.settings.granted
      : s === 'denied'
        ? t.settings.denied
        : s === 'limited'
          ? t.settings.limited
          : t.settings.undetermined;
  const statusTone = (s: PermissionSummary | undefined) =>
    s === 'granted' ? ('success' as const) : s === 'denied' ? ('danger' as const) : ('muted' as const);

  /** Undetermined → ask in-app; otherwise the OS settings page is the only place to change it. */
  const permissionAction = (status: PermissionSummary | undefined, request: () => Promise<unknown>) => async () => {
    if (status === 'undetermined') {
      await request().catch(() => undefined);
      refresh();
    } else {
      Linking.openSettings();
    }
  };

  const confirmClearHistory = () =>
    Alert.alert(t.history.clearConfirmTitle, t.history.clearConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.history.clearConfirmAction,
        style: 'destructive',
        onPress: () =>
          clearHistory().then(
            () => toast(t.history.cleared, { icon: 'trash-outline', tone: 'info' }),
            () => Alert.alert(t.common.errorTitle, t.common.genericError),
          ),
      },
    ]);

  const confirmDeleteAll = () =>
    Alert.alert(t.settings.deleteAllConfirmTitle, t.settings.deleteAllConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.deleteAllAction,
        style: 'destructive',
        onPress: () =>
          deleteAllData().then(
            () => toast(t.settings.deletedAll, { icon: 'trash-outline', tone: 'info' }),
            () => Alert.alert(t.common.errorTitle, t.common.genericError),
          ),
      },
    ]);

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <View style={styles.fill}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.xxl,
        }}
      >
        <AppText variant="title" accessibilityRole="header">
          {t.settings.title}
        </AppText>

        <ListGroup>
          <ListRow
            icon="star-outline"
            label={t.premium.settingsRow}
            value={isPremium ? t.premium.active : (product?.displayPrice ?? null)}
            valueTone={isPremium ? 'success' : 'muted'}
            onPress={() => router.push('/premium')}
          />
          {setDevUnlocked && (
            <ListRow
              icon="construct-outline"
              label={t.premium.devToggle}
              trailing={
                <Switch
                  accessibilityLabel={t.premium.devToggle}
                  value={isPremium}
                  onValueChange={(v) => void setDevUnlocked(v)}
                  trackColor={{ true: colors.accent, false: colors.borderStrong }}
                />
              }
            />
          )}
        </ListGroup>

        <ListGroup title={t.settings.appearance}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <AppText variant="label" tone="muted">
              {t.settings.theme}
            </AppText>
            <SegmentedControl<ThemePreference>
              accessibilityLabel={t.settings.theme}
              value={settings.theme}
              onChange={(v) => update('theme', v)}
              options={[
                { value: 'system', label: t.settings.themeSystem },
                { value: 'light', label: t.settings.themeLight },
                { value: 'dark', label: t.settings.themeDark },
              ]}
            />
          </View>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <AppText variant="label" tone="muted">
              {t.map.mapStyle}
            </AppText>
            <SegmentedControl<MapStyle>
              accessibilityLabel={t.map.mapStyle}
              value={mapType as MapStyle}
              onChange={(v) => update('mapStyle', v)}
              options={AVAILABLE_MAP_STYLES.map((s) => ({ value: s, label: t.mapStylesShort[s] }))}
            />
          </View>
        </ListGroup>

        <ListGroup title={t.settings.reminders} footer={t.timer.disclaimer}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <AppText variant="label" tone="muted">
              {t.settings.warningLead}
            </AppText>
            <SegmentedControl<number>
              accessibilityLabel={t.settings.warningLead}
              value={settings.warningLeadMinutes}
              onChange={(v) => update('warningLeadMinutes', v)}
              options={WARNING_LEAD_OPTIONS_MINUTES.map((m) => ({ value: m, label: f.minutesLabel(m) }))}
            />
          </View>
          <ListRow
            label={t.settings.notifyAtExpiry}
            trailing={
              <Switch
                accessibilityLabel={t.settings.notifyAtExpiry}
                value={settings.notifyAtExpiry}
                onValueChange={(v) => update('notifyAtExpiry', v)}
                trackColor={{ true: colors.accent, false: colors.borderStrong }}
              />
            }
          />
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <AppText variant="label" tone="muted">
              {t.settings.defaultTimer}
            </AppText>
            <SegmentedControl<number>
              accessibilityLabel={t.settings.defaultTimer}
              value={settings.defaultTimerMinutes ?? 0}
              onChange={(v) => update('defaultTimerMinutes', v === 0 ? null : v)}
              options={[
                { value: 0, label: t.timer.none },
                ...TIMER_PRESETS_MINUTES.map((m) => ({ value: m, label: f.minutesLabel(m) })),
              ]}
            />
            <AppText variant="caption" tone="subtle">
              {t.settings.defaultTimerHint}
            </AppText>
          </View>
        </ListGroup>

        <ListGroup title={t.zones.title} footer={t.zones.hint}>
          <ListRow
            icon="bookmark-outline"
            label={t.zones.title}
            trailing={isPremium ? undefined : <PremiumBadge />}
            onPress={() => requirePremium() && router.push('/zones')}
          />
        </ListGroup>

        <ListGroup title={t.settings.permissions}>
          <ListRow
            icon="location-outline"
            label={t.settings.location}
            value={statusLabel(overview?.location)}
            valueTone={statusTone(overview?.location)}
            onPress={permissionAction(overview?.location, requestLocationPermission)}
          />
          <ListRow
            icon="notifications-outline"
            label={t.settings.notifications}
            value={statusLabel(overview?.notifications)}
            valueTone={statusTone(overview?.notifications)}
            onPress={permissionAction(overview?.notifications, requestNotificationPermission)}
          />
          <ListRow
            icon="camera-outline"
            label={t.settings.camera}
            value={statusLabel(overview?.camera)}
            valueTone={statusTone(overview?.camera)}
            onPress={permissionAction(overview?.camera, ImagePicker.requestCameraPermissionsAsync)}
          />
          <ListRow
            icon="images-outline"
            label={t.settings.photos}
            value={statusLabel(overview?.photos)}
            valueTone={statusTone(overview?.photos)}
            onPress={permissionAction(overview?.photos, () => ImagePicker.requestMediaLibraryPermissionsAsync())}
          />
        </ListGroup>

        <ListGroup title={t.settings.address} footer={t.settings.reverseGeocodeHint}>
          <ListRow
            label={t.settings.reverseGeocode}
            trailing={
              <Switch
                accessibilityLabel={t.settings.reverseGeocode}
                value={settings.reverseGeocode}
                onValueChange={(v) => update('reverseGeocode', v)}
                trackColor={{ true: colors.accent, false: colors.borderStrong }}
              />
            }
          />
        </ListGroup>

        <ListGroup title={t.settings.privacy}>
          <View style={{ padding: spacing.lg, flexDirection: 'row', gap: spacing.md }}>
            <AppText tone="muted" style={styles.flex}>
              {t.settings.privacyBody}
            </AppText>
          </View>
        </ListGroup>

        <ListGroup title={t.settings.data}>
          <ListRow icon="time-outline" label={t.settings.clearHistory} tone="danger" onPress={confirmClearHistory} />
          <ListRow icon="trash-outline" label={t.settings.deleteAll} tone="danger" onPress={confirmDeleteAll} />
        </ListGroup>

        <ListGroup title={t.settings.about}>
          <ListRow label={t.appName} value={`${t.settings.version} ${version}`} />
        </ListGroup>
      </ScrollView>
      <StatusBarScrim />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { flex: 1 },
});
