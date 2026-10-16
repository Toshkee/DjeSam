import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import type { MapStyle } from '@/features/settings/settings';
import { useSettings } from '@/features/settings/SettingsProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { usePremiumGate } from '@/features/premium/usePremiumGate';
import { AVAILABLE_MAP_STYLES, isPremiumMapStyle, useMapType } from '@/features/settings/useMapStyle';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<MapStyle, IconName> = {
  standard: 'map-outline',
  satellite: 'earth-outline',
  hybrid: 'layers-outline',
  terrain: 'trail-sign-outline',
};

interface Props {
  style?: StyleProp<ViewStyle>;
}

/** Floating "layers" button that switches between standard, satellite, hybrid and terrain maps. */
export function MapStyleButton({ style }: Props) {
  const { t } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const { update } = useSettings();
  const { isPremium } = usePremium();
  const requirePremium = usePremiumGate();
  const current = useMapType();
  const { width } = useWindowDimensions();
  const anchor = useRef<View>(null);
  // Menu opens right below the button, wherever the button is on screen.
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const open = menuPosition !== null;
  const setOpen = (value: boolean) => {
    if (!value) return setMenuPosition(null);
    anchor.current?.measureInWindow((x, y, w, h) =>
      setMenuPosition({ top: y + h + 8, right: Math.max(spacing.sm, width - (x + w)) }),
    );
  };

  const choose = (value: MapStyle) => {
    setOpen(false);
    if (isPremiumMapStyle(value) && !requirePremium()) return;
    Haptics.selectionAsync().catch(() => undefined);
    void update('mapStyle', value);
  };

  return (
    <>
      <View ref={anchor} collapsable={false} style={style}>
        <IconButton icon="layers-outline" label={t.map.mapStyle} onPress={() => setOpen(true)} floating />
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t.common.close}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t.map.mapStyle}
            style={[
              styles.menu,
              {
                top: menuPosition?.top ?? 0,
                right: menuPosition?.right ?? spacing.lg,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radius.lg,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <AppText variant="label" tone="muted" style={styles.title}>
              {t.map.mapStyle}
            </AppText>
            {AVAILABLE_MAP_STYLES.map((value) => {
              const selected = current === value;
              const locked = isPremiumMapStyle(value) && !isPremium;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => choose(value)}
                  style={({ pressed }) => [
                    styles.option,
                    { borderRadius: radius.md, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
                  ]}
                >
                  <Icon name={ICONS[value]} size={20} color={selected ? colors.accentText : colors.textMuted} />
                  <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'accent' : 'default'} style={styles.flex}>
                    {t.mapStyles[value]}
                  </AppText>
                  {selected && <Icon name="checkmark" size={18} color={colors.accentText} />}
                  {locked && <Icon name="lock-closed" size={16} color={colors.warning} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    width: 230,
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  flex: { flex: 1 },
});
