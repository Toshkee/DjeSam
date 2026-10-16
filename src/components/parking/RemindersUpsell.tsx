import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/** Explains that the countdown is free while phone reminders need Premium. */
export function RemindersUpsell() {
  const { t } = useI18n();
  const { colors, radius } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.premium.learnMore}
      onPress={() => router.push('/premium')}
      style={({ pressed }) => [
        styles.box,
        { borderRadius: radius.md, backgroundColor: pressed ? colors.surfaceMuted : colors.warningSoft },
      ]}
    >
      <Icon name="notifications-off-outline" size={20} color={colors.warning} />
      <View style={styles.text}>
        <AppText variant="label">{t.premium.remindersLocked}</AppText>
        <AppText variant="label" tone="accent">
          {t.premium.learnMore}
        </AppText>
      </View>
      <PremiumBadge />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  text: { flex: 1, gap: 2 },
});
