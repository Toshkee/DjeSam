import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { photoUri } from '@/features/photos/photoStorage';
import { isActive, type ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  session: ParkingSession;
  onPress: (session: ParkingSession) => void;
  onLongPress: (session: ParkingSession) => void;
}

export const HistoryRow = memo(function HistoryRow({ session, onPress, onLongPress }: Props) {
  const { t, f } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const thumb = photoUri(session.photoFile);
  const active = isActive(session);

  const title =
    session.address ??
    (session.parkingType ? t.parkingTypes[session.parkingType] : f.coordinates(session.latitude, session.longitude));
  const meta = [
    session.parkingType && session.address ? t.parkingTypesShort[session.parkingType] : null,
    session.floor ? `${t.details.floor} ${session.floor}` : null,
    session.section ? `${t.details.section} ${session.section}` : null,
    session.endedAt !== null ? t.history.duration(f.durationShort(session.endedAt - session.parkedAt)) : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${f.relativeDateTime(session.parkedAt)}${active ? `, ${t.history.active}` : ''}`}
      onPress={() => onPress(session)}
      onLongPress={() => onLongPress(session)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderRadius: radius.lg,
          borderColor: active ? colors.success : colors.border,
          padding: spacing.md,
        },
      ]}
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          recyclingKey={session.id}
          style={[styles.thumb, { borderRadius: radius.md, backgroundColor: colors.surfaceMuted }]}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.thumb, styles.iconThumb, { borderRadius: radius.md, backgroundColor: colors.surfaceMuted }]}>
          <Icon name={active ? 'car' : 'car-outline'} size={22} color={active ? colors.success : colors.textSubtle} />
        </View>
      )}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {title}
          </AppText>
          {active && (
            <View style={[styles.badge, { backgroundColor: colors.successSoft, borderRadius: radius.pill }]}>
              <AppText variant="caption" tone="success" style={styles.badgeText}>
                {t.history.active}
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="label" tone="muted">
          {f.relativeDateTime(session.parkedAt)}
        </AppText>
        {meta.length > 0 && (
          <AppText variant="caption" tone="subtle" numberOfLines={1}>
            {meta.join(' · ')}
          </AppText>
        )}
        {session.note && (
          <AppText variant="caption" tone="subtle" numberOfLines={1}>
            {session.note}
          </AppText>
        )}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56 },
  iconThumb: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontWeight: '600' },
});
