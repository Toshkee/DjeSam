import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { photoUri } from '@/features/photos/photoStorage';
import type { ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { SessionTags } from './SessionTags';

/** Photo, floor/section and note: what actually finds a car when GPS does not. */
export function CarClues({ session }: { session: ParkingSession }) {
  const { t } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const uri = photoUri(session.photoFile);
  const missingPhoto = !!session.photoFile && !uri;

  return (
    <View style={{ gap: spacing.md }}>
      {uri && (
        <Image
          source={{ uri }}
          style={[styles.photo, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }]}
          contentFit="cover"
          transition={150}
          accessibilityLabel={t.save.photo}
        />
      )}
      {missingPhoto && (
        <View style={[styles.missing, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }]}>
          <Icon name="image-outline" size={22} color={colors.textSubtle} />
          <AppText variant="label" tone="subtle">
            {t.details.photoMissing}
          </AppText>
        </View>
      )}
      <SessionTags session={session} />
      {session.note && (
        <View style={styles.note}>
          <Icon name="document-text-outline" size={18} color={colors.textMuted} />
          <AppText style={styles.flex} selectable>
            {session.note}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3 },
  missing: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
