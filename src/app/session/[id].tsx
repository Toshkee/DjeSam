import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarClues } from '@/components/parking/CarClues';
import { CarMarker } from '@/components/parking/CarMarker';
import { TimerStatus } from '@/components/parking/TimerStatus';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/parking/hooks';
import { deleteParking } from '@/features/parking/service';
import { isActive, type ParkingSession } from '@/features/parking/types';
import { useMapType } from '@/features/settings/useMapStyle';
import { useI18n } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme/ThemeProvider';

export default function SessionDetailsScreen() {
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
  return <Details session={session} />;
}

function Details({ session }: { session: ParkingSession }) {
  const { t, f } = useI18n();
  const { colors, radius, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const active = isActive(session);
  const mapType = useMapType();

  const openReturn = () => router.push({ pathname: '/return/[id]', params: { id: session.id } });
  const openEdit = () => router.push({ pathname: '/edit/[id]', params: { id: session.id } });

  const confirmDelete = () =>
    Alert.alert(t.details.deleteConfirmTitle, t.details.deleteConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteParking(session.id);
            toast(t.details.deleted, { icon: 'trash-outline', tone: 'info' });
            router.back();
          } catch {
            Alert.alert(t.common.errorTitle, t.common.genericError);
          }
        },
      },
    ]);

  const now = useNow(60_000, active);
  const durationMs = (session.endedAt ?? now) - session.parkedAt;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <Button label={t.common.edit} variant="ghost" onPress={openEdit} haptic={false} />,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={active ? t.map.returnToCar : t.details.showOnMap}
          onPress={openReturn}
          style={[styles.map, { borderRadius: radius.lg, borderColor: colors.border }]}
        >
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: session.latitude, longitude: session.longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            liteMode
            mapType={mapType}
            userInterfaceStyle={scheme}
            pointerEvents="none"
          >
            <CarMarker coordinate={session} title={t.map.markerTitle} />
          </MapView>
        </Pressable>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title">
            {session.address ?? (session.parkingType ? t.parkingTypes[session.parkingType] : t.details.untitled)}
          </AppText>
          <AppText tone="muted">{f.longDateTime(session.parkedAt)}</AppText>
          {active && (
            <AppText variant="label" tone="success">
              {t.history.active}
            </AppText>
          )}
        </View>

        {active && <TimerStatus timer={session} />}

        <Button
          label={active ? t.map.returnToCar : t.details.showOnMap}
          icon={active ? 'navigate' : 'map-outline'}
          size="lg"
          onPress={openReturn}
        />

        <CarClues session={session} />

        <ListGroup>
          <ListRow label={t.details.address} value={session.address ?? t.details.addressUnavailable} multilineValue />
          <ListRow label={t.details.coordinates} value={f.coordinates(session.latitude, session.longitude)} />
          <ListRow
            label={t.details.accuracy}
            value={session.locationSource === 'manual' ? t.details.manual : session.accuracy !== null ? `±${f.meters(session.accuracy)}` : '—'}
          />
          {session.parkingType && <ListRow label={t.details.type} value={t.parkingTypes[session.parkingType]} />}
          <ListRow label={t.details.parkedAt} value={f.relativeDateTime(session.parkedAt)} />
          {session.endedAt !== null && <ListRow label={t.details.endedAt} value={f.relativeDateTime(session.endedAt)} />}
          <ListRow label={t.details.duration} value={f.durationShort(durationMs)} />
          {session.timerDurationMinutes !== null && (
            <ListRow label={t.details.timer} value={t.timer.recorded(f.minutesLabel(session.timerDurationMinutes))} />
          )}
          {session.feeCents !== null && <ListRow label={t.details.fee} value={f.money(session.feeCents)} />}
        </ListGroup>

        {/* Editing lives in the header (iOS convention); the destructive action stays separate. */}
        <Button label={t.common.delete} icon="trash-outline" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { height: 170, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
