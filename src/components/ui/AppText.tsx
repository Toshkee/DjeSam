import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Palette, TypographyVariant } from '@/theme/tokens';

export type TextTone = 'default' | 'muted' | 'subtle' | 'accent' | 'success' | 'warning' | 'danger' | 'onAccent';

const toneColor = (c: Palette, tone: TextTone): string =>
  ({
    default: c.text,
    muted: c.textMuted,
    subtle: c.textSubtle,
    accent: c.accent,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    onAccent: c.textOnAccent,
  })[tone];

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

export function AppText({ variant = 'body', tone = 'default', align, tabular, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typography[variant],
        { color: toneColor(colors, tone), textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
