import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/** Opaque strip behind the status bar so scrolled content never collides with the clock. */
export function StatusBarScrim() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return <View pointerEvents="none" style={[styles.scrim, { height: insets.top, backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.96 },
});
