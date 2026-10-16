import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { useLiveLocation, useLocationStatus } from '@/features/location/hooks';
import { PARKING_TYPES, type Coordinates, type LocationSource, type ParkingType } from '@/features/parking/types';
import { useI18n } from '@/i18n';
import { parseMoneyToCents } from '@/i18n/format';
import { useTheme } from '@/theme/ThemeProvider';

import { FormSection } from './FormSection';
import { LocationCard } from './LocationCard';
import { LocationPickerModal } from './LocationPickerModal';
import { PhotoField } from './PhotoField';
import { TimerPicker, type TimerChoice } from './TimerPicker';

export interface ParkingFormValues {
  coordinates: Coordinates | null;
  accuracy: number | null;
  locationSource: LocationSource;
  parkingType: ParkingType | null;
  floor: string;
  section: string;
  spaceNumber: string;
  note: string;
  feeText: string;
  photoUri: string | null;
  timer: TimerChoice;
}

export interface ParkingFormSubmit extends Omit<ParkingFormValues, 'coordinates' | 'feeText'> {
  coordinates: Coordinates;
  feeCents: number | null;
}

interface Props {
  mode: 'create' | 'edit';
  initial: ParkingFormValues;
  submitting: boolean;
  onSubmit: (values: ParkingFormSubmit) => void;
}

const TYPE_ICONS: Record<ParkingType, IconName> = {
  street: 'trail-sign-outline',
  garage: 'business-outline',
  lot: 'grid-outline',
  private: 'home-outline',
  other: 'ellipsis-horizontal',
};

const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export function ParkingForm({ mode, initial, submitting, onSubmit }: Props) {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const [values, setValues] = useState<ParkingFormValues>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(
    mode === 'edit' || initial.parkingType === 'garage' || !!(initial.floor || initial.section || initial.note),
  );

  const set = <K extends keyof ParkingFormValues>(key: K, value: ParkingFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const location = useLocationStatus();
  const granted = location.permission?.state === 'granted';
  const live = useLiveLocation(granted);

  // While creating, keep following GPS until the user places the pin by hand.
  const followGps = mode === 'create' && values.locationSource === 'gps' && live !== null;
  const coordinates = followGps ? { latitude: live.latitude, longitude: live.longitude } : values.coordinates;
  const accuracy = followGps ? live.accuracy : values.accuracy;

  const feeCents = parseMoneyToCents(values.feeText);
  const feeInvalid = Number.isNaN(feeCents);
  const canSubmit = !!coordinates && !feeInvalid && !submitting;

  const submit = () => {
    if (!coordinates || feeInvalid) return;
    onSubmit({ ...values, coordinates, accuracy, feeCents });
  };

  const typeOptions = PARKING_TYPES.map((type) => ({
    value: type,
    label: t.parkingTypesShort[type],
    icon: TYPE_ICONS[type],
  }));

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
      >
        <LocationCard
          coordinates={coordinates}
          accuracy={accuracy}
          source={values.locationSource}
          permission={location.permission}
          servicesEnabled={location.servicesEnabled}
          onAdjust={() => setPickerOpen(true)}
          onRequestPermission={() => void location.request()}
        />

        <FormSection title={t.save.parkingType} aside={t.common.optional}>
          <ChipGroup<ParkingType | null>
            accessibilityLabel={t.save.parkingType}
            options={typeOptions}
            value={values.parkingType}
            onChange={(type) => {
              const next = type === values.parkingType ? null : type;
              set('parkingType', next);
              if (next === 'garage' && !showDetails) {
                animate();
                setShowDetails(true);
              }
            }}
          />
        </FormSection>

        {mode === 'create' && (
          <FormSection title={t.timer.title} aside={t.common.optional}>
            <TimerPicker value={values.timer} onChange={(timer) => set('timer', timer)} />
            <AppText variant="caption" tone="subtle">
              {t.timer.disclaimer}
            </AppText>
          </FormSection>
        )}

        <FormSection title={t.save.photo} aside={t.common.optional}>
          <PhotoField uri={values.photoUri} onChange={(uri) => set('photoUri', uri)} />
        </FormSection>

        {showDetails ? (
          <FormSection title={t.save.details} aside={t.common.optional}>
            <View style={styles.row}>
              <TextField
                label={t.save.floor}
                placeholder={t.save.floorPlaceholder}
                value={values.floor}
                onChangeText={(v) => set('floor', v)}
                maxLength={12}
                returnKeyType="next"
              />
              <TextField
                label={t.save.section}
                placeholder={t.save.sectionPlaceholder}
                value={values.section}
                onChangeText={(v) => set('section', v)}
                maxLength={24}
              />
            </View>
            <View style={styles.row}>
              <TextField
                label={t.save.space}
                placeholder={t.save.spacePlaceholder}
                value={values.spaceNumber}
                onChangeText={(v) => set('spaceNumber', v)}
                maxLength={12}
              />
              <TextField
                label={t.save.fee}
                placeholder={t.save.feePlaceholder}
                value={values.feeText}
                onChangeText={(v) => set('feeText', v)}
                keyboardType="decimal-pad"
                suffix="€"
                error={feeInvalid ? t.save.feeInvalid : null}
                maxLength={8}
              />
            </View>
            <TextField
              label={t.save.note}
              placeholder={t.save.notePlaceholder}
              value={values.note}
              onChangeText={(v) => set('note', v)}
              multiline
              maxLength={500}
            />
          </FormSection>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              animate();
              setShowDetails(true);
            }}
            style={({ pressed }) => [
              styles.moreButton,
              { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
            ]}
          >
            <Icon name="add-circle-outline" size={20} color={colors.accentText} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{t.save.moreDetails}</AppText>
              <AppText variant="caption" tone="subtle">
                {`${t.save.floor} · ${t.save.section} · ${t.save.space} · ${t.save.note}`}
              </AppText>
            </View>
          </Pressable>
        )}
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, padding: spacing.lg }]}
      >
        <Button
          label={submitting ? t.common.saving : mode === 'create' ? t.save.submit : t.save.submitEdit}
          icon={mode === 'create' ? 'location' : 'checkmark'}
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
          onPress={submit}
        />
      </SafeAreaView>

      {pickerOpen && (
        <LocationPickerModal
          visible
          initial={coordinates}
          userLocation={live}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(coordinates) => {
            setValues((v) => ({ ...v, coordinates, accuracy: null, locationSource: 'manual' }));
            setPickerOpen(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
