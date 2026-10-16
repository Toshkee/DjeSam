import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { usePhotoPicker } from '@/features/photos/usePhotoPicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

export function PhotoField({ uri, onChange }: Props) {
  const { t } = useI18n();
  const { colors, radius, spacing } = useTheme();
  const { takePhoto, pickPhoto } = usePhotoPicker();

  const take = async () => {
    const next = await takePhoto();
    if (next) onChange(next);
  };
  const pick = async () => {
    const next = await pickPhoto();
    if (next) onChange(next);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {uri && (
        <View style={[styles.preview, { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }]}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            accessibilityLabel={t.save.photo}
          />
          <IconButton
            icon="trash-outline"
            label={t.save.removePhoto}
            onPress={() => onChange(null)}
            floating
            style={styles.remove}
          />
        </View>
      )}
      <View style={styles.row}>
        <Button label={t.save.takePhoto} icon="camera-outline" variant="secondary" onPress={take} style={styles.flex} />
        <Button label={t.save.pickPhoto} icon="images-outline" variant="secondary" onPress={pick} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { height: 180, overflow: 'hidden' },
  remove: { position: 'absolute', top: 10, right: 10 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
