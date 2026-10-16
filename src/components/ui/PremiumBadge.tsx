import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Small "Premium" lock tag shown next to features that need the unlock. */
export function PremiumBadge({ label }: { label?: string }) {
  const { t } = useI18n();
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.warningSoft, borderRadius: radius.pill }]}>
      <Icon name="lock-closed" size={11} color={colors.warning} />
      <AppText variant="caption" tone="warning" style={styles.text}>
        {label ?? t.premium.locked}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontWeight: '600' },
});
