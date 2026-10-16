import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const { colors, radius } = useTheme();
  const fg = selected ? colors.accent : colors.text;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <AppText variant="label" style={{ color: fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface ChipGroupProps<T> {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  scroll?: boolean;
}

export function ChipGroup<T extends string | number | null>({
  options,
  value,
  onChange,
  accessibilityLabel,
  scroll,
}: ChipGroupProps<T>) {
  const chips = options.map((o) => (
    <Chip key={String(o.value)} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />
  ));
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={styles.row}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.row, styles.wrap]}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
});
