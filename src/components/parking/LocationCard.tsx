import { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { LocationPermission } from '@/features/location/location';
import type { Coordinates, LocationSource } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { isApproximate } from '@/lib/geo';
import { useTheme } from '@/theme/ThemeProvider';

import { CarPin } from './CarMarker';

interface Props {
  coordinates: Coordinates | null;
  accuracy: number | null;
  source: LocationSource;
  permission: LocationPermission | null;
  servicesEnabled: boolean | null;
  onAdjust: () => void;
  onRequestPermission: () => void;
}

const DELTA = { latitudeDelta: 0.0022, longitudeDelta: 0.0022 };

export function LocationCard({
  coordinates,
  accuracy,
  source,
  permission,
  servicesEnabled,
  onAdjust,
  onRequestPermission,
}: Props) {
  const { t, f } = useI18n();
  const { colors, radius, spacing, scheme } = useTheme();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (coordinates) mapRef.current?.animateToRegion({ ...coordinates, ...DELTA }, 300);
  }, [coordinates]);

  const denied = permission?.state === 'denied';
  const servicesOff = servicesEnabled === false;
  const waiting = !coordinates && !denied && !servicesOff;

  let status: string;
  if (!coordinates) status = waiting ? t.save.waitingForGps : t.save.noLocationYet;
  else if (source === 'manual') status = t.save.manualLocation;
  else status = accuracy !== null ? t.save.gpsAccuracy(f.meters(accuracy)) : t.save.gpsAccuracyUnknown;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.mapWrap, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        {coordinates ? (
          <>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{ ...coordinates, ...DELTA }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              showsPointsOfInterests={false}
              userInterfaceStyle={scheme}
              liteMode
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View pointerEvents="none" style={styles.pin}>
              <CarPin size={36} />
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            {waiting ? <ActivityIndicator color={colors.accent} /> : <Icon name="location-outline" size={28} color={colors.textSubtle} />}
          </View>
        )}
      </View>

      <View style={styles.statusRow}>
        <Icon
          name={source === 'manual' ? 'hand-left-outline' : 'navigate-circle-outline'}
          size={18}
          color={colors.textMuted}
        />
        <AppText variant="label" tone="muted" style={styles.flex} accessibilityLiveRegion="polite">
          {status}
        </AppText>
        <Button label={t.save.adjustOnMap} variant="ghost" icon="move-outline" onPress={onAdjust} haptic={false} />
      </View>

      {coordinates && source === 'gps' && isApproximate(accuracy) && accuracy !== null && (
        <Banner tone="warning" body={t.save.approximateWarning(f.meters(accuracy))} />
      )}

      {denied && (
        <Banner tone="danger" title={t.permissions.locationDeniedTitle} body={t.permissions.locationDeniedBody}>
          <Button
            label={permission?.canAskAgain ? t.permissions.allowLocation : t.common.openSettings}
            variant="secondary"
            onPress={permission?.canAskAgain ? onRequestPermission : () => Linking.openSettings()}
          />
          <Button label={t.permissions.pickManually} variant="ghost" onPress={onAdjust} />
        </Banner>
      )}

      {!denied && servicesOff && (
        <Banner tone="warning" title={t.permissions.servicesOffTitle} body={t.permissions.servicesOffBody}>
          <Button label={t.permissions.pickManually} variant="secondary" onPress={onAdjust} />
        </Banner>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 150, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  pin: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 52 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
