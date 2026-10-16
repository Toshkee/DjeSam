import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ParkingSession } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/** Compact facts (type, floor, section, space) that help find the car. */
export function SessionTags({ session }: { session: ParkingSession }) {
  const { t } = useI18n();
  const { colors, radius } = useTheme();
  const tags: { icon: IconName; text: string }[] = [];
  if (session.parkingType) tags.push({ icon: 'car-outline', text: t.parkingTypesShort[session.parkingType] });
  if (session.floor) tags.push({ icon: 'layers-outline', text: `${t.details.floor} ${session.floor}` });
  if (session.section) tags.push({ icon: 'grid-outline', text: `${t.details.section} ${session.section}` });
  if (session.spaceNumber) tags.push({ icon: 'pricetag-outline', text: `${t.details.space} ${session.spaceNumber}` });
  if (tags.length === 0) return null;
  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <View key={tag.text} style={[styles.tag, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
          <Icon name={tag.icon} size={14} color={colors.textMuted} />
          <AppText variant="label" tone="muted">
            {tag.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
});
