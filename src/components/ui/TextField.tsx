import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  suffix?: string;
}

export function TextField({ label, error, hint, suffix, multiline, ...input }: TextFieldProps) {
  const { colors, radius, typography } = useTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            minHeight: multiline ? 84 : 46,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.accent}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxFontSizeMultiplier={1.6}
          {...input}
          style={[typography.body, styles.input, { color: colors.text }, multiline && styles.multiline]}
        />
        {suffix && (
          <AppText tone="muted" style={styles.suffix}>
            {suffix}
          </AppText>
        )}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="subtle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, flex: 1 },
  field: { borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10 },
  multiline: { minHeight: 64 },
  suffix: { marginLeft: 6 },
});
