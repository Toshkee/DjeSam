import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useI18n } from '@/i18n';

/** Moderate quality keeps photos sharp enough to read a pillar sign without bloating storage. */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  quality: 0.6,
  allowsEditing: false,
  exif: false,
};

export function usePhotoPicker() {
  const { t } = useI18n();

  const explainDenied = useCallback(
    (message: string) =>
      Alert.alert(t.common.errorTitle, message, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.openSettings, onPress: () => Linking.openSettings() },
      ]),
    [t],
  );

  /** Returns a temporary URI, or null if cancelled/denied. */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      explainDenied(t.permissions.cameraDenied);
      return null;
    }
    try {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      return result.canceled ? null : (result.assets[0]?.uri ?? null);
    } catch {
      // Simulators have no camera; real devices can fail if the camera is busy.
      Alert.alert(t.common.errorTitle, t.common.genericError);
      return null;
    }
  }, [explainDenied, t]);

  const pickPhoto = useCallback(async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      return result.canceled ? null : (result.assets[0]?.uri ?? null);
    } catch {
      explainDenied(t.permissions.libraryDenied);
      return null;
    }
  }, [explainDenied, t]);

  return { takePhoto, pickPhoto };
}
