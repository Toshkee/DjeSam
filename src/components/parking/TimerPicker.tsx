import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ChipGroup } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import {
  CUSTOM_STEP_MINUTES,
  MAX_TIMER_MINUTES,
  MIN_TIMER_MINUTES,
  TIMER_PRESETS_MINUTES,
} from '@/features/timer/timer';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export type TimerChoice = { kind: 'none' } | { kind: 'preset'; minutes: number } | { kind: 'custom'; minutes: number };

export function timerChoiceMinutes(choice: TimerChoice): number | null {
  return choice.kind === 'none' ? null : choice.minutes;
}

export function timerChoiceFromMinutes(minutes: number | null): TimerChoice {
  if (minutes === null) return { kind: 'none' };
  return (TIMER_PRESETS_MINUTES as readonly number[]).includes(minutes)
    ? { kind: 'preset', minutes }
    : { kind: 'custom', minutes };
}

interface Props {
  value: TimerChoice;
  onChange: (choice: TimerChoice) => void;
  allowNone?: boolean;
}

type ChipValue = 'none' | 'custom' | number;

export function TimerPicker({ value, onChange, allowNone = true }: Props) {
  const { t, f } = useI18n();
  const { colors, radius, spacing } = useTheme();

  const options: { value: ChipValue; label: string }[] = [
    ...(allowNone ? [{ value: 'none' as const, label: t.timer.none }] : []),
    ...TIMER_PRESETS_MINUTES.map((m) => ({ value: m, label: f.minutesLabel(m) })),
    { value: 'custom', label: t.timer.custom },
  ];
  const selected: ChipValue = value.kind === 'preset' ? value.minutes : value.kind;

  const step = (delta: number) => {
    if (value.kind !== 'custom') return;
    const next = Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, value.minutes + delta));
    onChange({ kind: 'custom', minutes: next });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <ChipGroup<ChipValue>
        accessibilityLabel={t.timer.title}
        options={options}
        value={selected}
        onChange={(v) => {
          if (v === 'none') onChange({ kind: 'none' });
          else if (v === 'custom') onChange({ kind: 'custom', minutes: value.kind === 'none' ? 90 : value.minutes });
          else onChange({ kind: 'preset', minutes: v });
        }}
      />
      {value.kind === 'custom' && (
        <View
          style={[styles.stepper, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.sm }]}
        >
          <IconButton
            icon="remove"
            label={t.timer.decrease}
            onPress={() => step(-CUSTOM_STEP_MINUTES)}
          />
          <AppText
            variant="title"
            tabular
            accessibilityLiveRegion="polite"
            accessibilityLabel={f.durationLong(value.minutes * 60_000)}
          >
            {f.minutesLabel(value.minutes)}
          </AppText>
          <IconButton icon="add" label={t.timer.increase} onPress={() => step(CUSTOM_STEP_MINUTES)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
