import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.wrap, { padding: spacing.xxl, gap: spacing.md }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={28} color={colors.accentText} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="muted" align="center" style={styles.body}>
        {body}
      </AppText>
      {children && <View style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  body: { maxWidth: 320 },
});
