import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import type { Fix } from '@/features/location/location';
import { photoUri } from '@/features/photos/photoStorage';
import { endParking } from '@/features/parking/service';
import type { ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { distanceMeters, isApproximate } from '@/lib/geo';
import { useTheme } from '@/theme/ThemeProvider';

import { SessionTags } from './SessionTags';
import { TimerStatus } from './TimerStatus';

interface Props {
  session: ParkingSession;
  userFix: Fix | null;
  onNewParking: () => void;
}

export function ActiveParkingPanel({ session, userFix, onNewParking }: Props) {
  const { t, f } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const thumb = photoUri(session.photoFile);

  const distance = userFix ? f.distance(distanceMeters(userFix, session)) : null;

  const finish = () =>
    Alert.alert(t.map.finishConfirmTitle, t.map.finishConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.map.finishConfirmAction,
        onPress: async () => {
          try {
            await endParking(session.id);
            toast(t.map.finishedToast, { icon: 'flag' });
          } catch {
            Alert.alert(t.common.errorTitle, t.common.genericError);
          }
        },
      },
    ]);

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.map.details}
        onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
        style={styles.header}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={[styles.thumb, { borderRadius: radius.md }]} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbIcon, { borderRadius: radius.md, backgroundColor: colors.accentSoft }]}>
            <Icon name="car" size={24} color={colors.accent} />
          </View>
        )}
        <View style={styles.flex}>
          <AppText variant="heading">{t.map.yourCar}</AppText>
          <AppText variant="label" tone="muted" numberOfLines={1}>
            {t.map.parkedAt(f.relativeDateTime(session.parkedAt))}
          </AppText>
          <AppText variant="label" tone={distance ? 'accent' : 'subtle'} numberOfLines={1}>
            {distance ? t.map.distanceFromYou(distance) : t.map.distanceUnknown}
            {session.address ? ` · ${session.address}` : ''}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.textSubtle} />
      </Pressable>

      <SessionTags session={session} />
      {session.locationSource === 'gps' && isApproximate(session.accuracy) && (
        <AppText variant="caption" tone="warning">
          {t.map.approximateBadge}
        </AppText>
      )}

      <TimerStatus timer={session} compact />

      <Button
        label={t.map.returnToCar}
        icon="navigate"
        size="lg"
        onPress={() => router.push({ pathname: '/return/[id]', params: { id: session.id } })}
      />
      <View style={styles.actions}>
        <Button
          label={session.timerExpiresAt ? t.map.timer : t.map.addTimer}
          icon="timer-outline"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push({ pathname: '/timer/[id]', params: { id: session.id } })}
        />
        <Button label={t.map.finish} icon="flag-outline" variant="secondary" style={styles.flex} onPress={finish} />
      </View>
      <Button label={t.map.newParking} icon="add" variant="ghost" onPress={onNewParking} haptic={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56 },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
});
