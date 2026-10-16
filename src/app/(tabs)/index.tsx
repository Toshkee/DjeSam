import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveParkingPanel } from '@/components/parking/ActiveParkingPanel';
import { CarMarker } from '@/components/parking/CarMarker';
import { MapStyleButton } from '@/components/parking/MapStyleButton';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useLiveLocation, useLocationStatus } from '@/features/location/hooks';
import { useActiveSession } from '@/features/parking/hooks';
import { useMapType } from '@/features/settings/useMapStyle';
import { useI18n } from '@/i18n';
import { MONTENEGRO_REGION, regionForPoints } from '@/lib/geo';
import { useTheme } from '@/theme/ThemeProvider';

const STREET_ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export default function MapScreen() {
  const { t, f } = useI18n();
  const { colors, radius, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const mapType = useMapType();

  const location = useLocationStatus();
  const granted = location.permission?.state === 'granted';
  const fix = useLiveLocation(granted);
  const { data: active, error, reload } = useActiveSession();
  // Only the very first load shows a spinner; refreshes keep the current panel on screen.
  const loading = active === undefined && !error;

  // Frame the map once: on the car if there is one, otherwise on the user's first fix.
  // Animations requested before the native map is ready are dropped, so wait for onMapReady.
  const [mapReady, setMapReady] = useState(false);
  const framed = useRef<'none' | 'user' | 'car'>('none');
  useEffect(() => {
    if (!mapReady) return;
    if (active && framed.current !== 'car') {
      const region = regionForPoints(fix ? [active, fix] : [active]);
      if (region) mapRef.current?.animateToRegion(region, 500);
      framed.current = 'car';
    } else if (!active && fix && framed.current === 'none') {
      mapRef.current?.animateToRegion({ ...fix, ...STREET_ZOOM }, 500);
      framed.current = 'user';
    }
    if (!active && framed.current === 'car') framed.current = 'none';
  }, [active, fix, mapReady]);

  // Subtle slide-up when switching between "save" and "active parking" panels.
  const [panelAnim] = useState(() => new Animated.Value(0));
  const panelKey = loading ? 'loading' : active ? `active:${active.id}` : 'empty';
  useEffect(() => {
    panelAnim.setValue(0);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 70 }).start();
  }, [panelKey, panelAnim]);

  // Keep the map's visible centre above the panel so framed points are not hidden behind it.
  const [panelHeight, setPanelHeight] = useState(0);

  const goToSave = () => {
    const params = fix
      ? { lat: String(fix.latitude), lng: String(fix.longitude), acc: fix.accuracy === null ? '' : String(fix.accuracy) }
      : undefined;
    router.push({ pathname: '/save', params });
  };

  const confirmNewParking = () => {
    if (!active) return goToSave();
    Alert.alert(t.map.replaceTitle, t.map.replaceBody(f.relativeDateTime(active.parkedAt)), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.map.replaceAction, onPress: goToSave },
    ]);
  };

  const centerOnUser = () => fix && mapRef.current?.animateToRegion({ ...fix, ...STREET_ZOOM }, 400);
  const centerOnCar = () => active && mapRef.current?.animateToRegion({ ...active, ...STREET_ZOOM }, 400);

  const denied = location.permission?.state === 'denied';
  const servicesOff = granted && location.servicesEnabled === false;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={MONTENEGRO_REGION}
        showsUserLocation={granted}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        userInterfaceStyle={scheme}
        mapType={mapType}
        mapPadding={{ top: insets.top, right: 0, bottom: panelHeight, left: 0 }}
        onMapReady={() => setMapReady(true)}
      >
        {active && <CarMarker coordinate={active} title={t.map.markerTitle} />}
      </MapView>

      <View style={[styles.controls, { top: insets.top + spacing.sm, right: spacing.lg }]}>
        <MapStyleButton />
        {granted && fix && <IconButton icon="locate" label={t.map.recenter} onPress={centerOnUser} floating tone="accent" />}
        {active && <IconButton icon="car-outline" label={t.map.showCar} onPress={centerOnCar} floating />}
      </View>

      <Animated.View
        onLayout={(e) => setPanelHeight(Math.round(e.nativeEvent.layout.height))}
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.lg,
            shadowColor: colors.shadow,
            opacity: panelAnim,
            transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error ? (
          <Banner tone="danger" body={t.common.genericError}>
            <Button label={t.common.retry} variant="secondary" onPress={reload} />
          </Banner>
        ) : active ? (
          <ActiveParkingPanel session={active} userFix={fix} onNewParking={confirmNewParking} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title" accessibilityRole="header">
                {t.map.emptyTitle}
              </AppText>
              <AppText tone="muted">{t.map.emptyBody}</AppText>
            </View>
            {denied && (
              <Banner tone="danger" title={t.permissions.locationDeniedTitle} body={t.permissions.locationDeniedBody}>
                {location.permission?.canAskAgain ? (
                  <Button label={t.permissions.allowLocation} variant="secondary" onPress={() => void location.request()} />
                ) : (
                  <Button label={t.common.openSettings} variant="secondary" onPress={() => Linking.openSettings()} />
                )}
              </Banner>
            )}
            {servicesOff && <Banner tone="warning" title={t.permissions.servicesOffTitle} body={t.permissions.servicesOffBody} />}
            {location.permission?.state === 'undetermined' && (
              <Banner tone="info" title={t.permissions.locationRequestTitle} body={t.permissions.locationRequestBody}>
                <Button label={t.permissions.allowLocation} variant="secondary" onPress={() => void location.request()} />
              </Banner>
            )}
            {granted && !fix && !servicesOff && (
              <View style={styles.locating}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <AppText variant="label" tone="muted">
                  {t.map.locating}
                </AppText>
              </View>
            )}
            <Button label={t.map.saveParking} icon="location" size="lg" onPress={goToSave} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  controls: { position: 'absolute', gap: 10 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  loading: { height: 120, alignItems: 'center', justifyContent: 'center' },
  locating: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
