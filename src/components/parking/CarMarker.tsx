import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Icon } from '@/components/ui/Icon';
import type { Coordinates } from '@/features/parking/types';
import { useTheme } from '@/theme/ThemeProvider';

/** Visual pin; also reused as the fixed centre pin of the location picker. */
export function CarPin({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View
        style={[
          styles.head,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.marker,
            borderColor: colors.markerRing,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Icon name="car" size={size * 0.5} color="#FFFFFF" />
      </View>
      <View style={[styles.stem, { backgroundColor: colors.marker }]} />
      <View style={[styles.dot, { backgroundColor: colors.marker }]} />
    </View>
  );
}

export function CarMarker({ coordinate, title }: { coordinate: Coordinates; title: string }) {
  // Custom marker views are snapshotted on Android; stop tracking once rendered for performance.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(id);
  }, []);
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      accessibilityLabel={title}
    >
      <CarPin />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  stem: { width: 3, height: 10, marginTop: -1 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
});
