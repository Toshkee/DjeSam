import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import type { Coordinates } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { MONTENEGRO_REGION } from '@/lib/geo';
import { useTheme } from '@/theme/ThemeProvider';

import { CarPin } from './CarMarker';

interface Props {
  visible: boolean;
  initial: Coordinates | null;
  userLocation: Coordinates | null;
  onCancel: () => void;
  onConfirm: (c: Coordinates) => void;
}

const ZOOMED = { latitudeDelta: 0.0025, longitudeDelta: 0.0025 };

/**
 * Manual placement / correction: the pin stays fixed in the centre and the user moves the map
 * underneath it. Works without GPS (e.g. indoors or with location permission denied).
 */
export function LocationPickerModal({ visible, initial, userLocation, onCancel, onConfirm }: Props) {
  const { t } = useI18n();
  const { colors, spacing, scheme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const start = initial ?? userLocation;
  const [center, setCenter] = useState<Coordinates | null>(start);

  const initialRegion: Region = start ? { ...start, ...ZOOMED } : MONTENEGRO_REGION;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      {/* A Modal is a separate native root, so it needs its own safe-area provider. */}
      <SafeAreaProvider>
        <View style={[styles.fill, { backgroundColor: colors.background }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            showsPointsOfInterests={false}
            userInterfaceStyle={scheme}
            onRegionChangeComplete={(r) => setCenter({ latitude: r.latitude, longitude: r.longitude })}
            accessibilityLabel={t.save.adjustHint}
          />
          <View pointerEvents="none" style={styles.centerPin}>
            <CarPin />
          </View>
          <SafeAreaView edges={['top']} style={[styles.top, { paddingHorizontal: spacing.lg }]} pointerEvents="box-none">
            <IconButton icon="close" label={t.common.cancel} onPress={onCancel} floating />
            <View style={[styles.hint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText variant="label" align="center">
                {t.save.adjustHint}
              </AppText>
            </View>
            {userLocation ? (
              <IconButton
                icon="locate"
                label={t.save.useMyLocation}
                tone="accent"
                floating
                onPress={() => mapRef.current?.animateToRegion({ ...userLocation, ...ZOOMED }, 400)}
              />
            ) : (
              <View style={styles.spacer} />
            )}
          </SafeAreaView>
          <SafeAreaView edges={['bottom']} style={[styles.bottom, { padding: spacing.lg }]}>
            <Button
              label={t.save.confirmPosition}
              icon="checkmark"
              size="lg"
              disabled={!center}
              onPress={() => center && onConfirm(center)}
            />
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Offset so the pin's tip (not its centre) marks the map centre.
  centerPin: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  top: { position: 'absolute', top: 8, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  spacer: { width: 44 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
