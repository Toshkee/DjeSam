import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ParkingForm, type ParkingFormSubmit, type ParkingFormValues } from '@/components/parking/ParkingForm';
import { timerChoiceFromMinutes, timerChoiceMinutes } from '@/components/parking/TimerPicker';
import { useToast } from '@/components/ui/Toast';
import { useNotificationPermissionFlow } from '@/features/notifications/useNotificationPermissionFlow';
import { saveParking } from '@/features/parking/service';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useI18n } from '@/i18n';
import { isValidCoordinates } from '@/lib/geo';

function initialCoordinates(lat?: string, lng?: string) {
  const c = { latitude: Number(lat), longitude: Number(lng) };
  return lat && lng && isValidCoordinates(c) ? c : null;
}

export default function SaveParkingScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { settings } = useSettings();
  const ensureNotifications = useNotificationPermissionFlow();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; acc?: string }>();
  const [submitting, setSubmitting] = useState(false);

  // The map screen hands over its latest fix so the form is ready instantly; GPS keeps refining it.
  const [initial] = useState<ParkingFormValues>(() => {
    const accuracy = Number(params.acc);
    return {
      coordinates: initialCoordinates(params.lat, params.lng),
      accuracy: params.acc && Number.isFinite(accuracy) ? accuracy : null,
      locationSource: 'gps',
      parkingType: null,
      floor: '',
      section: '',
      spaceNumber: '',
      note: '',
      feeText: '',
      photoUri: null,
      timer: timerChoiceFromMinutes(settings.defaultTimerMinutes),
    };
  });

  const submit = async (values: ParkingFormSubmit) => {
    if (submitting || saveParking.isRunning()) return;
    setSubmitting(true);
    try {
      const timerMinutes = timerChoiceMinutes(values.timer);
      if (timerMinutes !== null) await ensureNotifications();
      const { photoFailed } = await saveParking({
        coordinates: values.coordinates,
        accuracy: values.locationSource === 'manual' ? null : values.accuracy,
        locationSource: values.locationSource,
        parkingType: values.parkingType,
        floor: values.floor,
        section: values.section,
        spaceNumber: values.spaceNumber,
        note: values.note,
        feeCents: values.feeCents,
        photoSourceUri: values.photoUri,
        timerMinutes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast(photoFailed ? t.save.photoFailed : t.map.savedToast, {
        icon: photoFailed ? 'image-outline' : 'checkmark-circle',
        tone: photoFailed ? 'info' : 'success',
      });
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert(t.common.errorTitle, t.save.saveFailed);
      setSubmitting(false);
    }
  };

  return <ParkingForm mode="create" initial={initial} submitting={submitting} onSubmit={submit} />;
}
