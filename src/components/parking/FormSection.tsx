import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export function FormSection({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {aside && (
          <AppText variant="caption" tone="subtle">
            {aside}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}
