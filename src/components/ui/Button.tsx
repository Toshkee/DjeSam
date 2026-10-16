import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  haptic?: boolean;
}

function colorsFor(c: Palette, variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case 'primary':
      return { bg: pressed ? c.accentPressed : c.accent, fg: c.textOnAccent, border: 'transparent' };
    case 'secondary':
      return { bg: pressed ? c.surfaceMuted : c.surface, fg: c.text, border: c.border };
    case 'ghost':
      return { bg: pressed ? c.surfaceMuted : 'transparent', fg: c.accentText, border: 'transparent' };
    case 'danger':
      return { bg: pressed ? c.dangerSoft : 'transparent', fg: c.danger, border: c.border };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  size = 'md',
  style,
  accessibilityHint,
  haptic = variant === 'primary',
}: ButtonProps) {
  const { colors, radius } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => {
        const v = colorsFor(colors, variant, pressed);
        return [
          styles.base,
          {
            minHeight: size === 'lg' ? 54 : 46,
            borderRadius: radius.md,
            backgroundColor: v.bg,
            borderColor: v.border,
            opacity: inactive && !loading ? 0.45 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const v = colorsFor(colors, variant, pressed);
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={v.fg} />
            ) : (
              icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} color={v.fg} />
            )}
            <AppText variant="bodyStrong" style={{ color: v.fg }} numberOfLines={1}>
              {label}
            </AppText>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
