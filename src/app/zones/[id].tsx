import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormSection } from '@/components/parking/FormSection';
import {
  TimerPicker,
  timerChoiceFromMinutes,
  timerChoiceMinutes,
  type TimerChoice,
} from '@/components/parking/TimerPicker';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { useZone } from '@/features/parking/hooks';
import { deleteZone, saveZone } from '@/features/parking/service';
import { PARKING_TYPES, type ParkingType } from '@/features/parking/types';
import type { Zone } from '@/features/parking/zones';
import { useI18n } from '@/i18n';
import { createId } from '@/lib/singleFlight';
import { useTheme } from '@/theme/ThemeProvider';

export default function ZoneEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { data: zone, loading } = useZone(isNew ? undefined : id);
  const { colors } = useTheme();

  if (!isNew && loading && zone === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <ZoneForm key={zone?.id ?? 'new'} zone={isNew ? null : (zone ?? null)} />;
}

function ZoneForm({ zone }: { zone: Zone | null }) {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [name, setName] = useState(zone?.name ?? '');
  const [timer, setTimer] = useState<TimerChoice>(timerChoiceFromMinutes(zone?.durationMinutes ?? 60));
  const [parkingType, setParkingType] = useState<ParkingType | null>(zone?.parkingType ?? 'street');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const minutes = timerChoiceMinutes(timer);
    if (!name.trim()) return setError(t.zones.nameRequired);
    if (minutes === null) return;
    setBusy(true);
    try {
      await saveZone({
        id: zone?.id ?? createId(),
        name,
        durationMinutes: minutes,
        parkingType,
        createdAt: zone?.createdAt ?? Date.now(),
      });
      router.back();
    } catch {
      Alert.alert(t.common.errorTitle, t.common.genericError);
      setBusy(false);
    }
  };

  const remove = () =>
    zone &&
    Alert.alert(t.zones.deleteConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => deleteZone(zone.id).then(() => router.back()),
      },
    ]);

  return (
    // Keeps the bottom action button above the keyboard on iOS.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: zone ? t.zones.editTitle : t.zones.newTitle }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <TextField
          label={t.zones.name}
          placeholder={t.zones.namePlaceholder}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          error={error}
          maxLength={40}
          autoFocus={!zone}
        />
        <FormSection title={t.zones.duration}>
          <TimerPicker value={timer} onChange={setTimer} allowNone={false} />
        </FormSection>
        <FormSection title={t.zones.type} aside={t.common.optional}>
          <ChipGroup<ParkingType | null>
            accessibilityLabel={t.zones.type}
            options={PARKING_TYPES.map((type) => ({ value: type, label: t.parkingTypesShort[type] }))}
            value={parkingType}
            onChange={(v) => setParkingType(v === parkingType ? null : v)}
          />
        </FormSection>
        {zone && <Button label={t.zones.delete} icon="trash-outline" variant="danger" onPress={remove} />}
      </ScrollView>
      <SafeAreaView
        edges={['bottom']}
        style={[styles.footer, { padding: spacing.lg, backgroundColor: colors.surface, borderTopColor: colors.border }]}
      >
        <Button label={t.zones.save} icon="checkmark" size="lg" loading={busy} onPress={save} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
