import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  title: string;
  aside?: string;
  /** Extra element next to the title, e.g. a Premium badge. */
  badge?: ReactNode;
  children: ReactNode;
}

export function FormSection({ title, aside, badge, children }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {aside && (
          <AppText variant="caption" tone="subtle">
            {aside}
          </AppText>
        )}
        {badge}
      </View>
      {children}
    </View>
  );
}
