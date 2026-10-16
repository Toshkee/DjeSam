import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarClues } from '@/components/parking/CarClues';
import { CarMarker } from '@/components/parking/CarMarker';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import { openDirections, shareCarLocation } from '@/features/directions/openDirections';
import { useLiveLocation, useLocationStatus } from '@/features/location/hooks';
import { useSession } from '@/features/parking/hooks';
import { endParking } from '@/features/parking/service';
import { isActive, type ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { distanceMeters, isApproximate, regionForPoints } from '@/lib/geo';
import { useTheme } from '@/theme/ThemeProvider';

/** Below this distance (and with a decent fix) we stop pretending to be more precise than GPS. */
const NEARBY_METERS = 25;

export default function ReturnToCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: session, loading } = useSession(id);

  if (loading && session === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon="help-circle-outline" title={t.common.errorTitle} body={t.details.notFound} />
      </View>
    );
  }
  return <ReturnView session={session} />;
}

function ReturnView({ session }: { session: ParkingSession }) {
  const { t, f } = useI18n();
  const { colors, radius, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const mapRef = useRef<MapView>(null);

  const location = useLocationStatus();
  const granted = location.permission?.state === 'granted';
  const fix = useLiveLocation(granted);

  const framedWithUser = useRef(false);
  useEffect(() => {
    if (framedWithUser.current) return;
    const region = regionForPoints(fix ? [session, fix] : [session], 0.003);
    if (region) mapRef.current?.animateToRegion(region, 400);
    if (fix) framedWithUser.current = true;
  }, [fix, session]);

  const meters = fix ? distanceMeters(fix, session) : null;
  const nearby = meters !== null && meters < NEARBY_METERS && !isApproximate(fix?.accuracy ?? null);
  const indoorLikely =
    session.parkingType === 'garage' || !!session.floor || isApproximate(fix?.accuracy ?? null) || isApproximate(session.accuracy);

  let distanceText: string;
  if (meters !== null) distanceText = f.distance(meters);
  else if (granted) distanceText = t.returnToCar.distanceWaiting;
  else distanceText = t.returnToCar.distanceUnavailable;

  const finish = () =>
    Alert.alert(t.map.finishConfirmTitle, t.map.finishConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.map.finishConfirmAction,
        onPress: async () => {
          try {
            await endParking(session.id);
            toast(t.map.finishedToast, { icon: 'flag' });
            router.back();
          } catch {
            Alert.alert(t.common.errorTitle, t.common.genericError);
          }
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: session.latitude, longitude: session.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
          showsUserLocation={granted}
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          userInterfaceStyle={scheme}
        >
          <CarMarker coordinate={session} title={t.map.markerTitle} />
        </MapView>
        <IconButton
          icon="scan-outline"
          label={t.map.showCar}
          floating
          style={[styles.fitButton, { right: spacing.lg }]}
          onPress={() => {
            const region = regionForPoints(fix ? [session, fix] : [session], 0.003);
            if (region) mapRef.current?.animateToRegion(region, 400);
          }}
        />
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <View
          style={[styles.distanceCard, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, padding: spacing.lg }]}
          accessible
          accessibilityLabel={`${t.returnToCar.distance}: ${distanceText}`}
          accessibilityLiveRegion="polite"
        >
          <AppText variant="label" tone="muted">
            {t.returnToCar.distance}
          </AppText>
          <AppText variant={meters !== null ? 'display' : 'heading'} tabular>
            {distanceText}
          </AppText>
          {nearby && (
            <AppText variant="label" tone="success">
              {t.returnToCar.nearby}
            </AppText>
          )}
          {session.address && (
            <AppText variant="label" tone="subtle" numberOfLines={2}>
              {session.address}
            </AppText>
          )}
        </View>

        <Button label={t.returnToCar.directions} icon="walk" size="lg" onPress={() => openDirections(t, session)} />

        {indoorLikely && <Banner tone="info" icon="business-outline" body={t.returnToCar.indoorHint} />}

        {hasClues(session) && (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">{t.returnToCar.clues}</AppText>
            <CarClues session={session} />
          </View>
        )}

        <View style={styles.row}>
          <Button
            label={t.returnToCar.shareLocation}
            icon="share-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => shareCarLocation(t, session)}
          />
          {isActive(session) && (
            <Button label={t.map.finish} icon="flag-outline" variant="secondary" style={styles.flex} onPress={finish} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function hasClues(s: ParkingSession): boolean {
  return !!(s.photoFile || s.parkingType || s.floor || s.section || s.spaceNumber || s.note);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { height: 300 },
  fitButton: { position: 'absolute', bottom: 12 },
  distanceCard: { gap: 4, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
