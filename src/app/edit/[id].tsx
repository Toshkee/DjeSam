import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ParkingForm, type ParkingFormSubmit, type ParkingFormValues } from '@/components/parking/ParkingForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { photoUri } from '@/features/photos/photoStorage';
import { useSession } from '@/features/parking/hooks';
import { updateParking } from '@/features/parking/service';
import type { ParkingSession, PhotoChange } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { formatCentsForInput } from '@/i18n/format';
import { useTheme } from '@/theme/ThemeProvider';

function toFormValues(s: ParkingSession, decimalSeparator: string): ParkingFormValues {
  return {
    coordinates: { latitude: s.latitude, longitude: s.longitude },
    accuracy: s.accuracy,
    locationSource: s.locationSource,
    parkingType: s.parkingType,
    floor: s.floor ?? '',
    section: s.section ?? '',
    spaceNumber: s.spaceNumber ?? '',
    note: s.note ?? '',
    feeText: formatCentsForInput(s.feeCents, decimalSeparator),
    photoUri: photoUri(s.photoFile),
    timer: { kind: 'none' },
  };
}

export default function EditParkingScreen() {
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
  return <EditForm key={session.id} session={session} />;
}

function EditForm({ session }: { session: ParkingSession }) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const initial = useMemo(() => toFormValues(session, t.units.decimalSeparator), [session, t]);

  const submit = async (values: ParkingFormSubmit) => {
    if (submitting) return;
    setSubmitting(true);
    const photo: PhotoChange =
      values.photoUri === initial.photoUri
        ? { kind: 'keep' }
        : values.photoUri === null
          ? { kind: 'remove' }
          : { kind: 'replace', sourceUri: values.photoUri };
    try {
      await updateParking(session.id, {
        coordinates: values.coordinates,
        accuracy: values.locationSource === 'manual' ? null : values.accuracy,
        locationSource: values.locationSource,
        parkingType: values.parkingType,
        floor: values.floor,
        section: values.section,
        spaceNumber: values.spaceNumber,
        note: values.note,
        feeCents: values.feeCents,
        photo,
      });
      toast(t.save.updatedToast);
      router.back();
    } catch {
      Alert.alert(t.common.errorTitle, t.save.saveFailed);
      setSubmitting(false);
    }
  };

  return <ParkingForm mode="edit" initial={initial} submitting={submitting} onSubmit={submit} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
