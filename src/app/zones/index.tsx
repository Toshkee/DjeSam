import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { useZones } from '@/features/parking/hooks';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function ZonesScreen() {
  const { t, f } = useI18n();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: zones } = useZones();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {zones && zones.length === 0 ? (
        <EmptyState icon="bookmark-outline" title={t.zones.title} body={t.zones.empty} />
      ) : (
        <ListGroup footer={t.zones.hint}>
          {(zones ?? []).map((zone) => (
            <ListRow
              key={zone.id}
              label={zone.name}
              value={[f.minutesLabel(zone.durationMinutes), zone.parkingType ? t.parkingTypesShort[zone.parkingType] : null]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => router.push({ pathname: '/zones/[id]', params: { id: zone.id } })}
            />
          ))}
        </ListGroup>
      )}
      <View>
        <Button label={t.zones.add} icon="add" onPress={() => router.push({ pathname: '/zones/[id]', params: { id: 'new' } })} />
      </View>
      {zones && zones.length === 0 && (
        <AppText variant="caption" tone="subtle" align="center">
          {t.zones.hint}
        </AppText>
      )}
    </ScrollView>
  );
}
