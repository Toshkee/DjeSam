import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'warning' | 'danger' | 'success';

interface BannerProps {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  body: string;
  children?: ReactNode;
}

const defaultIcons: Record<Tone, IconName> = {
  info: 'information-circle',
  warning: 'warning',
  danger: 'alert-circle',
  success: 'checkmark-circle',
};

/** Inline notice for permission problems, approximate GPS, expiry warnings, etc. */
export function Banner({ tone = 'info', icon, title, body, children }: BannerProps) {
  const { colors, radius, spacing } = useTheme();
  const palette = {
    info: { bg: colors.accentSoft, fg: colors.accent },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
      style={[styles.box, { backgroundColor: palette.bg, borderRadius: radius.md, padding: spacing.md }]}
    >
      <View style={styles.header}>
        <Icon name={icon ?? defaultIcons[tone]} size={20} color={palette.fg} />
        <View style={styles.text}>
          {title && <AppText variant="bodyStrong">{title}</AppText>}
          <AppText variant={title ? 'label' : 'body'} tone="muted">
            {body}
          </AppText>
        </View>
      </View>
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
