import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const FEATURES: { key: 'reminders' | 'photo' | 'history' | 'maps' | 'zones'; icon: IconName }[] = [
  { key: 'reminders', icon: 'notifications-outline' },
  { key: 'photo', icon: 'camera-outline' },
  { key: 'history', icon: 'time-outline' },
  { key: 'maps', icon: 'earth-outline' },
  { key: 'zones', icon: 'bookmark-outline' },
];

export default function PremiumScreen() {
  const { t } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { isPremium, storeAvailable, product, purchase, restore, setDevUnlocked } = usePremium();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const buy = async () => {
    setBusy('buy');
    try {
      if (setDevUnlocked) {
        await setDevUnlocked(true);
      } else {
        const outcome = await purchase();
        if (outcome === 'pending') return Alert.alert(t.premium.title, t.premium.pending);
        if (outcome === 'failed') return Alert.alert(t.common.errorTitle, t.premium.failed);
        if (outcome === 'cancelled') return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast(t.premium.purchased, { icon: 'star' });
      router.back();
    } finally {
      setBusy(null);
    }
  };

  const restorePurchase = async () => {
    setBusy('restore');
    try {
      if (await restore()) {
        toast(t.premium.restored, { icon: 'star' });
        router.back();
      } else {
        Alert.alert(t.premium.title, t.premium.nothingToRestore);
      }
    } catch {
      Alert.alert(t.common.errorTitle, t.premium.failed);
    } finally {
      setBusy(null);
    }
  };

  const canBuy = storeAvailable || !!setDevUnlocked;
  const buyLabel = setDevUnlocked
    ? t.premium.devUnlock
    : product
      ? t.premium.buy(product.displayPrice)
      : t.premium.buyFallback;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <IconButton icon="close" label={t.common.close} onPress={() => router.back()} style={[styles.close, { right: spacing.lg }]} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.xxxl + spacing.lg, gap: spacing.xl, alignItems: 'stretch' }}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/icon.png')}
            style={[styles.icon, { borderRadius: 22 }]}
            accessibilityIgnoresInvertColors
          />
          <AppText variant="title" align="center" accessibilityRole="header">
            {t.premium.title}
          </AppText>
          <AppText tone="muted" align="center">
            {isPremium ? t.premium.activeBody : t.premium.subtitle}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          {FEATURES.map(({ key, icon }) => (
            <View key={key} style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
                <Icon name={icon} size={20} color={colors.accentText} />
              </View>
              <AppText style={styles.flex}>{t.premium.features[key]}</AppText>
              <Icon name="checkmark-circle" size={20} color={isPremium ? colors.success : colors.textSubtle} />
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        style={[styles.footer, { padding: spacing.lg, gap: spacing.sm, borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        {isPremium ? (
          <View style={styles.activeRow}>
            <Icon name="star" size={20} color={colors.success} />
            <AppText variant="bodyStrong" tone="success">
              {t.premium.active}
            </AppText>
          </View>
        ) : (
          <>
            <Button label={buyLabel} icon="star" size="lg" loading={busy === 'buy'} disabled={!canBuy || busy !== null} onPress={buy} />
            {!canBuy && (
              <AppText variant="caption" tone="danger" align="center">
                {t.premium.unavailable}
              </AppText>
            )}
            <Button
              label={t.premium.restore}
              variant="ghost"
              haptic={false}
              loading={busy === 'restore'}
              disabled={!storeAvailable || busy !== null}
              onPress={restorePurchase}
            />
          </>
        )}
        <AppText variant="caption" tone="subtle" align="center">
          {t.premium.legal}
        </AppText>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  close: { position: 'absolute', top: 14, zIndex: 1 },
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 10, paddingTop: 8 },
  icon: { width: 88, height: 88 },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 6 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  featureIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46 },
});
