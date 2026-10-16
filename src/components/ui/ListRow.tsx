import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText, type TextTone } from './AppText';
import { Icon, type IconName } from './Icon';

interface ListRowProps {
  label: string;
  value?: string | null;
  icon?: IconName;
  onPress?: () => void;
  trailing?: ReactNode;
  tone?: TextTone;
  valueTone?: TextTone;
  multilineValue?: boolean;
  accessibilityHint?: string;
}

/** Settings/detail row. Pressable only when `onPress` is set, so nothing looks tappable by accident. */
export function ListRow({
  label,
  value,
  icon,
  onPress,
  trailing,
  tone = 'default',
  valueTone = 'muted',
  multilineValue,
  accessibilityHint,
}: ListRowProps) {
  const { colors, spacing } = useTheme();
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
        },
        multilineValue && styles.stacked,
      ]}
    >
      <View style={styles.labelWrap}>
        {icon && <Icon name={icon} size={20} color={tone === 'danger' ? colors.danger : colors.textMuted} />}
        <AppText tone={tone} style={styles.flexShrink}>
          {label}
        </AppText>
      </View>
      {value ? (
        <AppText
          tone={valueTone}
          style={multilineValue ? undefined : styles.value}
          numberOfLines={multilineValue ? undefined : 1}
          selectable={!onPress}
        >
          {value}
        </AppText>
      ) : null}
      {trailing}
      {onPress && !trailing && <Icon name="chevron-forward" size={18} color={colors.textSubtle} />}
    </View>
  );

  if (!onPress) {
    // Rows with an interactive trailing control (e.g. a Switch) must not be grouped into one
    // accessibility element, or the control becomes unreachable for VoiceOver and taps.
    if (trailing) return content(false);
    return (
      <View accessible accessibilityLabel={value ? `${label}: ${value}` : label}>
        {content(false)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

export function ListGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {title && (
        <AppText variant="label" tone="muted" style={{ paddingHorizontal: spacing.lg, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {title}
        </AppText>
      )}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {Children.toArray(children)
          .filter(isValidElement)
          .map((child, index) => (
            <Fragment key={child.key ?? index}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border, marginLeft: spacing.lg }]} />}
              {child}
            </Fragment>
          ))}
      </View>
      {footer && (
        <AppText variant="caption" tone="subtle" style={{ paddingHorizontal: spacing.lg }}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, flexGrow: 1 },
  flexShrink: { flexShrink: 1 },
  value: { flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  separator: { height: StyleSheet.hairlineWidth },
});
