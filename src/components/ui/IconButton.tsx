import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { touchTarget } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent';
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Round icon-only button; always has an accessibility label and a 44pt target. */
export function IconButton({ icon, label, onPress, tone = 'default', floating, style }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
        floating && [styles.floating, { shadowColor: colors.shadow }],
        style,
      ]}
    >
      <Icon name={icon} size={20} color={tone === 'accent' ? colors.accent : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  floating: {
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
