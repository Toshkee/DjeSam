import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryRow } from '@/components/parking/HistoryRow';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBarScrim } from '@/components/ui/StatusBarScrim';
import { useToast } from '@/components/ui/Toast';
import { useHistory } from '@/features/parking/hooks';
import { clearHistory, deleteParking } from '@/features/parking/service';
import { FREE_HISTORY_LIMIT } from '@/features/premium/entitlement';
import { usePremium } from '@/features/premium/PremiumProvider';
import type { ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

function limitForFreePlan(items: ParkingSession[] | undefined): ParkingSession[] | undefined {
  if (!items) return items;
  let ended = 0;
  return items.filter((s) => s.endedAt === null || ++ended <= FREE_HISTORY_LIMIT);
}

export default function HistoryScreen() {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { items, total, error, loading, loadMore, reload } = useHistory();
  const { isPremium } = usePremium();
  // Free plan shows the active session plus the most recent ones; older history stays stored
  // and appears as soon as Premium is unlocked.
  const visible = isPremium ? items : limitForFreePlan(items);
  const hiddenCount = isPremium ? 0 : Math.max(0, total - (visible?.length ?? 0));
  const hasEnded = !!items?.some((s) => s.endedAt !== null);

  const open = useCallback(
    (s: ParkingSession) => router.push({ pathname: '/session/[id]', params: { id: s.id } }),
    [router],
  );

  const confirmDelete = useCallback(
    (s: ParkingSession) =>
      Alert.alert(t.details.deleteConfirmTitle, t.details.deleteConfirmBody, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: () =>
            deleteParking(s.id).then(
              () => toast(t.details.deleted, { icon: 'trash-outline', tone: 'info' }),
              () => Alert.alert(t.common.errorTitle, t.common.genericError),
            ),
        },
      ]),
    [t, toast],
  );

  const confirmClear = () =>
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

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md }]}>
      <View style={styles.flex}>
        <AppText variant="title" accessibilityRole="header">
          {t.history.title}
        </AppText>
        {total > 0 && (
          <AppText variant="label" tone="muted">
            {t.history.count(total)}
          </AppText>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        data={visible ?? []}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <HistoryRow session={item} onPress={open} onLongPress={confirmDelete} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.accent} />
          ) : error ? (
            <Banner tone="danger" body={t.history.loadFailed}>
              <Button label={t.common.retry} variant="secondary" onPress={reload} />
            </Banner>
          ) : (
            <EmptyState icon="time-outline" title={t.history.emptyTitle} body={t.history.emptyBody} />
          )
        }
        ListFooterComponent={
          <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
            {hiddenCount > 0 && (
              <Banner tone="warning" icon="lock-closed-outline" body={t.premium.historyLocked(hiddenCount)}>
                <Button label={t.premium.learnMore} variant="secondary" onPress={() => router.push('/premium')} />
              </Banner>
            )}
            {hasEnded && (
              <Button label={t.history.clearAll} icon="trash-outline" variant="danger" onPress={confirmClear} />
            )}
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        onEndReached={isPremium ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
      />
      <StatusBarScrim />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end' },
});
